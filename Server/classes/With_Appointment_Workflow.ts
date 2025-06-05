import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import { GetAllRooms,GetRoomByID,SetRoomStatus } from '../phandam_functions/room_functions';
import {Workflow_Step} from './Workflow_Step';
import {Workflow} from './Workflow';
import {Workflow_Actions} from './Workflow_Actions';
import {SM_Face_KnownPatient_WithAppointment,DriveToTarget,SM_ReachedGoal,SM_Phone_Back} from '../api/websocket_messages';
import {sleep} from '../phandam_modules/timing_utils';



export class With_Appointment_Workflow extends Workflow{

    private _timeout:number;

    constructor(timeoutTimer:number,sender:string,message:any)
    {
        super();
        ConsoleLogger.logDebug(`starte "Downcast": Workflow mit ID ${this._id} zu With_Appointment_Workflow`);
        this._timeout = 0;
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
        let wfsWaitForResTimeout:Workflow_Step = new Workflow_Step('watingForResetTimeout',fixedValues.websocket_RoboterID,'ERROR_PHONE_NOT_REMOVED');

        //Stepeigenschaften
        wfsStart.execute = this.takeStartupActions.bind(this);
        steps.push(wfsStart);
        wfsWaitRobot.execute = this.watingForRobotArivalInRoom.bind(this);
        steps.push(wfsWaitRobot);
        wfsWaitForResTimeout.execute = this.watingForResetTimeout.bind(this);
        steps.push(wfsWaitForResTimeout);

        //Reihnfolge
        wfsStart.nextStep = wfsWaitRobot;
        wfsWaitRobot.nextStep = wfsWaitForResTimeout;

        //Startpunkt
        this._currentStep = wfsStart;

        //return
        return steps;

    }

    private async takeStartupActions(sender:string,message:any):Promise<void>{
        // console.log(this as With_Appointment_Workflow);
        Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithAppointment());
        let Raeume = await GetAllRooms();
        if(Raeume[1].Free == true)
        {
          Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B1'));
          await SetRoomStatus(Raeume[1].RoomID,false);
        }
        else if(Raeume[2].Free == true)
        {
          Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B2'));
          await SetRoomStatus(Raeume[2].RoomID,false);
        }
        else if(Raeume[3].Free == true)
        {
          Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B3'));
          await SetRoomStatus(Raeume[3].RoomID,false);
        }
        else{
          //TODO: Filename nicht vorhanden
          Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('W'));
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

              ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout starten`);
              this.waitForTimeout();
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

    private async watingForResetTimeout(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'ERROR_PHONE_NOT_REMOVED'){
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Reset Timeout`);
                    this._timeout = 0;

                    // this._currentStep = (this._WorkflowSteps as Workflow_Step[])[4];
            }
        });
    }

    private async waitForTimeout():Promise<void>{
        ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout gestartet`);
        while(this._timeout < 13){
            ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout tick: Timeout ${String(this._timeout)}`);
            this._timeout = this._timeout + 1;
            await sleep();
        }
        ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout abgelaufen`);
        await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Phone_Back(),this);
        // ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Next Step: ${(this._WorkflowSteps as Workflow_Step[])[5].getName()}`);
        // this._currentStep = (this._WorkflowSteps as Workflow_Step[])[5];
        // this._currentStep.execute('','');
        this.next();
    }

}
