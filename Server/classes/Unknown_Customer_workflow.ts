import {ConsoleLogger} from './ConsoleLogger';
import {Type_Validations} from '../classes/Type_Validations';
import fixedValues from '../phandam_modules/config';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import { convertDateToUString,convertDateToSmartphoneDate,convertDateToSmartphoneTime,convertDateToWeekdayShortform} from '../phandam_modules/date_time_utils';
import { getNextAppointment } from '../phandam_functions/appointment_functions';
import {Workflow_Step} from './Workflow_Step';
import {Workflow} from './Workflow';
import {Workflow_Actions} from './Workflow_Actions';
import {SM_Face_UnknownPatient,SM_Persondata,GE_New_Patient,SM_Failure,SM_Extract_From_Audio_Yes,SM_NextAppointment_Response} from '../api/websocket_messages';
import {sleep} from '../phandam_modules/timing_utils';



export class Unknown_Customer_Workflow extends Workflow{

    private _patientenID:number;
    private _nextAppointment:Date;
    private _personDataError:string;

    constructor(timeoutTimer:number,sender:string,message:any)
    {
        super();
        ConsoleLogger.logDebug(`starte "Downcast": Workflow mit ID ${this._id} zu Unknown_Customer_Workflow`);
        this._patientenID = 0;
        this._nextAppointment = new Date();
        this._personDataError = ""
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

        let wfsStart:Workflow_Step = new Workflow_Step('StartActionsUnknown',null,null);
        let wfsWaitPerData:Workflow_Step = new Workflow_Step('WatingForPersonData',fixedValues.websocket_spracherkennungID,'EXTRACT_DATA_FROM_AUDIO_SUCCESS');
        let wfsWaitPerDataConfirm:Workflow_Step = new Workflow_Step('WatingForPersonDataConfirmation',fixedValues.websocket_smartphoneID,'DATA_CONFIRMATION');
        let wfsWaitForNextApoConfirmation:Workflow_Step = new Workflow_Step('WatingForNextAppointmentConfirmation',fixedValues.websocket_spracherkennungID,'EXTRACT_DATA_FROM_AUDIO_SUCCESS');

        //Stepeigenschaften
        wfsStart.execute = this.takeStartupActions.bind(this);
        steps.push(wfsStart);
        wfsWaitPerData.execute = this.watingForPersonData.bind(this);
        steps.push(wfsWaitPerData);
        wfsWaitPerDataConfirm.execute = this.watingForPersonDataConfirm.bind(this);
        steps.push(wfsWaitPerDataConfirm);
        wfsWaitForNextApoConfirmation.execute = this.wfsWaitForNextApoConfirmation.bind(this);
        steps.push(wfsWaitForNextApoConfirmation);

        //Reihnfolge
        wfsStart.nextStep = wfsWaitPerData;
        wfsWaitPerData.nextStep = wfsWaitPerDataConfirm;
        wfsWaitPerDataConfirm.nextStep = wfsWaitForNextApoConfirmation;

        //Startpunkt
        this._currentStep = wfsStart;

        //return
        return steps;

    }

    private async takeStartupActions(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {

            this._patientenID = Number(message.filename);
            await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());

        });
    }

    private async watingForPersonData(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {

            let geschlecht:string|null = message.message.text.sex;
            let vorname:string = message.message.text.firstname;
            let nachname:string = message.message.text.lastname;
            //TODO:Fehlererkennung
            let gebYear=(message.message.text.date_of_birth).substring(0,4);
            let gebMonth=(message.message.text.date_of_birth).substring(5,7);
            let gebDay=(message.message.text.date_of_birth).substring(8,10);
            let gebDate = new Date(gebYear,gebMonth-1,gebDay,12,0,0);
            let gebrutsdatum:Date = gebDate;
            let tel:string|null = message.message.text.phone_number;
            let email:string|null = message.message.text.email_address;

            if(message.message.text.firstname == "" || message.message.text.firstname == "-")
            {this._personDataError = "Fistname Fehler"}
            else if(message.message.text.lastname == "" || message.message.text.lastname == "-")
            {this._personDataError = "Lastname Fehler"}
            else if(message.message.text.date_of_birth == "" || message.message.text.date_of_birth == "-")
            {this._personDataError = "Geb Fehler"}
            else
            {this._personDataError = ""}

            let ResponseForSmartphone = SM_Persondata(vorname,nachname,geschlecht??'-',convertDateToSmartphoneDate(gebrutsdatum),tel??'-',email??'-');
            await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,ResponseForSmartphone,this);

            this.next();
        });
    }

    private async watingForPersonDataConfirm(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'DATA_CONFIRMATION'){
                if(message.Answer == 'TRUE')
                {
                    if(this._personDataError != "")
                    {
                        await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Failure(this._personDataError),this);
                        ConsoleLogger.logWarning(`${this.constructor.name} ${this._id}: Patientendaten Fehlerhaft: ${this._personDataError}. Warte auf neue Patientendaten`);
                        this._currentStep = (this._WorkflowSteps as Workflow_Step[])[2];
                        return;
                    }

                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patientendaten angenommen. Patient wird gespeichert.`);
                    await Workflow_Actions.sendMessage(fixedValues.websocket_gesichtserkennungID,GE_New_Patient(),this);
                    await sleep(3);
                    await this.sendNextAppointment();

                    this.next();
                }
                else if(message.Answer == 'FALSE')
                {
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patientendaten abgelehnt. Warte auf neue Patienendaten...`);
                    let wfsWaitPerData:Workflow_Step = (this._WorkflowSteps as Workflow_Step[])[1] as Workflow_Step;
                    this._currentStep = wfsWaitPerData;
                    this.next();
                }
                else
                {
                    Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_Failure(`Von ${sender} wurde eine Nachricht gesendet die den richtigen type hat, aber die der Workflow an dieser Stelle nicht benötigt. Beende Workflow`),this);
                    ConsoleLogger.logError(`${this.constructor.name} ${this._id} ist verwirrt! Von ${sender} wurde eine Nachricht gesendet die den richtigen type hat, aber die der Workflow an dieser Stelle nicht benötigt. Beende Workflow`);
                    Workflow_Actions.ShutdownWorkflow(this._id);

                    this.next();
                }
            }
        });
    }

    private async wfsWaitForNextApoConfirmation(sender:string,message:any):Promise<void>{
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
                else if (message.message.text.result == 'NO')
                {
                    await sleep(7);
                     await this.sendNextAppointment();
                }
                else
                {
                    ConsoleLogger.logError(`${this.constructor.name} ${this._id}: Ungültige Antwort von der Spracherkennung: ${message}. Beende Workflow`);
                    Workflow_Actions.ShutdownWorkflow(this._id);
                }
            }
        });
    }

     private async sendNextAppointment():Promise<void> {
         let nextAppointment:Date = await getNextAppointment();
         let date:string = convertDateToSmartphoneDate(nextAppointment);
         let time:string = convertDateToSmartphoneTime(nextAppointment);
         let weekday:string = convertDateToWeekdayShortform(nextAppointment);

         this._nextAppointment = nextAppointment;

         await Workflow_Actions.sendMessage(fixedValues.websocket_smartphoneID,SM_NextAppointment_Response(date,time,weekday),this);
     }
}
