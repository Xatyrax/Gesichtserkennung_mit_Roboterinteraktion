// import express,{ Request, Response } from 'express';
import fs from 'fs';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import { isPatientenIDVorhanden } from '../phandam_functions/db_actions';
import {waitForMessage } from './websocket_common_actions';
import {clients,clients_lastmessage,sendToClient, getLastMessage } from './websocket_modules';
import fixedValues from '../phandam_modules/config';
import { sleep } from '../phandam_modules/timing_utils';
import { convertDateToUString,convertDateToSmartphoneDate,convertDateToSmartphoneTime,convertDateToWeekdayShortform } from '../phandam_modules/date_time_utils';
import { getNextAppointment } from '../phandam_functions/appointment_functions';
import { GetAllRooms,GetRoomByID,SetRoomStatus } from '../phandam_functions/room_functions';
// import { sleep } from '../phandam_functions/room_fuctions';
import {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,SM_Face_Timeout,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure,GE_Does_Face_Exist,SM_Failure,SP_Failure,SM_Extract_From_Audio_Success,GE_New_Patient,SM_NextAppointment_Response,Ro_Failure,GE_Failure,SM_Persondata} from './websocket_messages';



function DebugMode(Message_mode:string, value:number):string{
  console.log(Message_mode + " " + value.toString());
  switch (Message_mode) {
        case 'Gesichtsupload':
           console.log('Case Gesichtsupload');
          switch (value) {
            case 0:
              return SM_Face_KnownPatient_WithAppointment();
            case 1:
              return SM_Face_KnownPatient_WithoutAppointment();
            case 2:
              return SM_Face_UnknownPatient();
            case 3:
              return SM_Face_Timeout();
            case 4:
              return SM_Audio_GenerationSuccess();
            case 5:
              return SM_Audio_GenerationFailure('DebugError');
            case 6:
              sendToClient(fixedValues.websocket_RoboterID,DriveToTarget('B1'));
              return 'An Roboter gesendet';
            default:
              return 'Error';
          }
        default:
          return 'Error';
      }
}

export namespace smartphone_wscom{ //Namenskollisionen mit den anderen Websockets vermeiden
    //TODO: Implement
    export function IsMessageInit(message:string): Boolean{
      try{
        const parsedjson = JSON.parse(message);
        switch (parsedjson.type) {
        case 'DEBUG':
          return true;
        case 'AUDIO_GENERATION_REQUEST':
          return true;
        default:
          return false;
      }

      }
      catch
      {
        return false;
      }
        return false;
    }

export async function InitActions(message:string){
      try{
        const parsedjson = JSON.parse(message);
        switch (parsedjson.type) {
        case 'DEBUG':
            sendToClient(fixedValues.websocket_smartphoneID,DebugMode(parsedjson.mode,parseInt(parsedjson.value)));
        case 'AUDIO_GENERATION_REQUEST':
            AudioGeneration(parsedjson.Text);
        default:
            return;
      }

      }
      catch
      {
        return false;
      }
        return false;
    }
}

