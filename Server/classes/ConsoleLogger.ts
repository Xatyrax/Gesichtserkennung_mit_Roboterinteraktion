export class ConsoleLogger{
    public static logDebug(message:string):void{
        console.log('\x1b[34m%s\x1b[0m', 'Debug - ' + message);
    }
    public static logDebugNeutral(message:string):void{
        console.log(message);
    }
    public static logWarning(message:string):void{
        console.log('\x1b[33m%s\x1b[0m', 'Warning - ' + message);
    }
    public static logError(message:string):void{
        console.log('\x1b[31m%s\x1b[0m', 'ERORR - ' + message);
    }
}
