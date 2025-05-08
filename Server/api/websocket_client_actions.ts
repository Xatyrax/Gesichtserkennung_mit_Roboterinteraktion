// import express,{ Request, Response } from 'express';
import fs from 'fs';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import {waitForMessage } from './websocket_common_actions';
import {clients,clients_lastmessage,sendToClient, getLastMessage } from './websocket_modules';
import fixedValues from '../phandam_modules/config';
import { sleep } from '../phandam_modules/timing_utils';
import { convertDateToUString,convertDateToSmartphoneDate,convertDateToSmartphoneTime,convertDateToWeekdayShortform } from '../phandam_modules/date_time_utils';
import { getNextAppointment } from '../phandam_functions/appointment_functions';
import { GetAllRooms,GetRoomByID,SetRoomStatus } from '../phandam_functions/room_functions';
// import { sleep } from '../phandam_functions/room_fuctions';
import {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,SM_Face_Timeout,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure,GE_Does_Face_Exist,SM_Failure,SP_Failure,SM_Extract_From_Audio_Success,GE_New_Patient,SM_NextAppointment_Response,Ro_Failure} from './websocket_messages';



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
  for (let i = 0; i < fixedValues.TimeoutSpracheInSekunden; i++) {
    try{
      const parsedjson = JSON.parse(getLastMessage(fixedValues.websocket_spracherkennungID));
      if(parsedjson.type == 'EXTRACT_DATA_FROM_AUDIO_SUCCESS')
      {
        let vorname = parsedjson.message.text.firstname;
        let nachname = parsedjson.message.text.lastname;
        let Geschlecht = parsedjson.message.text.sex;
        let Gebrutsdatum = parsedjson.message.text.dateOfBirth;
        let Tel = parsedjson.message.text.phoneNumber;
        let email = parsedjson.message.text.emailAddress;
        let smartphoneresponse = `{"Success": "TRUE", "message": {"firstname": "${vorname}", "lastname": "${nachname}", "sex": "${Geschlecht}", "dateOfBirth": "${Gebrutsdatum}", "phoneNumber": "${Tel}", "emailAddress": "${email}"}}`;
        sendToClient(fixedValues.websocket_smartphoneID,smartphoneresponse);
        return;
      }
    }catch (error){
      let smartphoneresponse = `{"Success": "FALSE", "message": "${error}"}`
      sendToClient(fixedValues.websocket_smartphoneID,smartphoneresponse);
      return;
    }
    await sleep();
  }
  let smartphoneresponse = `{"Success": "FALSE", "message": "Timeout"}`
  sendToClient(fixedValues.websocket_smartphoneID,smartphoneresponse);
  sendToClient(fixedValues.websocket_spracherkennungID,'Timeout');
}