export async function voiceFileUploaded(){
  sendToClient(fixedValues.websocket_spracherkennungID,'Sprachdatei hochgeladen. Erwarte Nachricht...');

  let Voice_Response:(any | null) = await waitForMessage(fixedValues.websocket_spracherkennungID,fixedValues.TimeoutSpracheInSekunden);
  if(Voice_Response == null){sendToClient(fixedValues.websocket_spracherkennungID,SP_Failure('Timeout'));return;}

  // for (let i = 0; i < fixedValues.TimeoutSpracheInSekunden; i++) {
  //   try{
      // const parsedjson = JSON.parse(getLastMessage(fixedValues.websocket_spracherkennungID));
      if(Voice_Response.type == 'EXTRACT_DATA_FROM_AUDIO_SUCCESS')
      {
        let vorname = Voice_Response.message.text.firstname;
        let nachname = Voice_Response.message.text.lastname;
        let Geschlecht = Voice_Response.message.text.sex;
        let Gebrutsdatum = Voice_Response.message.text.dateOfBirth;
        let Tel = Voice_Response.message.text.phoneNumber;
        let email = Voice_Response.message.text.emailAddress;
        let smartphoneresponse = `{"type":"PERSON_DATA","success": "TRUE", "message": {"firstname": "${vorname}", "lastname": "${nachname}", "sex": "${Geschlecht}", "dateOfBirth": "${Gebrutsdatum}", "phoneNumber": "${Tel}", "emailAddress": "${email}"}}`;

        sendToClient(fixedValues.websocket_smartphoneID,smartphoneresponse);
        //TODO: Warte auf: User Decline und User Accept (siehe Discord). Schleife? Danach auf Terminvereinbarung warten?
        return;
       }
       else
       {
         sendToClient(fixedValues.websocket_smartphoneID,`{"type":"PERSON_DATA","success": "FALSE", "message": "Ungültiges JSON von der Spracherkennung erhalten."}`);
      }
    // }catch (error){
    //   let smartphoneresponse = `{"type":"PERSON_DATA","success": "FALSE", "message": "${error}"}`
    //   sendToClient(fixedValues.websocket_smartphoneID,smartphoneresponse);
    //   return;
    // }
    // await sleep();
  // }
  let smartphoneresponse = `{"type":"PERSON_DATA","success": "FALSE", "message": "Timeout"}`
  sendToClient(fixedValues.websocket_smartphoneID,smartphoneresponse);
  sendToClient(fixedValues.websocket_spracherkennungID,'Timeout');
}

