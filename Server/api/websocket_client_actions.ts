// import express,{ Request, Response } from 'express';
import fs from 'fs';
import {clients,clients_lastmessage,sendToClient, getLastMessage } from './websocket_modules';
import fixedValues from '../phandam_modules/config';
import { sleep } from '../phandam_modules/timing_utils';
import {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,SM_Face_Timeout,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure} from './websocket_messages';



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
  sendToClient(fixedValues.websocket_spracherkennungID,'Bild hochgeladen. Erwarte Nachricht...');
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
  sendToClient(fixedValues.websocket_gesichtserkennungID,'{"Type": "AVALIBLE"}');
  for (let i = 0; i < fixedValues.TimeoutGesichtInSekunden; i++) {
    try{
      // let unparsed = getLastMessage(fixedValues.websocket_gesichtserkennungID);
      // let parsedjson = JSON.parse('{}');
      // if(unparsed !== fixedValues.NotUsedVariableString){
      //   parsedjson = JSON.parse(unparsed);
      let parsedjson = JSON.parse(getLastMessage(fixedValues.websocket_gesichtserkennungID));
      // }
      //TODO: to Lower
      if(parsedjson.type == 'AVALIBLE_ANSWER')
      {
        let Answer = parsedjson.answer;
        let BildID = parsedjson.bild_id;
        //Debug
        // sendToClient(fixedValues.websocket_gesichtserkennungID,`{"Answer":"${Answer}"; "BildID":"${BildID}"}`);

        //Patient erkannt
        if(Answer == 'TRUE')
        {
          //TODO: Appointment abfragen
          let Appointment = 'TRUE';

          //Patient hat Termin
          if(Appointment == 'TRUE')
          {
            sendToClient(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithAppointment());
            sendToClient(fixedValues.websocket_RoboterID,DriveToTarget('B1'));
            for (let i = 0; i < fixedValues.TimeoutRoboterInSekunden; i++) {
              //TODO: JSON abfrage auslagern
              try{
                  let message_walle = JSON.parse(getLastMessage(fixedValues.websocket_RoboterID));
                  if(message_walle.Type == 'DRIVE_TO_ROOM_ANSWER')
                  {
                    if(message_walle.Answer == 'TRUE')
                    {
                      return;
                    }
                    else
                    {
                      //TODO: Fehler
                    }
                  }
              }

              catch
              {}
              await sleep();
            }
          }
          //Patient hat keinen Termin
          else
          {
            sendToClient(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithoutAppointment());
          }
        }
        else if(Answer == 'FALSE')
        {
          sendToClient(fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());
        }
        sendToClient(fixedValues.websocket_smartphoneID,`{"Answer":"Patient vorhanden"; "Patientendaten":"Daten"}`);
        return;
      }
    }catch{}
    await sleep();
  }
}

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