export async function faceFileUploaded(){
  //Gesicht bekannt?

  sendToClient(fixedValues.websocket_gesichtserkennungID,GE_Does_Face_Exist());
  console.log('Respone Ge: ');
  let Face_Exists_Response:(any | null) = await waitForMessage(fixedValues.websocket_gesichtserkennungID,fixedValues.TimeoutGesichtInSekunden);
  if(Face_Exists_Response == null){sendToClient(fixedValues.websocket_smartphoneID,SM_Face_Timeout());return;}

  //TODO: Nach Debug wieder rein
  // if(Face_Exists_Response.type != 'AVALIBLE_ANSWER'){sendToClient(fixedValues.websocket_smartphoneID,SM_Failure('Gesichtserkennung hat falsch formatierte Antwort geschickt'));return;}
  console.log('Respone Ge: ' + JSON.stringify(Face_Exists_Response));
  if(Face_Exists_Response.event != 'face_result'){sendToClient(fixedValues.websocket_smartphoneID,SM_Failure('Gesichtserkennung hat falsch formatierte Antwort geschickt'));return;}

  //TODO: Nach Debug wieder ändern
  // if(Face_Exists_Response.answer == 'FALSE'){
  //     console.log('Gesicht nicht bekannt. Neuer Patient wird angelegt');
  //     sendToClient(fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());
  //     PatientAnlegen();
  // }

  console.log('Respone Ge: ' + JSON.stringify(Face_Exists_Response));
   if(Face_Exists_Response.result == 'Kein Gesicht im Bild erkannt' || Face_Exists_Response.result == 'Datei ist kein Bild' || Face_Exists_Response.result == 'Gesicht nicht erkannt'){
      console.log('Gesicht nicht bekannt. Neuer Patient wird angelegt');
      sendToClient(fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());
      PatientAnlegen();
  }

  //TODO: Nach Debug wieder raus
  if(Face_Exists_Response.result == 'Gesicht erkannt'){
    console.log('Gesicht erkannt');
  //TODO: Was wenn keine BildID mitgeschickt wird
  // if(Face_Exists_Response.answer == 'TRUE'){
    try{Number(Face_Exists_Response.filename)}catch{console.log("Gesichtserkennung hat keine gültige ID zurückgegeben"); return;}
    console.log('Gesicht bekannt.');
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
        }
        let Drive_Response:(any | null) = await waitForMessage(fixedValues.websocket_RoboterID,fixedValues.TimeoutRoboterInSekunden);
        if(Drive_Response == null){sendToClient(fixedValues.websocket_RoboterID,Ro_Failure('Timeout!'));return;}
        if(Drive_Response.type=='DRIVE_TO_ROOM_ANSWER')
        {
          if(Drive_Response.Answer == 'TRUE'){console.log('Patient mit Termin wurde weitergeleitet!');}
          else {console.log('Fehler beim Roboter. Ziel kann nicht erreicht werden!');}
        }
        else
        {console.log('Ungültige Antwort vom Roboter nachdem er losgeschickt wurde');}

      }
      else
      {
        console.log('Der Patient hat keinen Termin.');
        sendToClient(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithoutAppointment());
        while(true)
        {
            // let Next_Appointment_Request:(any | null) = await waitForMessage(fixedValues.websocket_smartphoneID,fixedValues.TimeoutPatient);
            // if(Next_Appointment_Request == null){sendToClient(fixedValues.websocket_smartphoneID,SM_Failure("Smartphone Timeout! nextAppointment Request wurde erwartet."));return;}
            let nextAppointment:Date = await getNextAppointment();
            let date:string = convertDateToSmartphoneDate(nextAppointment);
            let time:string = convertDateToSmartphoneTime(nextAppointment);
            let weekday:string = convertDateToWeekdayShortform(nextAppointment);
            sendToClient(fixedValues.websocket_smartphoneID,SM_NextAppointment_Response(date,time,weekday));
            let Next_Appointment_Response:(any | null) = await waitForMessage(fixedValues.websocket_smartphoneID,fixedValues.TimeoutPatient);
            if(Next_Appointment_Response == null){sendToClient(fixedValues.websocket_smartphoneID,SM_Failure("Smartphone Timeout! nextAppointment Response wurde erwartet."));return;}
            if(Next_Appointment_Response.message == 'TRUE')
            {
              let nextAppointmentEnd = nextAppointment.setMinutes(nextAppointment.getMinutes() + fixedValues.TermindauerInMinuten)
              let data = [convertDateToUString(nextAppointment), convertDateToUString(nextAppointment), Face_Exists_Response.bild_id];
              let sqlcommand = "INSERT INTO Appointments (Start, End, PatientID) VALUES (?,?,?)";
              sql_execute_write(sqlcommand,data);
              break;
            }
        }
      }
    }
    catch(error){console.log(`Fehler bei Terminabfrage. Fehlermeldung: ${error}`); return;}
  }
}