export async function faceFileUploaded(){

  //Ist der Patient bekannt?
  let Face_Exists_Response: any;
  try {Face_Exists_Response = await faceExists()}
  catch(error){ console.log(error); return; }

  //Patient nicht bekannt
   if(Face_Exists_Response.result == false){
      console.log('Gesicht nicht bekannt. Neuer Patient wird angelegt');
      sendToClient(fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());
      PatientAnlegen();
  }

  //Patient bekannt
  //TODO: Nach Debug wieder raus
  if(Face_Exists_Response.result == true){
    console.log('Das Gesicht ist bereits bekannt');

    //Ist der Filename eine Number? (für spätere Überprüfung ob es eine gültige ID in der DB ist)
    //TODO: Was wenn keine BildID mitgeschickt wird
    if(Face_Exists_Response.filename === undefined)
    {
      console.log('Gesichtserkennung hat keine Eigenschaft filename in der JSON Nachricht');
      sendToClient(fixedValues.websocket_gesichtserkennungID,GE_Failure('Keine filename Eigenschaft in der Nachricht vorhanden'));
      return;
    }
    if(Face_Exists_Response.filename.endsWith('.jpeg') || Face_Exists_Response.filename.endsWith('.png'))
    {
      Face_Exists_Response.filename = Face_Exists_Response.filename.split('.')[0];
    }

    if(isNaN(Number(Face_Exists_Response.filename)))
    {
      console.log('Gesichtserkennung hat keine gültige ID zurückgegeben');
      sendToClient(fixedValues.websocket_gesichtserkennungID,GE_Failure('Ungültige filename Eigenschaft in der Nachricht. Der Filename konnte nicht in einen numerischen Wert umgewandelt werden'));
      return;
    }

    try{
      if(await HasAppointment(Face_Exists_Response.filename) == true)
      {
        console.log('Der Patient hat einen Termin.');
        sendToClient(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithAppointment());
        let Raeume = await GetAllRooms();
        if(Raeume[0].Free == true)
        {
          sendToClient(fixedValues.websocket_RoboterID,DriveToTarget('B1'));
          await SetRoomStatus(Raeume[0].RoomID,false);
        }
        else if(Raeume[1].Free == true)
        {
          sendToClient(fixedValues.websocket_RoboterID,DriveToTarget('B2'));
          await SetRoomStatus(Raeume[1].RoomID,false);
        }
        else if(Raeume[2].Free == true)
        {
          sendToClient(fixedValues.websocket_RoboterID,DriveToTarget('B3'));
          await SetRoomStatus(Raeume[2].RoomID,false);
        }
        else{
          sendToClient(fixedValues.websocket_RoboterID,DriveToTarget('W'));
          let data = [Raeume[0].RoomID, Face_Exists_Response.filename];
          let sqlcommand = "INSERT INTO Patients_Rooms (RoomID, PatientID) VALUES (?,?)";
          sql_execute_write(sqlcommand,data);
        }
        let Drive_Response:(any | null) = await waitForMessage(fixedValues.websocket_RoboterID,fixedValues.TimeoutRoboterInSekunden);
        if(Drive_Response == null){sendToClient(fixedValues.websocket_RoboterID,Ro_Failure('Timeout!'));return;}
        if(Drive_Response.type=='DRIVE_TO_ROOM_ANSWER')
        {
          if(Drive_Response.Answer == 'TRUE'){
            console.log('Patient mit Termin wurde weitergeleitet!');

          }
          else {console.log('Fehler beim Roboter. Ziel kann nicht erreicht werden!');}
        }
        else
        {console.log('Ungültige Antwort vom Roboter nachdem er losgeschickt wurde');}

      }
      else
      {
        console.log('Der Patient hat keinen Termin.');
          console.log(new Date());
        sendToClient(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithoutAppointment());
        while(true)
        {
            // let Next_Appointment_Request:(any | null) = await waitForMessage(fixedValues.websocket_smartphoneID,fixedValues.TimeoutPatient);
            // if(Next_Appointment_Request == null){sendToClient(fixedValues.websocket_smartphoneID,SM_Failure("Smartphone Timeout! nextAppointment Request wurde erwartet."));return;}
            let nextAppointment:Date = await getNextAppointment();
            let date:string = convertDateToSmartphoneDate(nextAppointment);
            let time:string = convertDateToSmartphoneTime(nextAppointment);
            let weekday:string = convertDateToWeekdayShortform(nextAppointment);

            await sleep(1);
            console.log(new Date());
            sendToClient(fixedValues.websocket_smartphoneID,SM_NextAppointment_Response(date,time,weekday));
            let Next_Appointment_Response:(any | null) = await waitForMessage(fixedValues.websocket_smartphoneID,fixedValues.TimeoutPatient);
            if(Next_Appointment_Response == null){sendToClient(fixedValues.websocket_smartphoneID,SM_Failure("Smartphone Timeout! nextAppointment Response wurde erwartet."));return;}
            if(Next_Appointment_Response.message == 'TRUE')
            {
              let nextAppointmentEnd = nextAppointment.setMinutes(nextAppointment.getMinutes() + fixedValues.TermindauerInMinuten)
              let data = [convertDateToUString(nextAppointment), convertDateToUString(nextAppointment), Face_Exists_Response.bild_id];
              let sqlcommand = "INSERT INTO Appointments (Start, End, PatientID) VALUES (?,?,?)";
              sql_execute_write(sqlcommand,data);
              console.log('Termin wurde erfolgreich in der Datenbank eingetragen')
              break;
            }
        }
      }
    }
    catch(error){console.log(`Fehler bei Terminabfrage. Fehlermeldung: ${error}`); return;}
  }
}

export async function AudioGeneration(text:string){

  //Smartphone mitteilen, dass die Gererierung abgeschlossen ist
  if (await AudioGenerationWithAnswer(text)) {
        sendToClient(fixedValues.websocket_smartphoneID,SM_Audio_GenerationSuccess());
  }
  else
  {
        sendToClient(fixedValues.websocket_smartphoneID,SM_Audio_GenerationFailure('Timeout'));
  }
}

