import express,{ Request, Response } from 'express';
import { FileFilterCallback } from 'multer';
import session from 'express-session';
import { sql_execute, sql_execute_write } from './phandam_modules/db_utils';
import { convertDateToUString } from './phandam_modules/date_time_utils';
import { sleep } from './phandam_modules/timing_utils';
import fixedValues from './phandam_modules/config';
import {voiceFileUploaded, faceFileUploaded} from './api/websocket_client_actions'
const multer = require('multer');
const path = require('path');
const bodyParser = require("body-parser");
const mysql = require('mysql2');
import { QueryError } from 'mysql2';
const db_connection = require('./phandam_modules/dbConnect.js');
// const {wss, sendToClient, getLastMessage} = require('./api/websocket.js');
import './api/websocket';
import {sendToClient, getLastMessage } from './api/websocket_modules';
import methodOverride from 'method-override';


const app = express();
const PORT = 3000;
//TODO: In config? auslagern???
const storage_gesicht = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    cb(null, fixedValues.gesichtsdateien_speicherort);
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload_gesicht = multer({ storage: storage_gesicht });

const storage_sprache = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    cb(null, fixedValues.sprachdateien_speicherort);
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload_sprache = multer({ storage: storage_sprache });


app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use(express.json());

app.use(express.static(path.join(__dirname, 'client')));
app.use(session({secret: "sec",
  saveUninitialized: true,
  resave: true
}))


app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'client', 'calendar/calendar.html'));
})

app.get('/termin', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'client', 'termin/termin.html'));
})

/**********
*   API   * //In API auslagern
***********/

app.post('/upload/sprache', upload_sprache.single('myfile'), async (req: Request, res: Response) => {
  res.send('angekommen');
  console.log(req.file);
  voiceFileUploaded();
});

app.post('/upload/gesicht', upload_gesicht.single('myfile'), async (req: Request, res: Response) => {
  res.send('angekommen');
  console.log(req.file);
  faceFileUploaded();
});

app.get("/api/calendar", async (req: Request, res: Response) => {

  let termine;
  //TODO: Zu negativabfrage umwandeln
  if(req.session.weekdate)
  {}
  else
  {
    req.session.weekdate = new Date();
  }

  try{
    //TODO: Where Woche = heutige
  termine = await sql_execute('Select A.AppointmentID, A.Start, A.End, P.Firstname, P.Lastname From Appointments AS A JOIN Patients AS P ON A.PatientID = P.PatientID');

  res.json({dateOfTheWeek: req.session.weekdate, OeffnungszeitVon: fixedValues.OeffnungszeitVon,
    OeffnungszeitBis: fixedValues.OeffnungszeitBis,
    Termine: JSON.stringify(termine)
  });

  }catch{
    res.json({ OeffnungszeitVon: fixedValues.OeffnungszeitVon, OeffnungszeitBis: fixedValues.OeffnungszeitBis});
  }

});

app.post("/api/calendar", async (req: Request, res: Response) => {


  if(req.session.weekdate)
  {
    let newDate:Date = new Date(req.session.weekdate);
    if(req.body.forward == 'true')
    {
      newDate.setDate(newDate.getDate() + 7);
    }
    else
    {
      newDate.setDate(newDate.getDate() - 7);
    }
    req.session.weekdate = newDate;

    res.redirect("/");
  }
});

app.get("/api/client", (req: Request, res: Response) => {
  if(req.session.eventid)
  {
    res.json({ eventid: req.session.eventid});
  }
  else
  {
    if (req.session.date) {
          res.json({ date: req.session.date,  time: req.session.time, datetime: req.session.datetime, TermindauerInMinuten: fixedValues.TermindauerInMinuten});
      } else {
          res.json({ date: fixedValues.NotUsedVariableString });
      }
  }
})

app.post("/api/client", (req: Request, res: Response) => {
  //TODO: In Session Definition zu Nummber machen
  let eventid = req.body.id;
  let date = req.body.date;
  let time = req.body.time;
  // console.log(time);
  // console.log(date);
  if(eventid)
  {
      req.session.eventid = eventid;
  }
  else
  {
    if(req.session.eventid)
      req.session.eventid = undefined;

    if(time.split(':')[0].length == 1)
      time = '0'+time;
    //TODO: Datum und Uhrzeit in ein Datetime
    var datetimestring = "1970-01-01T" + time.padStart(2, "0") +":00";
    var datetime = new Date(datetimestring);
    if (date) {
          req.session.date = date;
      } else {
        //TODO konstante felder in Datei
          req.session.date = fixedValues.NotUsedVariableString;
      }

        if (time) {
          req.session.time = time;
      } else {
          req.session.time = fixedValues.NotUsedVariableString;
      }

      if (datetime) {
          req.session.datetime = datetime;
      } else {
          req.session.datetime = fixedValues.NotUsedVariableDate;
      }
  }

    res.redirect("/termin");
})

