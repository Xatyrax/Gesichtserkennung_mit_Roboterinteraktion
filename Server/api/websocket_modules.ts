import { WebSocketServer, WebSocket } from 'ws';
import fixedValues from '../phandam_modules/config';

export const clients = new Map();
export const clients_lastmessage = new Map([
    [fixedValues.websocket_smartphoneID,''],
    [fixedValues.websocket_gesichtserkennungID,''],
    [fixedValues.websocket_spracherkennungID,''],
    [fixedValues.websocket_RoboterID,'']
]);

export function sendToClient(id:string, data:string) {

    const client = clients.get(id);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(data);
        console.log(`Send to ${id}: ${data}`);
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

// export default {clients, clients_lastmessage};