export async function TakePatientFromWatingRoom(patientID:number):Promise<Boolean>{
  return new Promise(async (resolve, reject) => {
        console.log("Patient abholen gestartet");
        console.log("freies Zimmer abfragen gestartet");
        let sql_Command_GetRoomKey = 'Select RoomKey From Rooms WHERE Free = 1;';
        let roomKey_result:any = await sql_execute(sql_Command_GetRoomKey);
        if(roomKey_result[0].RoomKey != 'W' && roomKey_result[0].RoomKey != 'B1' && roomKey_result[0].RoomKey != 'B2' && roomKey_result[0].RoomKey != 'B3')
        {console.log('Fehler beim Abrufen des Raumschlüssels. Ungültiger Raumschlüssel von der DB erhalten.')}

        //TODO: Was wenn der Roboter aktuell nicht im Bereit Status ist?
        sendToClient(fixedValues.websocket_RoboterID,DriveToTarget('W'));
        console.log("Nachricht an Roboter gesendet");

        let Drive_Response_ToWaitingroom:(any | null) = await waitForMessage(fixedValues.websocket_RoboterID,fixedValues.TimeoutRoboterInSekunden);
        if(Drive_Response_ToWaitingroom == null){sendToClient(fixedValues.websocket_RoboterID,Ro_Failure('Timeout!'));return;}
        if(Drive_Response_ToWaitingroom.type=='DRIVE_TO_ROOM_ANSWER')
        {
          if(Drive_Response_ToWaitingroom.Answer != 'TRUE'){
            console.log('Fehler beim Roboter. Ziel kann nicht erreicht werden!');
            return;
          }
        }
        else
        {console.log('Ungültige Antwort vom Roboter nachdem er losgeschickt wurde');return;}
        console.log("Roboter ist im Wartezimmer angekommen erhalten");

        console.log(`Patientendaten für PatientenID ${patientID} abfragen starten`);
        let sql_Command = 'Select Firstname, Lastname From Patients';
        let Patienname:any = await sql_execute(sql_Command);

        console.log("Audio generierung starten");
        let AudiogenerierungErfolgreich = await AudioGenerationWithAnswer(`${Patienname[0].Firstname} ${Patienname[0].Lastname} folgen Sie mir bitte ins Behandlungszimmer`);
        if (AudiogenerierungErfolgreich == false) {console.log('Audiodatei konnte nicht generiert werden');return;}

        console.log("Patient ins Behandlungszimmer bringen starten");
        sendToClient(fixedValues.websocket_RoboterID,DriveToTarget(roomKey_result[0].RoomKey));
        console.log("Nachricht an Roboter gesendet");

        let Drive_Response:(any | null) = await waitForMessage(fixedValues.websocket_RoboterID,fixedValues.TimeoutRoboterInSekunden);
        if(Drive_Response == null){sendToClient(fixedValues.websocket_RoboterID,Ro_Failure('Timeout!'));return;}
        if(Drive_Response.type=='DRIVE_TO_ROOM_ANSWER')
        {
          if(Drive_Response.Answer != 'TRUE'){
            console.log('Fehler beim Roboter. Ziel kann nicht erreicht werden!');
            return;
          }
        }
        else
        {console.log('Ungültige Antwort vom Roboter nachdem er losgeschickt wurde');return;}

        console.log("Patient abgeliefert");
        });
}



//***********************
//*   Hilfsfunktionen   *
//***********************


