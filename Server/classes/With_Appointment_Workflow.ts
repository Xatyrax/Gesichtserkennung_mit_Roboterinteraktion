import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import { GetAllRooms,GetRoomByID,SetRoomStatus } from '../phandam_functions/room_functions';
import {Workflow_Step} from './Workflow_Step';
import {Workflow} from './Workflow';
import {Workflow_Queue} from './Workflow_Queue';



import {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,SM_Face_Timeout,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure,GE_Does_Face_Exist,SM_Failure,SP_Failure,SM_Extract_From_Audio_Success,GE_New_Patient,SM_NextAppointment_Response,Ro_Failure,GE_Failure,SM_Persondata} from '../api/websocket_messages';

export class With_Appointment_Workflow extends Workflow{

    constructor(timeoutTimer:number,sender:string,message:any)
    {
        super(timeoutTimer);
        ConsoleLogger.logDebug(`starte Downcast: Workflow mit ID ${this._id} zu With_Appointment_Workflow`);
        try{
        this._WorkflowSteps = this.createWorkflowsteps();
        if (this._currentStep !== undefined &&sender!='')
        {
          this._currentStep.execute(sender,message);
        }
        this.next();
        }
        catch(error){
            ConsoleLogger.logError(`Fehler beim Downcast. Beende Workflow mit ID ${this._id} . Fehlermeldung: ${error}`)
            return;
        }
    }

    //Start (stattdessen constructor?)

    next():Workflow_Step{
      if(this._currentStep !== undefined)
      {
        this._currentStep = this._currentStep.nextStep;
      }
      return new Workflow_Step();

    }

    createWorkflowsteps():Workflow_Step[]{

        //Steps
        let steps:Workflow_Step[] = [new Workflow_Step()];

        let wfsStart:Workflow_Step = new Workflow_Step('StartActionsWithAppointment',null,null);
        let wfsWaitRobot:Workflow_Step = new Workflow_Step('WatingForRobotArivalInTreatmentRoom',fixedValues.websocket_RoboterID,'DRIVE_TO_ROOM_ANSWER');

        //Stepeigenschaften
        wfsStart.execute = this.takeStartupActions;
        steps.push(wfsStart);

        //Reihnfolge
        wfsStart.nextStep = wfsWaitRobot;

        //Startpunkt
        this._currentStep = wfsStart;

        //return
        return steps;

    }

    private async takeStartupActions(sender:string,message:any):Promise<void>{
        Workflow_Queue.sendMessage(this,fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithAppointment());
        let Raeume = await GetAllRooms();
        if(Raeume[0].Free == true)
        {
          Workflow_Queue.sendMessage(this,fixedValues.websocket_RoboterID,DriveToTarget('B1'));
          await SetRoomStatus(Raeume[0].RoomID,false);
        }
        else if(Raeume[1].Free == true)
        {
          Workflow_Queue.sendMessage(this,fixedValues.websocket_RoboterID,DriveToTarget('B2'));
          await SetRoomStatus(Raeume[1].RoomID,false);
        }
        else if(Raeume[2].Free == true)
        {
          Workflow_Queue.sendMessage(this,fixedValues.websocket_RoboterID,DriveToTarget('B3'));
          await SetRoomStatus(Raeume[2].RoomID,false);
        }
        else{
          Workflow_Queue.sendMessage(this,fixedValues.websocket_RoboterID,DriveToTarget('W'));
          let data = [Raeume[0].RoomID, message.filename];
          let sqlcommand = "INSERT INTO Patients_Rooms (RoomID, PatientID) VALUES (?,?)";
          sql_execute_write(sqlcommand,data);
        }
    }

}
