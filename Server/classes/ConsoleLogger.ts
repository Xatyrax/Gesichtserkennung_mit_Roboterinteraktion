export class ConsoleLogger{
    public static logDebug(message:string):void{
        console.log('Debug - ' + message);
    }
    public static logError(message:string):void{
        console.log('ERORR - ' + message);
    }
}