//TODO: Wird das auch für die Terminverwaltung gebraucht? --> dann auslagern
async function PatientAnlegen(){

  while(true){
  //TODO: Null oder allgemeine Fehler abfangen und weitermachen
  let Spracherkennung_NewPatient:(any | null) = await waitForMessage(fixedValues.websocket_spracherkennungID,fixedValues.TimeoutPatient);
  if(Spracherkennung_NewPatient == null){
      sendToClient(fixedValues.websocket_smartphoneID,SM_Failure('keine Antwort von der Spracherkennung'));
      sendToClient(fixedValues.websocket_spracherkennungID,SP_Failure('Timeout! Es wurde auf Patientendaten von dir gewartet.'))
      return;
  }
  if(Spracherkennung_NewPatient.type == 'EXTRACT_DATA_FROM_AUDIO_SUCCESS')
  {

      // sendToClient(fixedValues.websocket_smartphoneID,SM_Extract_From_Audio_Success());
      let geschlecht:string|null = Spracherkennung_NewPatient.message.text.sex;
      let vorname:string = Spracherkennung_NewPatient.message.text.firstname;
      let nachname:string = Spracherkennung_NewPatient.message.text.lastname;
      //TODO:Fehlererkennung
      let gebYear=(Spracherkennung_NewPatient.message.text.date_of_birth).substring(0,4);
      let gebMonth=(Spracherkennung_NewPatient.message.text.date_of_birth).substring(5,7);
      let gebDay=(Spracherkennung_NewPatient.message.text.date_of_birth).substring(8,10);
      let gebDate = new Date(gebYear,gebMonth-1,gebDay,12,0,0);
      let gebrutsdatum:Date = gebDate;
      let tel:string|null = Spracherkennung_NewPatient.message.text.phoneNumber;
      let email:string|null = Spracherkennung_NewPatient.message.text.emailAddress;

      let ResponseForSmartphone = SM_Persondata(vorname,nachname,geschlecht??'-',convertDateToSmartphoneDate(gebrutsdatum),tel??'-',email??'-');
      sendToClient(fixedValues.websocket_smartphoneID,ResponseForSmartphone);

      sendToClient(fixedValues.websocket_gesichtserkennungID,GE_New_Patient());

      let Gesichtserkennung_NewPatient:(any | null) = await waitForMessage(fixedValues.websocket_gesichtserkennungID,fixedValues.TimeoutPatient);
      if(Gesichtserkennung_NewPatient == null){
        console.log('Timeout! Keine Antwort von der Gesichtserkennung');
        sendToClient(fixedValues.websocket_smartphoneID,SM_Failure('keine Antwort von der Gesichtserkennung'));
        sendToClient(fixedValues.websocket_gesichtserkennungID,SP_Failure('Timeout! Es wurde auf eine ID von dir gewartet.'));
        return;
      }

      if(Gesichtserkennung_NewPatient.event == 'face_result' && Gesichtserkennung_NewPatient.result == 'Gesicht gespeichert')
      {
          if(isNaN(Number(Gesichtserkennung_NewPatient.filename)))
          {
            console.log('Fehler beim Speichern: Gesichtserkennung hat als ID keine Zahl geschickt');
            sendToClient(fixedValues.websocket_smartphoneID,SM_Failure('Fehler beim Speichern: Gesichtserkennung hat als ID keine Zahl geschickt'));
            sendToClient(fixedValues.websocket_gesichtserkennungID,SP_Failure('Du hast als ID (filename value) keine Zahl geschickt.'));
            return;
          }
          if(await isPatientenIDVorhanden(Number(Gesichtserkennung_NewPatient.filename))==true)
          {
            console.log('Fehler beim Speichern: Die von der Gesichtserkennung geschickte ID ist bereits in der Datenbank vorhanden');
            sendToClient(fixedValues.websocket_smartphoneID,SM_Failure('Fehler beim Speichern: Die von der Gesichtserkennung geschickte ID ist bereits in der Datenbank vorhanden'));
            sendToClient(fixedValues.websocket_gesichtserkennungID,SP_Failure('Fehler beim Speichern: Die von dir geschickte ID ist bereits in der Datenbank vorhanden'));
            return;
          }

          //TODO: Pflichtfelder = null
          //TODO: Check Date Format and change it
          let sql_command = `INSERT INTO Patients (PatientID, Sex,Firstname, Lastname, Birthday,Phone,Mail) VALUES (?,?,?,?,?,?,?)`;
          let sql_data = [Number(Gesichtserkennung_NewPatient.filename),geschlecht??null,vorname,nachname,gebrutsdatum,tel??null,email??null]
          sql_execute_write(sql_command,sql_data);
          console.log('neuer Patient gespeichert')
      }
  }
  else if(Spracherkennung_NewPatient.type == 'EXTRACT_DATA_FROM_AUDIO_STARTING')
  {
    continue;
  }
  else{
    break;
  }
  }
}

