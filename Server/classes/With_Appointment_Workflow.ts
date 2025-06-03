import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import { GetAllRooms,GetRoomByID,SetRoomStatus } from '../phandam_functions/room_functions';
import {Workflow_Step} from './Workflow_Step';
import {Workflow} from './Workflow';
import {Workflow_Actions} from './Workflow_Actions';
import {SM_Face_KnownPatient_WithAppointment,DriveToTarget,SM_ReachedGoal} from '../api/websocket_messages';



export class With_Appointment_Workflow extends Workflow{

    constructor(timeoutTimer:number,sender:string,message:any)
    {
        super(timeoutTimer);
        ConsoleLogger.logDebug(`starte "Downcast": Workflow mit ID ${this._id} zu With_Appointment_Workflow`);
        try{
        this._WorkflowSteps = this.createWorkflowsteps();
        if (sender!='')
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

    createWorkflowsteps():Workflow_Step[]{

        //Steps
        let steps:Workflow_Step[] = [new Workflow_Step()];

        let wfsStart:Workflow_Step = new Workflow_Step('StartActionsWithAppointment',null,null);
        let wfsWaitRobot:Workflow_Step = new Workflow_Step('WatingForRobotArivalInRoom',fixedValues.websocket_RoboterID,'DRIVE_TO_ROOM_ANSWER');

        //Stepeigenschaften
        wfsStart.execute = this.takeStartupActions.bind(this);
        steps.push(wfsStart);
        wfsWaitRobot.execute = this.watingForRobotArivalInRoom.bind(this);
        steps.push(wfsWaitRobot);

        //Reihnfolge
        wfsStart.nextStep = wfsWaitRobot;

        //Startpunkt
        this._currentStep = wfsStart;

        //return
        return steps;

    }

    private async takeStartupActions(sender:string,message:any):Promise<void>{
        // console.log(this as With_Appointment_Workflow);
        Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithAppointment(),this);
        let Raeume = await GetAllRooms();
        if(Raeume[1].Free == true)
        {
          Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B1'),this);
          await SetRoomStatus(Raeume[1].RoomID,false);
        }
        else if(Raeume[2].Free == true)
        {
          Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B2'),this);
          await SetRoomStatus(Raeume[2].RoomID,false);
        }
        else if(Raeume[3].Free == true)
        {
          Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B3'),this);
          await SetRoomStatus(Raeume[3].RoomID,false);
        }
        else{
          //TODO: Filename nicht vorhanden
          Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('W'),this);
          let data = [Raeume[0].RoomID, message.filename];
          let sqlcommand = "INSERT INTO Patients_Rooms (RoomID, PatientID) VALUES (?,?)";
          sql_execute_write(sqlcommand,data);
        }
    }

    private async watingForRobotArivalInRoom(sender:string,message:any):Promise<void>{

        if(message.type == 'DRIVE_TO_ROOM_ANSWER'){
          if(message.Answer == 'TRUE')
          {
              await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_ReachedGoal(true),this);
              ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patient abgeliefert`);
              this.next();
          }
          else if(message.Answer == 'FALSE')
          {
              await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_ReachedGoal(false),this);
              ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patient konnte nicht abgeliefert werden. Roboter scheint Probleme beim Erreichen des Ziels zu haben.`);
              this.next();
          }
          else
          {
            //TODO: nächsten Nachrichten nicht annehmen um sie anderen nicht wegzunehmen
              ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Unerwartete Nachricht von ${sender}. Warte auf brauchbare Nachricht`);
          }
        }

    }

}