//TODO: Wird das auch für die Terminverwaltung gebraucht? --> dann auslagern
async function PatientAnlegen(){
  let Spracherkennung_NewPatient:(any | null) = await waitForMessage(fixedValues.websocket_spracherkennungID,fixedValues.TimeoutPatient);
  if(Spracherkennung_NewPatient == null){
      sendToClient(fixedValues.websocket_smartphoneID,SM_Failure('keine Antwort von der Spracherkennung'));
      sendToClient(fixedValues.websocket_spracherkennungID,SP_Failure('Timeout! Es wurde auf Patientendaten von dir gewartet.'))
      return;
  }
  if(Spracherkennung_NewPatient.type == 'EXTRACT_DATA_FROM_AUDIO_SUCCESS')
  {

      sendToClient(fixedValues.websocket_smartphoneID,SM_Extract_From_Audio_Success());
      let geschlecht:string|null = Spracherkennung_NewPatient.message.text.sex;
      let vorname:string = Spracherkennung_NewPatient.message.text.firstname;
      let nachname:string = Spracherkennung_NewPatient.message.text.lastname;
      //TODO:Fehlererkennung
      console.log(Spracherkennung_NewPatient.message.text.dateOfBirth);
      console.log(Spracherkennung_NewPatient.message.text.dateOfBirth.substring(0,1));
      console.log(Spracherkennung_NewPatient.message.text.dateOfBirth.substring(0,2));
      console.log(Spracherkennung_NewPatient.message.text.dateOfBirth.substring(0,4));
      console.log(Spracherkennung_NewPatient.message.text.dateOfBirth.substring(0,10));
      console.log(Spracherkennung_NewPatient.message.text.dateOfBirth.substring(5,7));
      let gebYear=(Spracherkennung_NewPatient.message.text.dateOfBirth).substring(0,4);
      let gebMonth=(Spracherkennung_NewPatient.message.text.dateOfBirth).substring(5,7);
      let gebDay=(Spracherkennung_NewPatient.message.text.dateOfBirth).substring(8,10);
      let gebDate = new Date(gebYear,gebMonth-1,gebDay,12,0,0);
      let gebrutsdatum:Date = gebDate;
      let tel:string|null = Spracherkennung_NewPatient.message.text.phoneNumber;
      let email:string|null = Spracherkennung_NewPatient.message.text.emailAddress;

      //TODO: Pflichtfelder = null
      //TODO: Check Date Format and change it
      let sql_command = `INSERT INTO Patients (Sex,Firstname, Lastname, Birthday,Phone,Mail) VALUES (?,?,?,?,?,?)`;
      let sql_data = [geschlecht??null,vorname,nachname,gebrutsdatum,tel??null,email??null]
      sql_execute_write(sql_command,sql_data);

      let highest_ID_Command = 'Select MAX(PatientID) as pID From Patients';
      let highest_ID:any = await sql_execute(highest_ID_Command);

      sendToClient(fixedValues.websocket_gesichtserkennungID,GE_New_Patient(Number(highest_ID[0].pID)));
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
    let getAppoinmentsCommand = `Select AppointmentID From Appointments WHERE PatientID = ${bild_id} AND Start > '${convertDateToUString(maxFrüh)}' AND Start < '${convertDateToUString(maxSpät)};'`;
    Termine = await sql_execute(getAppoinmentsCommand);
    } catch(error){console.log(`ID kann nicht zugeordnet werden. Fehler: ${error}`);reject(error);}

    if(Termine.length > 0)
      resolve(true);
    else
      resolve(false);
    });
}

// export async function faceFileUploaded(){


// let Face_Exists_Response:JSON = waitForMessage(fixedValues.websocket_gesichtserkennungID,GE_Does_Face_Exist(),fixedValues.TimeoutGesichtInSekunden);
//   //Timeout
//   if (Face_Exists_Response == null){
//       sendToClient(fixedValues.websocket_smartphoneID,SM_Face_Timeout());
//       return
//   }
//   else
//   {
//
//
//     //Kunde hat Termin
//     let Has_Appointment:(JSON | null) = waitForMessage(getLastMessage(fixedValues.websocket_gesichtserkennungID),fixedValues.TimeoutGesichtInSekunden);
//   }


