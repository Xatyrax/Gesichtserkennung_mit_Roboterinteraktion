const path = require('path');
const bodyParser = require("body-parser");
import express,{ Request, Response } from 'express';
import multer,{ FileFilterCallback } from 'multer';
import session from 'express-session';
import fs from 'fs';
import { sql_execute, sql_execute_write } from './phandam_modules/db_utils';
import { convertDateToUString } from './phandam_modules/date_time_utils';
import { sleep } from './phandam_modules/timing_utils';
import fixedValues from './phandam_modules/config';
import {voiceFileUploaded, faceFileUploaded} from './api/websocket_client_actions';
// import {voiceFileUploaded, faceFileUploaded, audioFileDownload} from './api/websocket_client_actions';
import './api/websocket';
import {sendToClient, getLastMessage } from './api/websocket_modules';
import {StartBackgroudActions} from './phandam_modules/backgroudTasks';
import {SM_Audio_GenerationFailure} from './api/websocket_messages';
import { validateUserInputs } from './phandam_functions/client_errorhandling';
import { GetAllRooms,GetRoomByID,SetRoomStatus } from './phandam_functions/room_functions';


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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));
app.use(session({secret: "sec",
  saveUninitialized: true,
  resave: true
}));

/**************
*   Startup   *
***************/

const filePath = path.join(__dirname, 'download', fixedValues.generierteAudio_dateiname);
fixedValues.generierteAudio_pfad = filePath;
StartBackgroudActions();

/***********
*   URLs   *
************/

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'client', 'calendar/calendar.html'));
})

app.get('/termin', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'client', 'termin/termin.html'));
})

app.get('/rooms', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'client', 'raeume/raeume.html'));
})

/**********
*   API   * //TODO:In API auslagern
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

app.get("/download/sprache", async (req: Request, res: Response) => {
  //const filePath = path.join(__dirname, 'download', fixedValues.generierteAudio_dateiname);
  res.setHeader('Content-Disposition', `attachment; filename="${fixedValues.generierteAudio_dateiname}"`);
  res.setHeader('Content-Type', 'audio/wav');

  for (let i = 0; i < fixedValues.TimeoutAudiogenerierungInSekunden; i++) {
    try{
      if (fs.existsSync(fixedValues.generierteAudio_pfad)) {
        break;
      }
    }
    catch(error){console.log(error);}
    await sleep();
  }

  if (!fs.existsSync(fixedValues.generierteAudio_pfad)) {
        sendToClient(fixedValues.websocket_smartphoneID,SM_Audio_GenerationFailure('Timeout'));
        res.status(404).send('File not Found. Timeout!');
  }
  else
  {
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
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



app.get("/api/event", async (req: Request, res: Response) => {

  //TODO: leere ID abfangen
  let eventid = req.session.eventid;
  let termindaten = JSON.parse('{}'); //Um Typescript zu zeigen, dass es um ein JSON Object und nicht um einen String geht
  termindaten = await sql_execute(`Select A.Start, A.End, P.Sex, P.Firstname, P.Lastname, P.Birthday, P.Phone,P.Mail From Appointments AS A JOIN Patients AS P ON A.PatientID = P.PatientID Where A.AppointmentID = ${eventid}`);

  res.json({error:'FALSE',date: convertDateToUString(termindaten[0].Start), start: termindaten[0].Start,  ende: termindaten[0].End,  geschlecht: termindaten[0].Sex,  vorname: termindaten[0].Firstname,  nachname: termindaten[0].Lastname,  geburtstag: convertDateToUString(termindaten[0].Birthday),  telefon: termindaten[0].Phone,  mail: termindaten[0].Mail});
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

  let startdatetime = new Date(date + " " + starttime + ":00");
  let enddatetime = new Date(date + " " + endtime + ":00");

  let InputErrorMessage = validateUserInputs(startdatetime,enddatetime,sex,firstname,lastname,birthday?birthday:new Date(),phone,mail);

  //TODO: Conversion Function?
  let birthdayString = String(birthday) == 'Invalid Date'?'':convertDateToUString(birthday);
  if(birthdayString=='')
  {
    birthday = new Date();
    birthday.setDate(birthday.getDate() + 1);
  }

  if(InputErrorMessage != null)
  {
    req.session.userInputError = JSON.parse(`{"message":"${InputErrorMessage}","InputedData":{"eventid":"${eventid?eventid:''}","date":"${req.session.date}",  "starttime":"${starttime}", "endtime":"${endtime}", "sex":"${sex?sex:''}","firstname":"${firstname}","lastname":"${lastname}","birthday":"${birthdayString}","phone":"${phone?phone:''}","mail":"${mail?mail:''}"}}`);
    res.redirect("/termin");
    return;
  }

  let BdaySqlString:string = birthdayString==''?convertDateToUString(birthday):convertDateToUString(birthday);
  BdaySqlString=convertDateToUString(birthday);

  let Patientendaten:any = await sql_execute(`Select PatientID, Firstname, Lastname, Sex, Birthday, Phone, Mail From Patients Where Firstname = '${firstname}' AND Lastname = '${lastname}' AND Birthday = '${BdaySqlString}'`);

  let PatientID:number|null = null;

  if(Patientendaten[0])
  {
    PatientID = Patientendaten[0].PatientID;
  }
  else
  {
    req.session.userInputError = JSON.parse(`{"message":"Patient nicht in DB","InputedData":{"eventid":"${eventid?eventid:''}","date":"${req.session.date}",  "starttime":"${starttime}", "endtime":"${endtime}", "sex":"${sex?sex:''}","firstname":"${firstname}","lastname":"${lastname}","birthday":"${birthdayString}","phone":"${phone?phone:''}","mail":"${mail?mail:''}"}}`);
    res.redirect("/termin");
    return;
    //Hier wird nichts angelegt. Patienen werden nur mit Gesicht angelegt und können hier maximal geändert werden
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

  res.redirect("/");
});

app.get("/api/client", (req: Request, res: Response) => {
  if(req.session.userInputError != null)
  {
    let message = req.session.userInputError.message;
    let InputedData = req.session.userInputError.InputedData;
    req.session.userInputError = null;
    res.json({userInputError:{message:message,InputedData:InputedData}});
    return;
  }

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
});

app.post("/api/client", (req: Request, res: Response) => {

  //res.redirect("/termin");
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
});

app.get("/api/room", async (req: Request, res: Response) => {
  let RoomData = await GetAllRooms();
  let RaumDaten:any = await sql_execute(`SELECT RoomID, RoomName, Free FROM Rooms;`);
  res.json({ roomData: RoomData});
});

app.post("/api/room", async (req: Request, res: Response) => {
  let roomId = req.body.roomId;
  let roomData = await GetRoomByID(roomId);
  let newRoomStatus = roomData[0].Free == true ? false : true;
  await SetRoomStatus(roomId,newRoomStatus);

  res.redirect("/rooms");
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Website running at http://localhost:${PORT}`);
});
