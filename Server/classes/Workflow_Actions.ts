import {ConsoleLogger} from './ConsoleLogger';
import {Workflow} from './Workflow';
import {Workflow_Queue} from './Workflow_Queue';
// import {Workflow_Actions} from './Workflow_Actions';
import {Type_Validations} from './Type_Validations';
import {sleep} from '../phandam_modules/timing_utils';
import {sendToClientWithConfirmation} from '../api/websocket_modules';
import {Workflow_Starter} from './Workflow_Starter';

export class Workflow_Actions{
    public static async sendMessage(reciverId:string,message:string):Promise<void>;
    public static async sendMessage(reciverId:string,message:string,sender:Workflow):Promise<void>;
    public static async sendMessage(reciverId:string,message:string,sender?:Workflow):Promise<void>{

        for (let i = 0; i < 5; i++) {

        if(!Type_Validations.isUndefined(sender))
        {
            sender = sender as Workflow;
            let WfsMitID = Workflow_Queue.queue.filter(w => w.getid() === (sender as Workflow).getid());
            if(WfsMitID.length < 1)
            {
                ConsoleLogger.logDebug(`Das Versenden der Nachricht ${message} an ${reciverId} wurde beendet weil der Workflow beendet wurde;`);
                return;
            }
            ConsoleLogger.logDebug(`${sender.constructor.name} mit ID ${sender.getid()} versucht an ${reciverId} zu senden: ${message}`);

        }

            if(sendToClientWithConfirmation(reciverId,message) == true){return;}
            else{await sleep(3);}
        }



        ConsoleLogger.logWarning(`Nachricht ${message} an ${reciverId} konnte nicht gesendet werden`);
        if(!Type_Validations.isUndefined(sender))
        {
            sender = sender as Workflow;
            this.ShutdownWorkflow(sender.getid())
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
                    if(await Workflow_Starter.tryStart() == false) //Im True Case sind keine weiteren Aktionen nötig
                    {
                        let messageString:string = '';
                        try{
                            messageString = JSON.stringify(message);
                        }
                        catch{messageString = message}
                        ConsoleLogger.logWarning(`Empfangene Nachricht konnte keinem Workflow zugeordnet werden und auch keinen neuen starten. Nachricht ${messageString} von ${sender} wird ignoriert`);
                        return;
                    }
                }catch(error)
                {
                    ConsoleLogger.logWarning(`Empfangene Nachricht konnte keinem Workflow zugeordnet werden und hat beim starten eines neuen den Fehler ${error} ausgelöst. Nachricht ${message} von ${sender} wird ignoriert`);
                }
        }
    }

    public static ShutdownWorkflow(id:string):void
    {
        ConsoleLogger.logDebug(`versuche Workflow ${id} zu beenden`);

        let lengthBefore = Workflow_Queue.queue.length;
        let newQueue = Workflow_Queue.queue.filter(w => w.getid() !== id);
        let lengthAfter = newQueue.length;

        if(lengthBefore == lengthAfter)
        {ConsoleLogger.logDebug(`Ein Workflow mit id ${id} existiert nicht`);return;}

        if(Type_Validations.isUndefined(newQueue) == false)
        {
            Workflow_Queue.queue = newQueue as Workflow[];
            ConsoleLogger.logDebug(`Workflow ${id} ist beendet`);
        }
    }
}
