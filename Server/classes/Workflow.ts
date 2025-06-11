import {ConsoleLogger} from './ConsoleLogger';
import fixedValues from '../phandam_modules/config';
import {Workflow_Queue} from './Workflow_Queue';
import {Workflow_Actions} from './Workflow_Actions';
import {Workflow_Step} from './Workflow_Step';
import {faceExists,HasAppointment} from '../api/websocket_client_actions';
import {Type_Validations} from './Type_Validations';
import {sleep} from '../phandam_modules/timing_utils';

export abstract class Workflow{
    protected _id : string;
    protected _timeoutTimer : number;
    protected _startedDateTime:Date;
    protected _currentStep : Workflow_Step;
    protected _WorkflowSteps : Workflow_Step[]|undefined;

    constructor(){
        this._id = this.generateid();
        ConsoleLogger.logDebug(`erstelle Workflow mit ID ${this._id}`);
        this._timeoutTimer = fixedValues.TimeoutWorkflow;
        this.startTimeoutHandler();
        this._startedDateTime = new Date();
        this._currentStep = new Workflow_Step();
    }

    public next():void
    {
        if(Type_Validations.isUndefined(this._currentStep.nextStep))
        {
            ConsoleLogger.logDebug(`Workflow ${this._id} hat keine weiteren Schritte`);
            Workflow_Actions.ShutdownWorkflow(this._id);
            return;
        }
        else
        {
            this._timeoutTimer = fixedValues.TimeoutWorkflow;
            this._currentStep = this._currentStep.nextStep as Workflow_Step;
        }
    };

    protected abstract createWorkflowsteps():Workflow_Step[];

    public getid(){return this._id;}

    public getstartedDateTime():Date{return this._startedDateTime;}

    public getcurrentStep():Workflow_Step{return this._currentStep;}

    public deactivateTimeout(){
        this._timeoutTimer = -1;
    }

    private generateid():string{
        let da = new Date();
        let id = String(da.getHours()) +  String(da.getMinutes()) + String(da.getSeconds());
        return id;
    }

    private async startTimeoutHandler():Promise<void>{
        while(this._timeoutTimer > 0)
        {
            this._timeoutTimer = this._timeoutTimer - 1;
            await sleep();
        }
        if(this._timeoutTimer == -1){return;}
        ConsoleLogger.logDebug(`Workflow ${this._id} Timeout abgelaufen. Beende Workflow`);
        Workflow_Actions.ShutdownWorkflow(this._id);
    }
}
