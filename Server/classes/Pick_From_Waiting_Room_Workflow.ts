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

        // let wfsPhoneRemovedAction:Workflow_Step = new Workflow_Step('PhoneRemovedAction','','');
        let wfsWaitUntilTreRoom:Workflow_Step = new Workflow_Step('WatingForRobotArivalInRoom',fixedValues.websocket_RoboterID,'DRIVE_TO_ROOM_ANSWER');
        let wfsWaitForResTimeout:Workflow_Step = new Workflow_Step('watingForResetTimeout',fixedValues.websocket_RoboterID,'ERROR_PHONE_NOT_REMOVED');

        //Stepeigenschaften
        wfsStart.execute = this.takeStartupActions.bind(this);
        steps.push(wfsStart);
        wfsWaitUntilWaitingroom.execute = this.watingForRobotArivalInWatingroom.bind(this);
        steps.push(wfsWaitUntilWaitingroom);
        wfsWaitForSpeech.execute = this.watingForSpeechResponse.bind(this);
        steps.push(wfsWaitForSpeech);

        // wfsPhoneRemovedAction.execute = this.PhoneRemoved.bind(this);
        // steps.push(wfsPhoneRemovedAction);
        wfsWaitUntilTreRoom.execute = this.watingForRobotArivalInRoom.bind(this);
        steps.push(wfsWaitUntilTreRoom);
        wfsWaitForResTimeout.execute = this.watingForResetTimeout.bind(this);
        steps.push(wfsWaitForResTimeout);


        //Reihnfolge
        wfsStart.nextStep = wfsWaitUntilWaitingroom;
        wfsWaitUntilWaitingroom.nextStep = wfsWaitForSpeech;
        // wfsWaitForSpeech.nextStep = wfsWaitUntilTreRoom;
        // wfsWaitUntilTreRoom.nextStep = wfsWaitForResTimeout;
        // wfsWaitForSpeech.nextStep = wfsWaitForResTimeout;
        // wfsWaitForResTimeout.nextStep = wfsPhoneRemovedAction;
        // wfsPhoneRemovedAction.nextStep = wfsWaitUntilTreRoom;


        //Startpunkt
        this._currentStep = wfsStart;

        //return
        return steps;

    }

    private async takeStartupActions(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            let patientenIdResult:any = await sql_execute(`SELECT PatientID FROM Patients_Rooms as PR Join Rooms as R WHERE R.RoomKey = 'W';`);
            console.log(patientenIdResult);
            //TODO: Überprüfen ob es diese PatientenID in der Datenbank gibt
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
                    // ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patientendaten für PatientenID ${this._patientenID} abfragen starten`);
                    let sql_Command = 'Select Firstname, Lastname From Patients';
                    let Patienname:any = await sql_execute(sql_Command);

                    // console.log(fixedValues.generierteAudio_pfad);
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

                // ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Raumauswahl gestartet`);
                // let Raeume = await GetAllRooms();
                // if(Raeume[1].Free == true)
                // {
                //     Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B1'));
                //     await SetRoomStatus(Raeume[1].RoomID,false);
                // }
                // else if(Raeume[2].Free == true)
                // {
                //     Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B2'));
                //     await SetRoomStatus(Raeume[2].RoomID,false);
                // }
                // else if(Raeume[3].Free == true)
                // {
                //     Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget('B3'));
                //     await SetRoomStatus(Raeume[3].RoomID,false);
                // }
                // else{
                //     ConsoleLogger.logError(`${this.constructor.name} ${this._id}: kein freier Raum gefunden`);
                // }
                Workflow_Starter.StartWithAppointment(this._patientenID)
                // let Fake_Face_response = `{"event": "face_result", "filename": "${this._patientenID}", "result": "Gesicht erkannt"}`
                // let wf = new With_Appointment_Workflow(0,fixedValues.websocket_gesichtserkennungID,Fake_Face_response);
                // Workflow_Queue.queue.push(wf);

                ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout Rücksetzung starten`);
                this.next();
                // ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout starten`);
                // this.waitForTimeout();


        });
    }

    private async watingForResetTimeout(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'ERROR_PHONE_NOT_REMOVED'){
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Reset Timeout`);
                    this._timeout = 0;
                    // ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Reset Step: ${(this._WorkflowSteps as Workflow_Step[])[4].getName()}`)
                    this._currentStep = (this._WorkflowSteps as Workflow_Step[])[5];
                    // this.next();
            }
        });
    }

     private async PhoneRemoved(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Behandlungszimmerauswahl gestartet`);
            let sql_Command_GetRoomKey = 'Select RoomKey,RoomID From Rooms WHERE Free = 1;';
            let roomKey_result:any = await sql_execute(sql_Command_GetRoomKey);
            if(roomKey_result.length < 1)
            {
                ConsoleLogger.logError(`${this.constructor.name} ${this._id}: Es steht kein freier Raum zur Verfügung. Wurde dieser seit Beginn des Workflows wieder belegt? Beende Workflow`);
                Workflow_Actions.ShutdownWorkflow(this._id);
                return;
            }
            let roomKey:string='';
            // try{

            ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Zimmer ${roomKey_result[0].RoomKey} gewählt`);
            roomKey = roomKey_result[0].RoomKey;

            ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Belege gewältes Zimmer`);
            let sqlcommand = "Update Rooms set Free = 0 WHERE RoomID = ?";
            let data = roomKey_result[0].RoomID;
            await sql_execute_write(sqlcommand,data);
                // if(roomKey_result[0].RoomKey != 'W' && roomKey_result[0].RoomKey != 'B1' && roomKey_result[0].RoomKey != 'B2' && roomKey_result[0].RoomKey != 'B3')
                // {ConsoleLogger.logError(`${this.constructor.name} ${this._id}: Ungültiger Raumschlüssel von DB erhalten. Beende Workflow.`);Workflow_Actions.ShutdownWorkflow(this._id);}
            // }catch{roomKey='B1';}

            await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Phone_Back(),this);
            await Workflow_Actions.sendMessage(fixedValues.websocket_RoboterID,DriveToTarget(roomKey));

            ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Roboter ins Behandlungszimmer losgeschickt`);
            this.next();
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

                    this.waitForTimeout();

                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout Rücksetzung starten`);
                    this.next();
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Timeout starten`);
                    this.waitForTimeout();
                }
                //TODO: Else
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

        // ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Next Step: ${(this._WorkflowSteps as Workflow_Step[])[5].getName()}`);
        this._currentStep = (this._WorkflowSteps as Workflow_Step[])[5];
        this._currentStep.execute('','');
        // this.next();
    }
}
