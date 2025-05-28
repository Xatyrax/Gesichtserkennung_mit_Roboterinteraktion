import {ConsoleLogger} from './ConsoleLogger';
import {Workflow} from './Workflow';
// import {With_Appointment_Workflow} from './With_Appointment_Workflow';
import {sendToClient} from '../api/websocket_modules';


export class Workflow_Queue{

    public static queue:Workflow[] = [];

    public static sendMessage(sender:Workflow,reciverId:string,message:string){
        // ConsoleLogger.logDebug(`${sender.constructor.name} mit ID ${sender.getid()} sendet an ${reciverId}: ${message}`);
        sendToClient(reciverId,message);
    }

    public static reciveMessage(sender:string,message:any){
        let erwartenVonSender = Workflow_Queue.queue.filter(w => w.getcurrentStep().getExpectedSender() === sender);
        let erwartenType = erwartenVonSender.filter(w => w.getcurrentStep().getExpectedMessageType() === message.type);

        if(erwartenType.length > 1)
        {}
        else if(erwartenType.length == 1)
        {
            //TODO:Gib die Nachricht dem Workflow
        }
        else
        {
            let wf = new Workflow(0);
            try{
                wf.start();
            }catch(error)
            {
                ConsoleLogger.logError(`Fehler beim Starten des Workflows. Fehlermeldung:${error}`)
            }
        }
    }

    private static tryStart(sender:string,message:any):boolean{
        return true;
        //TODO: Ist der Patient bekannt und wenn ja hat er einen Termin? --> enstprechenden Workflow starten
    }
}
