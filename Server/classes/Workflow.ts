import {ConsoleLogger} from './ConsoleLogger';
// import fixedValues from '../phandam_modules/config';
import {Workflow_Queue} from './Workflow_Queue';
import {Workflow_Step} from './Workflow_Step';
import {faceExists,HasAppointment} from '../api/websocket_client_actions';
// import {With_Appointment_Workflow} from './With_Appointment_Workflow';
import {Type_Validations} from './Type_Validations';

export abstract class Workflow{
    protected _id : string;
    protected _timeoutTimer : number;
    protected _startedDateTime:Date;
    protected _currentStep : Workflow_Step;
    protected _WorkflowSteps : Workflow_Step[]|undefined;

    constructor(timeoutTimer:number){
        this._id = this.generateid();
        ConsoleLogger.logDebug(`erstelle Workflow mit ID ${this._id}`);
        this._timeoutTimer = timeoutTimer;
        this._startedDateTime = new Date();
        this._currentStep = new Workflow_Step();

    }

    //TODO:Workflowstep ist überprüfen welcher spezifische Workflow benötigt wird
    public next():void
    {
        if(Type_Validations.isUndefined(this._currentStep.nextStep))
        {
            ConsoleLogger.logDebug(`Workflow ${this._id} hat keine weiteren Schritte`);
            Workflow_Queue.ShutdownWorkflow(this._id);
            return;
        }
        else
        {
            this._currentStep = this._currentStep.nextStep as Workflow_Step;
        }
    };

    protected abstract createWorkflowsteps():Workflow_Step[];

    public getid(){return this._id;}

    public getstartedDateTime():Date{return this._startedDateTime;}

    public getcurrentStep():Workflow_Step{return this._currentStep;}

    private generateid():string{
        let da = new Date();
        let id = String(da.getHours()) +  String(da.getMinutes()) + String(da.getSeconds());
        return id;
    }
}
