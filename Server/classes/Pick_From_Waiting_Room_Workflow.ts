import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import fs from 'fs';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import {sleep} from '../phandam_modules/timing_utils';
// import { getNextAppointment } from '../phandam_functions/appointment_functions';
// import { convertDateToUString,convertDateToSmartphoneDate,convertDateToSmartphoneTime,convertDateToWeekdayShortform } from '../phandam_modules/date_time_utils';
// import { GetAllRooms,GetRoomByID,SetRoomStatus } from '../phandam_functions/room_functions';
import {Workflow_Step} from './Workflow_Step';
import {Workflow} from './Workflow';
import {Workflow_Communication} from './Workflow_Communication';
import {SM_ReachedGoal,SP_Audio_Genaration_Request,DriveToTarget,SM_Audio_GenerationSuccess,DriveToPickUpPatient} from '../api/websocket_messages';



export class Pick_From_Waiting_Room_Workflow extends Workflow{

    private _patientenID:number;

    constructor(timeoutTimer:number,sender:string,message:any)
    {
        super(timeoutTimer);
        ConsoleLogger.logDebug(`starte "Downcast": Workflow mit ID ${this._id} zu Pick_From_Waiting_Room_Workflow`);
        this._patientenID = 0;
        try{

        this._WorkflowSteps = this.createWorkflowsteps();
        // if (sender!='')
        // {
          this._currentStep.execute(sender,message);
        // }
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
        let wfsWaitForSmart:Workflow_Step = new Workflow_Step('WatingForSmartphoneResponse',fixedValues.websocket_smartphoneID,'AUDIO_GENERATION_REQUEST_SUCCESS_ANSWER');
        let wfsWaitUntilTreRoom:Workflow_Step = new Workflow_Step('WatingForRobotArivalInRoom',fixedValues.websocket_RoboterID,'DRIVE_TO_ROOM_ANSWER');

        //Stepeigenschaften
        wfsStart.execute = this.takeStartupActions.bind(this);
        steps.push(wfsStart);
        wfsWaitUntilWaitingroom.execute = this.watingForRobotArivalInWatingroom.bind(this);
        steps.push(wfsWaitUntilWaitingroom);
        wfsWaitForSpeech.execute = this.watingForSpeechResponse.bind(this);
        steps.push(wfsWaitForSpeech);
        wfsWaitForSmart.execute = this.watingForSmartphoneResponse.bind(this);
        steps.push(wfsWaitForSmart);
        wfsWaitUntilTreRoom.execute = this.watingForRobotArivalInRoom.bind(this);
        steps.push(wfsWaitUntilTreRoom);

        //Reihnfolge
        wfsStart.nextStep = wfsWaitUntilWaitingroom;
        wfsWaitUntilWaitingroom.nextStep = wfsWaitForSpeech;
        wfsWaitForSpeech.nextStep = wfsWaitUntilTreRoom;
        // wfsWaitForSpeech.nextStep = wfsWaitForSmart;
        // wfsWaitForSmart.nextStep = wfsWaitUntilTreRoom;

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
            await Workflow_Communication.sendMessage(fixedValues.websocket_RoboterID,DriveToPickUpPatient());
        });
    }

    private async watingForRobotArivalInWatingroom(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'PICK_PATIENT_ANSWER'){
                if(message.Answer == 'TRUE')
                {
                    console.log(`Patientendaten für PatientenID ${this._patientenID} abfragen starten`);
                    let sql_Command = 'Select Firstname, Lastname From Patients';
                    let Patienname:any = await sql_execute(sql_Command);

                    // console.log(fixedValues.generierteAudio_pfad);
                    //Datei löschen wenn existent
                    if (fs.existsSync(fixedValues.generierteAudio_pfad)) {
                        fs.unlinkSync(fixedValues.generierteAudio_pfad);
                    }

                    Workflow_Communication.sendMessage(fixedValues.websocket_smartphoneID,SM_ReachedGoal(true),this);
                    await Workflow_Communication.sendMessage(fixedValues.websocket_spracherkennungID,SP_Audio_Genaration_Request(`${Patienname[0].Firstname} ${Patienname[0].Lastname} bitte heben sie das Handy hoch und folgen Sie mir bitte ins Behandlungszimmer`),this);
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: In Wartezimmer angekommen`);
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
                await Workflow_Communication.sendMessage(fixedValues.websocket_smartphoneID,SM_Audio_GenerationSuccess(),this);

                let sql_Command_GetRoomKey = 'Select RoomKey From Rooms WHERE Free = 1;';
                let roomKey_result:any = await sql_execute(sql_Command_GetRoomKey);
                if(roomKey_result[0].RoomKey != 'W' && roomKey_result[0].RoomKey != 'B1' && roomKey_result[0].RoomKey != 'B2' && roomKey_result[0].RoomKey != 'B3')
                {console.log('Fehler beim Abrufen des Raumschlüssels. Ungültiger Raumschlüssel von der DB erhalten.')}

                await Workflow_Communication.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget(roomKey_result[0].RoomKey));
                ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Roboter ins Behandlungszimmer losgeschickt`);

                this.next();
        });
    }
    private async watingForSmartphoneResponse(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'AUDIO_GENERATION_REQUEST_SUCCESS_ANSWER'){
                if(message.message == 'TRUE')
                {
                    let sql_Command_GetRoomKey = 'Select RoomKey From Rooms WHERE Free = 1;';
                    let roomKey_result:any = await sql_execute(sql_Command_GetRoomKey);
                    if(roomKey_result[0].RoomKey != 'W' && roomKey_result[0].RoomKey != 'B1' && roomKey_result[0].RoomKey != 'B2' && roomKey_result[0].RoomKey != 'B3')
                    {console.log('Fehler beim Abrufen des Raumschlüssels. Ungültiger Raumschlüssel von der DB erhalten.')}

                    await Workflow_Communication.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget(roomKey_result[0].RoomKey));
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Roboter ins Behandlungszimmer losgeschickt`);
                    this.next();
                }
            }
        });
    }
    private async watingForRobotArivalInRoom(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'DRIVE_TO_ROOM_ANSWER'){
                if(message.Answer == 'TRUE')
                {
                    await Workflow_Communication.sendMessage(fixedValues.websocket_smartphoneID,SM_ReachedGoal(true),this);
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patient in Behandlungsraum angekommen`);
                    this.next();
                }
            }
        });
    }
}
