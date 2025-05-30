import {ConsoleLogger} from './ConsoleLogger';
// import fixedValues from '../phandam_modules/config';
import {Workflow} from './Workflow';
// import {faceExists,HasAppointment} from '../api/websocket_client_actions';
// import {With_Appointment_Workflow} from './With_Appointment_Workflow';
// import {Without_Appointment_Workflow} from './Without_Appointment_Workflow';
// import {Workflow_Communication} from './Workflow_Communication';
import {Type_Validations} from './Type_Validations';
// import {sleep} from '../phandam_modules/timing_utils';
// import {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,SM_Face_Timeout,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure,GE_Does_Face_Exist,SM_Failure,SP_Failure,SM_Extract_From_Audio_Success,GE_New_Patient,SM_NextAppointment_Response,Ro_Failure,GE_Failure,SM_Persondata} from '../api/websocket_messages';
// import {sendToClientWithConfirmation} from '../api/websocket_modules';
import {Workflow_Starter} from './Workflow_Starter';


export class Workflow_Queue{

    public static queue:Workflow[] = [];

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
