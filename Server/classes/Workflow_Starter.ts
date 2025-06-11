import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import {Workflow} from './Workflow';
import {With_Appointment_Workflow} from './With_Appointment_Workflow';
import {Without_Appointment_Workflow} from './Without_Appointment_Workflow';
import {Unknown_Customer_Workflow} from './Unknown_Customer_workflow';
import {Pick_From_Waiting_Room_Workflow} from './Pick_From_Waiting_Room_Workflow';
import {Workflow_Queue} from './Workflow_Queue';
import {Workflow_Actions} from './Workflow_Actions';
import {faceExists,HasAppointment} from '../api/websocket_client_actions';
import {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,SM_Face_Timeout,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure,GE_Does_Face_Exist,SM_Failure,SP_Failure,SM_Extract_From_Audio_Success,GE_New_Patient,SM_NextAppointment_Response,Ro_Failure,GE_Failure,SM_Persondata} from '../api/websocket_messages';

export class Workflow_Starter{

    public static async tryStartPickFromWatingroom():Promise<boolean>{
        return new Promise(async (resolve, reject) => {
            try{
                    let wf = new Pick_From_Waiting_Room_Workflow(0,'','');
                    Workflow_Queue.queue.push(wf);
                }catch(error){reject(error);return;}

            resolve(true);return;
        });
    }

    public static async tryStart():Promise<boolean>{
        return new Promise(async (resolve, reject) => {

        let Face_Exists_Response:any;
        try {Face_Exists_Response = await faceExists()}
        catch(error){ console.log(error); resolve(false); return; }

        //Patient nicht bekannt
        if(Face_Exists_Response.result == false){
            ConsoleLogger.logDebug(`Gesicht nicht bekannt. Neuer Patient wird angelegt`);

            try{
                    let wf = new Unknown_Customer_Workflow(0,fixedValues.websocket_gesichtserkennungID,Face_Exists_Response);
                    Workflow_Queue.queue.push(wf);
                }catch(error){reject(error);return;}

            resolve(true);return;
        }

        //Patient bekannt
        if(Face_Exists_Response.result == true){
            ConsoleLogger.logDebug(`Das Gesicht ist bereits bekannt`);

            if(Face_Exists_Response.filename === undefined)
            {
            ConsoleLogger.logDebug(`Gesichtserkennung hat keine Eigenschaft filename in der JSON Nachricht. Beende Workflow`);
            Workflow_Actions.sendMessage(fixedValues.websocket_gesichtserkennungID,GE_Failure('Keine filename Eigenschaft in der Nachricht vorhanden'));
            resolve(false);return;
            }
            if(Face_Exists_Response.filename.endsWith('.jpeg') || Face_Exists_Response.filename.endsWith('.png'))
            {
                ConsoleLogger.logDebug(`Dateiendung wurde entfernt`);
                Face_Exists_Response.filename = Face_Exists_Response.filename.split('.')[0];
            }

            if(isNaN(Number(Face_Exists_Response.filename)))
            {
            ConsoleLogger.logDebug(`Gesichtserkennung hat keine gültige ID zurückgegeben Beende Workflow`);
            Workflow_Actions.sendMessage(fixedValues.websocket_gesichtserkennungID,GE_Failure('Ungültige filename Eigenschaft in der Nachricht. Der Filename konnte nicht in einen numerischen Wert umgewandelt werden'));
            resolve(false);return;
            }

            if(await HasAppointment(Face_Exists_Response.filename) == true)
            {
                ConsoleLogger.logDebug(`Der Patient hat einen Termin`);
                try{
                    let wf = new With_Appointment_Workflow(0,fixedValues.websocket_gesichtserkennungID,Face_Exists_Response);
                    Workflow_Queue.queue.push(wf);
                }catch(error){reject(error);}

                resolve(true);return;
            }
            else
            {
                ConsoleLogger.logDebug(`Der Patient hat keinen Termin`);
                try{
                    let wf = new Without_Appointment_Workflow(0,fixedValues.websocket_gesichtserkennungID,Face_Exists_Response);
                    Workflow_Queue.queue.push(wf);
                }catch(error){reject(error);}

                resolve(true);return;
            }
        }
        return true;
    });
    }

    public static async StartWithAppointment(patientenID:number):Promise<void>{
        return new Promise(async (resolve, reject) => {
            let Fake_Face_response = `{"event": "face_result", "filename": "${patientenID}", "result": "Gesicht erkannt"}`
            let wf = new With_Appointment_Workflow(0,fixedValues.websocket_gesichtserkennungID,Fake_Face_response);
            Workflow_Queue.queue.push(wf);
        });
    }
}