app.get("/api/event", async (req: Request, res: Response) => {
  //TODO: leere ID abfangen
  let eventid = req.session.eventid;
  let termindaten = JSON.parse('{}'); //Um Typescript zu zeigen, dass es um ein JSON Object und nicht um einen String geht
  termindaten = await sql_execute(`Select A.Start, A.End, P.Sex, P.Firstname, P.Lastname, P.Birthday, P.Phone,P.Mail From Appointments AS A JOIN Patients AS P ON A.PatientID = P.PatientID Where A.AppointmentID = ${eventid}`);

  res.json({date: convertDateToUString(termindaten[0].Start), start: termindaten[0].Start,  ende: termindaten[0].End,  geschlecht: termindaten[0].Sex,  vorname: termindaten[0].Firstname,  nachname: termindaten[0].Lastname,  geburtstag: convertDateToUString(termindaten[0].Birthday),  telefon: termindaten[0].Phone,  mail: termindaten[0].Mail});
})

app.post("/api/event", async (req: Request, res: Response) => {

  let eventid:number|null = req.body.eventid == '' ? null : req.body.eventid;

  if(req.body.delete == 'true')
  {
    //TODO: letztes Patientenvorkommen? --> Patienten werden nicht gelöscht?
    if(eventid)
    {
        let data = [eventid];
        let command = "Delete from Appointments Where AppointmentID = ?";
        sql_execute_write(command,data);
    }

    res.redirect("/");
    return;
  }
  //Date
  //TODO:Datentypen

  let date = req.body.date;
  let starttime = req.body.starttime;
  let endtime = req.body.endtime;
  let sex:string|null = req.body.sex == '' ? null : req.body.sex;
  let firstname = req.body.firstname;
  let lastname = req.body.lastname;
  let birthday:Date = new Date(req.body.birthday);
  let phone:string|null = req.body.phone == '' ? null : req.body.phone;
  let mail:string|null = req.body.mail == '' ? null : req.body.mail;

  //TODO: Conversion Function?
  let BdaySqlString:string = convertDateToUString(birthday);
  let startdatetime = new Date(date + " " + starttime + ":00");
  let enddatetime = new Date(date + " " + endtime + ":00");

  let Patientendaten:any = await sql_execute(`Select PatientID, Firstname, Lastname, Sex, Birthday, Phone, Mail From Patients Where Firstname = '${firstname}' AND Lastname = '${lastname}' AND Birthday = '${BdaySqlString}'`);

  let PatientID:number|null = null;

  if(Patientendaten[0])
  {
    PatientID = Patientendaten[0].PatientID;
  }

  //Patient vorhanden?
  if(PatientID != null)
  {
    //Patientendaten geändert?
    if(Patientendaten[0].Sex != sex
      || Patientendaten[0].Phone != phone
      || Patientendaten[0].Mail != mail)
    {
      let Updatedata = [sex??null, phone??null, mail??null, PatientID];
      let Updatesqlcommand = "Update Patients set Sex = ?, Phone = ?, Mail = ?  Where PatientID = ?";
      sql_execute_write(Updatesqlcommand,Updatedata);
    }

    //Vorhandener oder neuer Termin
    if(eventid)
    {
      let data = [startdatetime, enddatetime, PatientID, eventid];
      let sqlcommand = "Update Appointments set Start = ?, End = ?, PatientID = ? Where AppointmentID = ?";
      sql_execute_write(sqlcommand,data);
    }
    else
    {
      let data = [startdatetime, enddatetime, PatientID];
      let sqlcommand = "INSERT INTO Appointments (Start, End, PatientID) VALUES (?,?,?)";
      sql_execute_write(sqlcommand,data);
    }
  }
  else{
    //TODO:Hier wird nichts angelegt. Patienen werden nur mit Gesicht angelegt und können hier maximal geändert werden
    // --> Error
  }

  res.redirect("/");
});

app.delete("/api/event/:id", (req: Request, res: Response) => {

  //Date
  //TODO:Datentypen
  let eventid:number = Number(req.params.id);

  //TODO: letztes Patientenvorkommen? --> Patienten werden nicht gelöscht?
  if(eventid)
  {
      let data = [eventid];
      let command = "Delete from Appointments Where AppointmentID = ?";
      sql_execute_write(command,data);
  }

  res.redirect("/");
})

app.listen(PORT, () => {
    console.log(`Website running at http://localhost:${PORT}`);
});
