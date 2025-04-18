import express,{ Request, Response } from 'express';
import { FileFilterCallback } from 'multer';
import session from 'express-session';
import { sql_execute } from './phandam_modules/db_utils';
import { sleep } from './phandam_modules/timing_utils';
import fixedValues from './phandam_modules/config';
import {voiceFileUploaded} from './api/websocket_client_actions'
const multer = require('multer');
const path = require('path');
const bodyParser = require("body-parser");
const mysql = require('mysql2');
import { QueryError } from 'mysql2';
const db_connection = require('./phandam_modules/dbConnect.js');
// const {wss, sendToClient, getLastMessage} = require('./api/websocket.js');
import './api/websocket';
import {sendToClient, getLastMessage } from './api/websocket_modules';

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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));
app.use(session({secret: "sec",
  saveUninitialized: true,
  resave: true
}))
app.use(express.urlencoded({ extended: true }));

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
  sendToClient(fixedValues.websocket_gesichtserkennungID,'{"Type": "AVALIBLE"}');
  for (let i = 0; i < fixedValues.TimeoutGesichtInSekunden; i++) {
    try{
      let unparsed = getLastMessage(fixedValues.websocket_gesichtserkennungID);
      let parsedjson = JSON.parse('{}');
      if(unparsed !== fixedValues.NotUsedVariableString){
        parsedjson = JSON.parse(unparsed);
      }
      //TODO: to Lower
      if(parsedjson.type == 'AVALIBLE_ANSWER')
      {
        let Answer = parsedjson.answer;
        let BildID = parsedjson.bild_id;
        sendToClient(fixedValues.websocket_gesichtserkennungID,`{"Answer":"${Answer}"; "BildID":"${BildID}"}`);
        if(Answer == 'TRUE')
        {
          //TODO: Appointment abfragen
          let Appointment = 'FALSE';
          sendToClient(fixedValues.websocket_smartphoneID,`{"type":"Known_Customer", "Appointment":"${Appointment}"}`);
        }
        else if(Answer == 'FALSE')
        {
          sendToClient(fixedValues.websocket_smartphoneID,`{"type":"Unknown_Customer"}`);
        }
        sendToClient(fixedValues.websocket_smartphoneID,`{"Answer":"Patient vorhanden"; "Patientendaten":"Daten"}`);
        return;
      }
    }catch{}
    await sleep();
  }
});

app.get("/api/calendar", async (req: Request, res: Response) => {

  let termine;
  try{
  termine = await sql_execute('Select * From Termine');
  console.log(termine);

  res.json({ OeffnungszeitVon: fixedValues.OeffnungszeitVon,
    OeffnungszeitBis: fixedValues.OeffnungszeitBis,
    Termine: JSON.stringify(termine)
  });

  }catch{
    res.json({ OeffnungszeitVon: fixedValues.OeffnungszeitVon, OeffnungszeitBis: fixedValues.OeffnungszeitBis});
  }

})

app.get("/api/client", (req: Request, res: Response) => {
  if (req.session.date) {
        res.json({ date: req.session.date,  time: req.session.time, datetime: req.session.datetime, TermindauerInMinuten: fixedValues.TermindauerInMinuten});
    } else {
        //res.json({ date: '' });
        res.json({ date: fixedValues.NotUsedVariableString });
    }
  // res.redirect("/client/termin");
})

app.post("/api/client", (req: Request, res: Response) => {
  let date = req.body.date;
  let time = req.body.time;
  // console.log(time);
  // console.log(date);
  if(time.split(':')[0].length == 1)
    time = '0'+time;
  var datetimestring = "1970-01-01T" + time.padStart(2, "0") +":00";
  var datetime = new Date(datetimestring);
  if (date) {
        req.session.date = date;
    } else {
      //Todo konstante felder in Datei
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

    res.redirect("/termin");
})

app.listen(PORT, () => {
    console.log(`Website running at http://localhost:${PORT}`);
});