//   sendToClient(fixedValues.websocket_gesichtserkennungID,'{"Type": "AVALIBLE"}');
//   for (let i = 0; i < fixedValues.TimeoutGesichtInSekunden; i++) {
//     try{
//       // let unparsed = getLastMessage(fixedValues.websocket_gesichtserkennungID);
//       // let parsedjson = JSON.parse('{}');
//       // if(unparsed !== fixedValues.NotUsedVariableString){
//       //   parsedjson = JSON.parse(unparsed);
//       let parsedjson = JSON.parse(getLastMessage(fixedValues.websocket_gesichtserkennungID));
//       // }
//       //TODO: to Lower
//       if(parsedjson.type == 'AVALIBLE_ANSWER')
//       {
//         let Answer = parsedjson.answer;
//         let BildID = parsedjson.bild_id;
//         //Debug
//         // sendToClient(fixedValues.websocket_gesichtserkennungID,`{"Answer":"${Answer}"; "BildID":"${BildID}"}`);
//
//         //Patient erkannt
//         if(Answer == 'TRUE')
//         {
//           //TODO: Appointment abfragen
//           let Appointment = 'TRUE';
//
//           //Patient hat Termin
//           if(Appointment == 'TRUE')
//           {
//             sendToClient(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithAppointment());
//             sendToClient(fixedValues.websocket_RoboterID,DriveToTarget('B1'));
//             for (let i = 0; i < fixedValues.TimeoutRoboterInSekunden; i++) {
//               //TODO: JSON abfrage auslagern
//               try{
//                   let message_walle = JSON.parse(getLastMessage(fixedValues.websocket_RoboterID));
//                   if(message_walle.Type == 'DRIVE_TO_ROOM_ANSWER')
//                   {
//                     if(message_walle.Answer == 'TRUE')
//                     {
//                       return;
//                     }
//                     else
//                     {
//                       //TODO: Fehler
//                     }
//                   }
//               }
//
//               catch
//               {}
//               await sleep();
//             }
//           }
//           //Patient hat keinen Termin
//           else
//           {
//             sendToClient(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithoutAppointment());
//           }
//         }
//         else if(Answer == 'FALSE')
//         {
//           sendToClient(fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());
//         }
//         sendToClient(fixedValues.websocket_smartphoneID,`{"Answer":"Patient vorhanden"; "Patientendaten":"Daten"}`);
//         return;
//       }
//     }catch{}
//     await sleep();
//   }
// }

export async function AudioGeneration(text:string){

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
    catch(error){console.log(error);}
    await sleep();
  }

  //Smartphone mitteilen, dass die Gererierung abgeschlossen ist
  if (fs.existsSync(fixedValues.generierteAudio_pfad)) {
        sendToClient(fixedValues.websocket_smartphoneID,SM_Audio_GenerationSuccess());
  }
  else
  {
      sendToClient(fixedValues.websocket_smartphoneID,SM_Audio_GenerationFailure('Timeout'));
  }
}

// async function generateAudioRequestActions(message:string){
//   let messageObj;
//   try{
//     messageObj = JSON.parse(message);
//   }
//   catch{sendToClient(fixedValues.websocket_spracherkennungID,'Fehlerhaft formatierte Nachricht');}
//   let spracherkennungInitMessage = `{"type": "GENERATE_AUDIO_REQUEST","message": {"fileName":"Audio.m4a","text":"${messageObj.Text}"}}`;
//   sendToClient(fixedValues.websocket_spracherkennungID,spracherkennungInitMessage);
//   for (let i = 0; i < fixedValues.TimeoutSpracheInSekunden; i++) {
//              try{
//                 const parsedjson = JSON.parse(getLastMessage(fixedValues.websocket_spracherkennungID));
//                 if(parsedjson.type == 'AUDIO_GENERATION_REQUEST_SUCCESS')
//                 {
//                   let smartphoneresponse = `{"type":"AUDIO_GENERATION_REQUEST_SUCCESS"}`;
//                   sendToClient(fixedValues.websocket_smartphoneID,smartphoneresponse);
//                   return;
//                 }
//              }catch{}
//             await sleep();
//           }
//           let smartphoneresponse = `{"type":"AUDIO_GENERATION_REQUEST_FAILURE", "message":"Timeout"}`
//           sendToClient(fixedValues.websocket_smartphoneID,smartphoneresponse);
// }
