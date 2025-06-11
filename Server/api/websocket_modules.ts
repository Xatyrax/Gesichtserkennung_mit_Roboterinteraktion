import { WebSocketServer, WebSocket } from 'ws';
import fixedValues from '../phandam_modules/config';
import {ConsoleLogger} from '../classes/ConsoleLogger';

export const clients = new Map();
export const clients_lastmessage = new Map([
    [fixedValues.websocket_smartphoneID,''],
    [fixedValues.websocket_gesichtserkennungID,''],
    [fixedValues.websocket_spracherkennungID,''],
    [fixedValues.websocket_RoboterID,'']
]);

//"UDP" (fire and forget)
export function sendToClient(id:string, data:string):void {

    const client = clients.get(id);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(data);
        ConsoleLogger.logDebugNeutral(`Sende an ${id}: ${data}`);
    }
    else
    {
        ConsoleLogger.logWarning(`Nachricht an ${id} nicht versendet, weil der Client nicht verbunden oder empfangsbereit ist`);
    }
}

//"TCP"
export function sendToClientWithConfirmation(id:string, data:string):boolean {

    const client = clients.get(id);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(data);
        ConsoleLogger.logDebugNeutral(`Sende an ${id}: ${data}`);
        return true;
    }
    else
    {
        ConsoleLogger.logWarning(`Nachricht an ${id} nicht versendet, weil der Client nicht verbunden oder empfangsbereit ist`);
        return false;
    }
}

export function getLastMessage(id:string):string {
    let message = clients_lastmessage.get(id);
    let ret = fixedValues.NotUsedVariableString;
    if(message){
        ret = message;
    }
    clients_lastmessage.set(id,fixedValues.NotUsedVariableString);
    return ret;
}
