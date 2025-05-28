import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import {Workflow_Queue} from './Workflow_Queue';
import {Workflow_Step} from './Workflow_Step';
import {faceExists,HasAppointment} from '../api/websocket_client_actions';
import {With_Appointment_Workflow} from './With_Appointment_Workflow';
import {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,SM_Face_Timeout,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure,GE_Does_Face_Exist,SM_Failure,SP_Failure,SM_Extract_From_Audio_Success,GE_New_Patient,SM_NextAppointment_Response,Ro_Failure,GE_Failure,SM_Persondata} from '../api/websocket_messages';

export class Workflow{
    protected _id : string;
    protected _timeoutTimer : number;
    protected _startedDateTime:Date;
    protected _currentStep : Workflow_Step|undefined;
    protected _WorkflowSteps : Workflow_Step[]|undefined;

    constructor(timeoutTimer:number){
        this._id = this.generateid();
        this._timeoutTimer = timeoutTimer;
        this._startedDateTime = new Date();
        ConsoleLogger.logDebug(`erstelle Workflow mit ID ${this._id}`);

    }

    //TODO:Workflowstep ist überprüfen welcher spezifische Workflow benötigt wird
    public next():Workflow_Step{return new Workflow_Step();};

    public getid(){return this._id;}

    public getstartedDateTime():Date{return this._startedDateTime;}

    public getcurrentStep():Workflow_Step{return this._currentStep === undefined ? new Workflow_Step() : this._currentStep;}

    private generateid():string{
        let da = new Date();
        let id = String(da.getHours()) +  String(da.getMinutes()) + String(da.getSeconds());
        return id;
    }

    public async start(){
        ConsoleLogger.logDebug(`starte Workflow mit ID ${this._id}`);
        //TODO: debug, welcher workflow nimmt die message, oder wird einer gestartet
        let Face_Exists_Response:any;
        try {Face_Exists_Response = await faceExists()}
        catch(error){ console.log(error); return; }

        //Patient nicht bekannt
        if(Face_Exists_Response.result == false){
            console.log('Gesicht nicht bekannt. Neuer Patient wird angelegt');
            Workflow_Queue.sendMessage(this,fixedValues.websocket_smartphoneID,SM_Face_UnknownPatient());
            //TODO:start Unknown Workflow
            // PatientAnlegen();
        }

        //Patient bekannt
        if(Face_Exists_Response.result == true){
            console.log('Das Gesicht ist bereits bekannt');

            //Ist der Filename eine Number? (für spätere Überprüfung ob es eine gültige ID in der DB ist)
            //TODO: Was wenn keine BildID mitgeschickt wird
            if(Face_Exists_Response.filename === undefined)
            {
            console.log('Gesichtserkennung hat keine Eigenschaft filename in der JSON Nachricht');
            Workflow_Queue.sendMessage(this,fixedValues.websocket_gesichtserkennungID,GE_Failure('Keine filename Eigenschaft in der Nachricht vorhanden'));
            return;
            }
            if(Face_Exists_Response.filename.endsWith('.jpeg') || Face_Exists_Response.filename.endsWith('.png'))
            {
            Face_Exists_Response.filename = Face_Exists_Response.filename.split('.')[0];
            }

            if(isNaN(Number(Face_Exists_Response.filename)))
            {
            console.log('Gesichtserkennung hat keine gültige ID zurückgegeben');
            Workflow_Queue.sendMessage(this,fixedValues.websocket_gesichtserkennungID,GE_Failure('Ungültige filename Eigenschaft in der Nachricht. Der Filename konnte nicht in einen numerischen Wert umgewandelt werden'));
            return;
            }

            // try{
            if(await HasAppointment(Face_Exists_Response.filename) == true)
            {
                console.log('With_Appointment_Workflow')
                let wf = new With_Appointment_Workflow(0,fixedValues.websocket_gesichtserkennungID,Face_Exists_Response);
                Workflow_Queue.queue.push(wf);
                //TODO:start With Workflow
            }
            else
            {
                //TODO:start Without Workflow
            }
            // }
            // catch
            // {}
            // }

        }
    }

}
