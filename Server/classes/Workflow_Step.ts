export class Workflow_Step{
    private _name:string = 'test';

    private _expectedSender:string|null;
    private _expectedMessageType:string|null;
    public nextStep:Workflow_Step|undefined;

    constructor();
    constructor(name:string);
    constructor(name:string,expectedSender:string|null,expectedMessageType:string|null);
    constructor(name?:string,expectedSender?:string|null,expectedMessageType?:string|null){
        this._name = name ?? '';
        this._expectedSender = expectedSender ?? null;
        this._expectedMessageType = expectedMessageType ?? null;

        this.testexecute = () => {return true;};
        this.execute = () => {};
    }

    testexecute:(sender:string,message:any) => boolean;
    execute:(sender:string,message:any) => void;

    public getName():string{return this._name;}

    public getExpectedSender():string|null{return this._expectedSender;}
    public getExpectedMessageType():string|null{return this._expectedMessageType;}


}
