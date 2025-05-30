import {ConsoleLogger} from './ConsoleLogger';
import {Type_Validations} from '../classes/Type_Validations';
import fixedValues from '../phandam_modules/config';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
// import {sleep} from '../phandam_modules/timing_utils';
// import { getNextAppointment } from '../phandam_functions/appointment_functions';
import {convertDateToSmartphoneDate} from '../phandam_modules/date_time_utils';
// import { GetAllRooms,GetRoomByID,SetRoomStatus } from '../phandam_functions/room_functions';
import {Workflow_Step} from './Workflow_Step';
import {Workflow} from './Workflow';
import {Workflow_Communication} from './Workflow_Communication';
import {SM_Face_UnknownPatient,SM_Persondata,GE_New_Patient,SM_Failure,SM_Extract_From_Audio_Yes} from '../api/websocket_messages';



export class Unknown_Customer_Workflow extends Workflow{

    constructor(timeoutTimer:number,sender:string,message:any)
    {
        super(timeoutTimer);
        ConsoleLogger.logDebug(`starte "Downcast": Workflow mit ID ${this._id} zu Unknown_Customer_Workflow`);
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
        let wfsWaitForNextApoConfirmation:Workflow_Step = new Workflow_Step('WatingForNextAppointmentConfirmation',fixedValues.websocket_smartphoneID,'DATA_CONFIRMATION');

        // let wfsWaitGesSaveConfirm:Workflow_Step = new Workflow_Step('WatingForFaceSaveConfirmation',fixedValues.websocket_spracherkennungID,'EXTRACT_DATA_FROM_AUDIO_SUCCESS');

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

        // wfsWaitPerDataConfirm.nextStep = wfsWaitGesSaveConfirm;

        //Startpunkt
        this._currentStep = wfsStart;

        //return
        return steps;

    }

    private async takeStartupActions(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {

            await Workflow_Communication.sendMessage(fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());

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

            let ResponseForSmartphone = SM_Persondata(vorname,nachname,geschlecht??'-',convertDateToSmartphoneDate(gebrutsdatum),tel??'-',email??'-');
            await Workflow_Communication.sendMessage(fixedValues.websocket_smartphoneID,ResponseForSmartphone);

            this.next();
        });
    }

    private async watingForPersonDataConfirm(sender:string,message:any):Promise<void>{
        return new Promise(async (resolve, reject) => {
            if(message.type == 'DATA_CONFIRMATION'){
                if(message.Answer == 'TRUE')
                {
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patientendaten angenommen. Patient wird gespeichert.`);
                    await Workflow_Communication.sendMessage(fixedValues.websocket_gesichtserkennungID,GE_New_Patient());

                    let nextAppointment:Date = await getNextAppointment();
                    let date:string = convertDateToSmartphoneDate(nextAppointment);
                    let time:string = convertDateToSmartphoneTime(nextAppointment);
                    let weekday:string = convertDateToWeekdayShortform(nextAppointment);

                    await Workflow_Communication.sendMessage(fixedValues.websocket_smartphoneID,SM_NextAppointment_Response(date,time,weekday));

                    this.next();
                }
                else if(message.Answer == 'FALSE')
                {
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Patientendaten abgelehnt. Warte auf neue Patienendaten...`);
                    if(Type_Validations.isUndefined(this._WorkflowSteps) == true){
                        ConsoleLogger.logError(`${this.constructor.name} ${this._id} Fehlerhafter Workflow. Beende Workflow`);
                        //TODO: Shutdown
                    }
                    if((this._WorkflowSteps as Workflow_Step[]).length < 1)
                    {
                        ConsoleLogger.logError(`${this.constructor.name} ${this._id} Fehlerhafter Workflow. Beende Workflow`);
                        //TODO: Shutdown
                    }
                    let wfsWaitPerData:Workflow_Step = (this._WorkflowSteps as Workflow_Step[])[1] as Workflow_Step;
                    this._currentStep = wfsWaitPerData;
                    this.next();
                }
                else
                {
                    Workflow_Communication.sendMessage(fixedValues.websocket_smartphoneID,SM_Failure(`Von ${sender} wurde eine Nachricht gesendet die den richtigen type hat, aber die der Workflow an dieser Stelle nicht benötigt.`));
                    ConsoleLogger.logError(`${this.constructor.name} ${this._id} ist verwirrt! Von ${sender} wurde eine Nachricht gesendet die den richtigen type hat, aber die der Workflow an dieser Stelle nicht benötigt.`);

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
                    Workflow_Communication.sendMessage(fixedValues.websocket_smartphoneID,SM_Extract_From_Audio_Yes());
                    ConsoleLogger.logDebug(`${this.constructor.name} ${this._id}: Nächster Termin angenommen`);
                    this.next();
                }
            }
        });
    }
}
