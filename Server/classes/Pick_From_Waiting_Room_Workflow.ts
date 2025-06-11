import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import fs from 'fs';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import {sleep} from '../phandam_modules/timing_utils';
import {Workflow_Step} from './Workflow_Step';
import {Workflow} from './Workflow';
import {Workflow_Actions} from './Workflow_Actions';
import {Workflow_Starter} from './Workflow_Starter';
import {SM_ReachedGoal,SP_Audio_Genaration_Request,DriveToTarget,SM_Audio_GenerationSuccess,DriveToPickUpPatient,SM_Phone_Back} from '../api/websocket_messages';



export class Pick_From_Waiting_Room_Workflow extends Workflow{

    private _patientenID:number;
    private _timeout:number;

    constructor(timeoutTimer:number,sender:string,message:any)
    {
        super();
        ConsoleLogger.logDebug(`starte "Downcast": Workflow mit ID ${this._id} zu Pick_From_Waiting_Room_Workflow`);
        this._patientenID = 0;
        this._timeout = 0;
        try{

        this._WorkflowSteps = this.createWorkflowsteps();
        this._currentStep.execute(sender,message);
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

        let wfsStart:Workflow_Step = new Workflow_Step('StartActionsPickPatient',null,null);
        let wfsWaitUntilWaitingroom:Workflow_Step = new Workflow_Step('WatingForRobotArivalInWatingroom',fixedValues.websocket_RoboterID,'PICK_PATIENT_ANSWER');
        let wfsWaitForSpeech:Workflow_Step = new Workflow_Step('WatingForSpeechResponse','','');
        let wfsWaitUntilTreRoom:Workflow_Step = new Workflow_Step('WatingForRobotArivalInRoom',fixedValues.websocket_RoboterID,'DRIVE_TO_ROOM_ANSWER');
        let wfsWaitForResTimeout:Workflow_Step = new Workflow_Step('watingForResetTimeout',fixedValues.websocket_RoboterID,'ERROR_PHONE_NOT_REMOVED');

        //Stepeigenschaften
        wfsStart.execute = this.takeStartupActions.bind(this);
        steps.push(wfsStart);
        wfsWaitUntilWaitingroom.execute = this.watingForRobotArivalInWatingroom.bind(this);
        steps.push(wfsWaitUntilWaitingroom);
        wfsWaitForSpeech.execute = this.watingForSpeechResponse.bind(this);
        steps.push(wfsWaitForSpeech);
        wfsWaitUntilTreRoom.execute = this.watingForRobotArivalInRoom.bind(this);
        steps.push(wfsWaitUntilTreRoom);
        wfsWaitForResTimeout.execute = this.watingForResetTimeout.bind(this);
        steps.push(wfsWaitForResTimeout);


        //Reihnfolge
        wfsStart.nextStep = wfsWaitUntilWaitingroom;
        wfsWaitUntilWaitingroom.nextStep = wfsWaitForSpeech;

        //Startpunkt
        this._currentStep = wfsStart;

        //return
        return steps;

    }

    private async takeStartupActions(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            let patientenIdResult:any = await sql_execute(`SELECT PatientID FROM Patients_Rooms as PR Join Rooms as R WHERE R.RoomKey = 'W';`);
            console.log(patientenIdResult);
            this._patientenID = patientenIdResult[0].PatientID;
            await Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToPickUpPatient());
        });
    }

    private async watingForRobotArivalInWatingroom(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'PICK_PATIENT_ANSWER'){
                if(message.Answer == 'TRUE')
                {
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: In Wartezimmer angekommen`);
                    let sql_Command = 'Select Firstname, Lastname From Patients';
                    let Patienname:any = await sql_execute(sql_Command);

                    //Datei löschen wenn existent
                    if (fs.existsSync(fixedValues.generierteAudio_pfad)) {
                        fs.unlinkSync(fixedValues.generierteAudio_pfad);
                    }

                    Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_ReachedGoal(true),this);
                    await Workflow_Actions.sendMessage(fixedValues.websocket_spracherkennungID,SP_Audio_Genaration_Request(`${Patienname[0].Firstname} ${Patienname[0].Lastname} bitte heben sie das Handy hoch und folgen Sie mir bitte ins Behandlungszimmer`),this);
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: warte auf Audiogenerierung`);
                    this.next();
                    this._currentStep.execute('','');
                }
            }
        });
    }

    private async watingForSpeechResponse(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {

                // console.log('start');
                //Auf Generierung warten
                console.log(fixedValues.generierteAudio_pfad);
                for (let i = 0; i < fixedValues.TimeoutAudiogenerierungInSekunden; i++) {
                    try{
                    if (fs.existsSync(fixedValues.generierteAudio_pfad)) {
                        break;
                    }
                    }
                    catch(error){console.log(error); return;
                        //TODO: Shutdown
                    }
                    await sleep();
                }
                ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Audiodatei wurde generiert`);
                await sleep(10);
                await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Audio_GenerationSuccess(),this);

                Workflow_Starter.StartWithAppointment(this._patientenID)

                ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout Rücksetzung starten`);
                this.next();
        });
    }

    private async watingForResetTimeout(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'ERROR_PHONE_NOT_REMOVED'){
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Reset Timeout`);
                    this._timeout = 0;
                    this._currentStep = (this._WorkflowSteps as Workflow_Step[])[5];
            }
        });
    }

    private async watingForRobotArivalInRoom(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'DRIVE_TO_ROOM_ANSWER'){
                if(message.Answer == 'TRUE')
                {
                    await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_ReachedGoal(true),this);
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patient in Behandlungsraum angekommen`);
                    let sqlcommand:string = "Delete From Patients_Rooms Where PatientID = ?";
                    let data = [this._patientenID];
                    await sql_execute_write(sqlcommand,data);

                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout starten`);
                    this.waitForTimeout();
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout Rücksetzung starten`);
                    this.next();
                }
                else
                {
                    ConsoleLogger.logError(`${this.constructor.name} ${this._id}: Roboter hat ein Problem das Ziel zu erreichen`);
                    this.next();
                    return;
                }
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
        this.next();

        this._currentStep = (this._WorkflowSteps as Workflow_Step[])[5];
        this._currentStep.execute('','');
    }
}
