import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import {Workflow} from './Workflow';
import {faceExists,HasAppointment} from '../api/websocket_client_actions';
import {With_Appointment_Workflow} from './With_Appointment_Workflow';
import {Type_Validations} from './Type_Validations';
import {sleep} from '../phandam_modules/timing_utils';
import {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,SM_Face_Timeout,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure,GE_Does_Face_Exist,SM_Failure,SP_Failure,SM_Extract_From_Audio_Success,GE_New_Patient,SM_NextAppointment_Response,Ro_Failure,GE_Failure,SM_Persondata} from '../api/websocket_messages';
import {sendToClientWithConfirmation} from '../api/websocket_modules';


export class Workflow_Queue{

    public static queue:Workflow[] = [];

    public static async sendMessage(reciverId:string,message:string):Promise<void>;
    public static async sendMessage(reciverId:string,message:string,sender:Workflow):Promise<void>;
    public static async sendMessage(reciverId:string,message:string,sender?:Workflow):Promise<void>{

        for (let i = 0; i < 5; i++) {

        if(!Type_Validations.isUndefined(sender))
        {
            sender = sender as Workflow;
            ConsoleLogger.logDebug(`${sender.constructor.name} mit ID ${sender.getid()} versucht an ${reciverId} zu senden: ${message}`);
        }

            if(sendToClientWithConfirmation(reciverId,message) == true){return;}
            else{await sleep(3);}
        }

        ConsoleLogger.logWarning(`Nachricht ${message} an ${reciverId} konnte nicht gesendet werden`);
        if(!Type_Validations.isUndefined(sender))
        {
            sender = sender as Workflow;
            Workflow_Queue.ShutdownWorkflow(sender.getid())
        }
    }

    public static async reciveMessage(sender:string,message:any){


        if(Type_Validations.isUndefined(message.type) == true && Type_Validations.isUndefined(message.Type) == false)
        {
                ConsoleLogger.logWarning('Die Nachricht enthält ein groß geschriebenes Type, obwohl es klein geschreiben erwartet wurde. Die Nachricht wird trotzdem verarbeitet');
                message.type = message.Type;
        }

        ConsoleLogger.logDebug(`Aktuell aktive Workflows: ${Workflow_Queue.queue.length}`);

        let WfsDieAufSolcheNachrichtWarten = Workflow_Queue.queue.filter(w => w.getcurrentStep().getExpectedSender() === sender && (w.getcurrentStep().getExpectedMessageType() === message.type || w.getcurrentStep().getExpectedMessageType() === message.Type));

        ConsoleLogger.logDebug(`Davon auf so eine Nachricht wartende Workflows: ${WfsDieAufSolcheNachrichtWarten.length}`);

        if(WfsDieAufSolcheNachrichtWarten.length > 1)
        {
            Workflow_Queue.queue = Workflow_Queue.queue.sort((a, b) => a.getstartedDateTime().getTime() - b.getstartedDateTime().getTime());
            WfsDieAufSolcheNachrichtWarten[0].getcurrentStep().execute(sender,message);
        }
        else if(WfsDieAufSolcheNachrichtWarten.length == 1)
        {
            WfsDieAufSolcheNachrichtWarten[0].getcurrentStep().execute(sender,message);
            //TODO:Gib die Nachricht dem Workflow
        }
        else
        {

            // let wf = new Workflow(0);
                // wf.start();
                try{
                    if(await Workflow_Queue.tryStart() == false) //Im True Case sind keine weiteren Aktionen nötig
                    {
                        ConsoleLogger.logWarning(`Empfangene Nachricht konnte keinem Workflow zugeordnet werden und auch keinen neuen starten. Nachricht ${message} von ${sender} wird ignoriert`);
                    }
                }catch(error)
                {
                    ConsoleLogger.logWarning(`Empfangene Nachricht konnte keinem Workflow zugeordnet werden und hat beim starten eines neuen den Fehler ${error} ausgelöst. Nachricht ${message} von ${sender} wird ignoriert`);
                }
        }
    }