async function HasAppointment(bild_id:number):Promise<Boolean>{
    return new Promise(async (resolve, reject) => {
    //TODO:Termin prüfen
    //ID von Gesichtserkennung abfragen

    let now:Date = new Date();
    let milliSubstract = fixedValues.MaximaleVerfruehungsDauerInMinuten*60*1000;
    let maxFrüh:Date = new Date(now.getTime() - milliSubstract);
    let milliAdd = fixedValues.MaximaleVerspaetungsDauerInMinuten*60*1000;
    let maxSpät:Date = new Date(now.getTime() + milliAdd);

    let Termine:any;
    try{
      console.log(bild_id);
    let getAppoinmentsCommand = `Select AppointmentID From Appointments WHERE PatientID = ${bild_id} AND Start > '${convertDateToUString(maxFrüh,true)}' AND Start < '${convertDateToUString(maxSpät,true)};'`;
    console.log(getAppoinmentsCommand);
    Termine = await sql_execute(getAppoinmentsCommand);
    console.log(Termine);
    } catch(error){console.log(`ID kann nicht zugeordnet werden. Fehler: ${error}`);reject(error);}

    if(Termine.length > 0)
      resolve(true);
    else
      resolve(false);
    });
}

async function faceExists():Promise<any>{
  return new Promise(async (resolve, reject) => {
  sendToClient(fixedValues.websocket_gesichtserkennungID,GE_Does_Face_Exist());
  // console.log('Respone Ge: ');
  let Face_Exists_Response:(any | null) = await waitForMessage(fixedValues.websocket_gesichtserkennungID,fixedValues.TimeoutGesichtInSekunden);
  if(Face_Exists_Response == null){sendToClient(fixedValues.websocket_smartphoneID,SM_Face_Timeout());reject(false);return;}

  if(Face_Exists_Response.event != 'face_result'){sendToClient(fixedValues.websocket_smartphoneID,SM_Failure('Gesichtserkennung hat falsch formatierte Antwort geschickt'));reject(false);return;}

  // try{ console.log('Respone Ge: ' + JSON.stringify(Face_Exists_Response));}
  // catch(error){throw new Error('Falsches JSON Format. Fehler: ' + error);}

  console.log('Gesichtsprüfung: ' + JSON.stringify(Face_Exists_Response));
   if(Face_Exists_Response.result == 'Kein Gesicht im Bild erkannt' || Face_Exists_Response.result == 'Datei ist kein Bild' || Face_Exists_Response.result == 'Gesicht nicht erkannt' || Face_Exists_Response.result == 'skip'){
      Face_Exists_Response.result = false;
      resolve(Face_Exists_Response);
      return;
  }

  //TODO: Nach Debug wieder raus
  if(Face_Exists_Response.result == 'Gesicht erkannt'){
    Face_Exists_Response.result = true;
    resolve(Face_Exists_Response);
    return;
  }
  else
  {
    reject(`Bei der Prüfung ob das Gesicht vorhanden war lief etwas schief. Keiner der definierten Fälle wurde ausgelöst. Gesichtserkennung hat folgendes result geschickt: ${Face_Exists_Response.result}`);
  }
  });
}

async function AudioGenerationWithAnswer(text:string):Promise<Boolean>{
return new Promise(async (resolve, reject) => {
  console.log("Audio Generation Workflow gestartet");

  //Datei löschen wenn existent
  if (fs.existsSync(fixedValues.generierteAudio_pfad)) {
        fs.unlinkSync(fixedValues.generierteAudio_pfad);
      }

  //Spracherkennung mitteilen, das Audi genneriert werden soll
  sendToClient(fixedValues.websocket_spracherkennungID,SP_Audio_Genaration_Request(text));

  //Auf Generierung warten
  for (let i = 0; i < fixedValues.TimeoutAudiogenerierungInSekunden; i++) {
    try{
      if (fs.existsSync(fixedValues.generierteAudio_pfad)) {
        break;
      }
    }
    catch(error){console.log(error);reject(false);}
    await sleep();
  }

  //Smartphone mitteilen, dass die Gererierung abgeschlossen ist
  if (fs.existsSync(fixedValues.generierteAudio_pfad)) {
        resolve(true);
  }
  else
  {
        reject(false);
  }
});
}
