import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import {sleep} from '../phandam_modules/timing_utils';
import { getNextAppointment } from '../phandam_functions/appointment_functions';
import { convertDateToUString,convertDateToSmartphoneDate,convertDateToSmartphoneTime,convertDateToWeekdayShortform } from '../phandam_modules/date_time_utils';
// import { GetAllRooms,GetRoomByID,SetRoomStatus } from '../phandam_functions/room_functions';
import {Workflow_Step} from './Workflow_Step';
import {Workflow} from './Workflow';
import {Workflow_Actions} from './Workflow_Actions';
import {SM_Face_KnownPatient_WithoutAppointment,SM_Extract_From_Audio_Yes,SM_Extract_From_Audio_No,SM_NextAppointment_Response,SM_Failure} from '../api/websocket_messages';



export class Without_Appointment_Workflow extends Workflow{

    private _patientenID:number;
    private _nextAppointment:Date;

    constructor(timeoutTimer:number,sender:string,message:any)
    {
        super();
        ConsoleLogger.logDebug(`starte "Downcast": Workflow mit ID ${this._id} zu Without_Appointment_Workflow`);
        this._patientenID = 0;
        this._nextAppointment = new Date();
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

        let wfsStart:Workflow_Step = new Workflow_Step('StartActionsWithoutAppointment',null,null);
        let wfsWaitNextApo:Workflow_Step = new Workflow_Step('WatingForNextAppointmentAnswer',fixedValues.websocket_spracherkennungID,'EXTRACT_DATA_FROM_AUDIO_SUCCESS');

        //Stepeigenschaften
        wfsStart.execute = this.takeStartupActions.bind(this);
        steps.push(wfsStart);
        wfsWaitNextApo.execute = this.watingForNextAppointmentAnswer.bind(this);
        steps.push(wfsWaitNextApo);

        //Reihnfolge
        wfsStart.nextStep = wfsWaitNextApo;

        //Startpunkt
        this._currentStep = wfsStart;

        //return
        return steps;

    }

    private async takeStartupActions(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {

            //Vorherige Überprüfung (ist Zahl, ist in DB) findet schon bei der Workflowauswahl statt
            this._patientenID = Number(message.filename);

            await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Face_KnownPatient_WithoutAppointment(),this);
            await sleep(3);

            let nextAppointment:Date = await getNextAppointment();
            let date:string = convertDateToSmartphoneDate(nextAppointment);
            let time:string = convertDateToSmartphoneTime(nextAppointment);
            let weekday:string = convertDateToWeekdayShortform(nextAppointment);
            this._nextAppointment = nextAppointment;

            await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_NextAppointment_Response(date,time,weekday),this);
        });
    }

    private async watingForNextAppointmentAnswer(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'EXTRACT_DATA_FROM_AUDIO_SUCCESS'){
                if(message.message.text.result == 'YES')
                {
                    Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Extract_From_Audio_Yes(),this);
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Nächster Termin angenommen`);

                    let TerminStart:string = convertDateToUString(new Date(this._nextAppointment.getTime()),true);
                    let TerminEnde:string = convertDateToUString(new Date(this._nextAppointment.getTime() + fixedValues.TermindauerInMinuten * 60000),true);
                    let sqlcommand:string = "Insert Into Appointments (Start, End, PatientID) Values (?,?,?);";
                    let data = [TerminStart,TerminEnde,this._patientenID];
                    await sql_execute_write(sqlcommand,data);
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Nächster Termin gespeichert`);
                    this.next();
                }
                else if(message.message.text.result == 'NO')
                {
                    Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Extract_From_Audio_No(),this);
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Nächster Termin abgelehnt`);
                    this.next();
                }
                else
                {
                    Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Failure(`Von ${sender} wurde eine Nachricht gesendet die den richtigen type hat, aber die der Workflow an dieser Stelle nicht benötigt.`));
                    ConsoleLogger.logError(`${this.constructor.name} ${this._id} ist verwirrt! Von ${sender} wurde eine Nachricht gesendet die den richtigen type hat, aber die der Workflow an dieser Stelle nicht benötigt.`);
                    this.next();
                }
            }
        });
    }
}