    private static async tryStart():Promise<boolean>{
        return new Promise(async (resolve, reject) => {
        // return true;
        //TODO: Ist der Patient bekannt und wenn ja hat er einen Termin? --> enstprechenden Workflow starten

        // ConsoleLogger.logDebug(`starte Workflow mit ID ${wf.getid()}`);

        //TODO: debug, welcher workflow nimmt die message, oder wird einer gestartet
        let Face_Exists_Response:any;
        try {Face_Exists_Response = await faceExists()}
        catch(error){ console.log(error); resolve(false); }

        //Patient nicht bekannt
        if(Face_Exists_Response.result == false){
            ConsoleLogger.logDebug(`Gesicht nicht bekannt. Neuer Patient wird angelegt`);
            Workflow_Queue.sendMessage(fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());
            //TODO:start Unknown Workflow
            // PatientAnlegen();
        }

        //Patient bekannt
        if(Face_Exists_Response.result == true){
            ConsoleLogger.logDebug(`Das Gesicht ist bereits bekannt`);

            //Ist der Filename eine Number? (für spätere Überprüfung ob es eine gültige ID in der DB ist)
            //TODO: Was wenn keine BildID mitgeschickt wird
            if(Face_Exists_Response.filename === undefined)
            {
            ConsoleLogger.logDebug(`Gesichtserkennung hat keine Eigenschaft filename in der JSON Nachricht. Beende Workflow`);
            Workflow_Queue.sendMessage(fixedValues.websocket_gesichtserkennungID,GE_Failure('Keine filename Eigenschaft in der Nachricht vorhanden'));
            resolve(false);
            }
            if(Face_Exists_Response.filename.endsWith('.jpeg') || Face_Exists_Response.filename.endsWith('.png'))
            {
                ConsoleLogger.logDebug(`Dateiendung wurde entfernt`);
                Face_Exists_Response.filename = Face_Exists_Response.filename.split('.')[0];
            }

            if(isNaN(Number(Face_Exists_Response.filename)))
            {
            ConsoleLogger.logDebug(`Gesichtserkennung hat keine gültige ID zurückgegeben Beende Workflow`);
            Workflow_Queue.sendMessage(fixedValues.websocket_gesichtserkennungID,GE_Failure('Ungültige filename Eigenschaft in der Nachricht. Der Filename konnte nicht in einen numerischen Wert umgewandelt werden'));
            resolve(false);
            }

            // ConsoleLogger.logDebug(`Workflow ${this._id}: ${Face_Exists_Response.filename}`);
            // ConsoleLogger.logDebug(`Workflow ${this._id}: ${await HasAppointment(Face_Exists_Response.filename)}`);
            // try{
            if(await HasAppointment(Face_Exists_Response.filename) == true)
            {
                // ConsoleLogger.logDebug('With_Appointment_Workflow');

                ConsoleLogger.logDebug(`Der Patient hat einen Termin`);
                try{
                    let wf = new With_Appointment_Workflow(0,fixedValues.websocket_gesichtserkennungID,Face_Exists_Response);
                    Workflow_Queue.queue.push(wf);
                }catch(error){reject(error);}

                resolve(true);
            }
            else
            {
                try{
                //TODO:start Without Workflow
                }catch(error){reject(error);}
                resolve(true);
            }
            // }
            // catch
            // {}
            // }

        }
        return true;
    });
    }

    public static ShutdownWorkflow(id:string):void
    {
        ConsoleLogger.logDebug(`Workflow ${id} wird beendet`);
        let newQueue = Workflow_Queue.queue.filter(w => w.getid() !== id)
        if(Type_Validations.isUndefined(newQueue) == false)
        {
            Workflow_Queue.queue = newQueue as Workflow[];
        }
    }

}
