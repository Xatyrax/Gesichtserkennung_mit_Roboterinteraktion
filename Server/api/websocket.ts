import {WebSocketServer} from 'ws';
import {ConsoleLogger} from '../classes/ConsoleLogger';
import {Type_Validations} from '../classes/Type_Validations';
import fixedValues from '../phandam_modules/config';
import {smartphone_wscom} from './websocket_client_actions';
import {clients,clients_lastmessage,sendToClient, getLastMessage } from './websocket_modules';
import {Workflow_Queue} from '../classes/Workflow_Queue';
import {Workflow_Actions} from '../classes/Workflow_Actions';


export async function startWebsocketServer(){

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws) => {

    console.log('Neuer Client verbunden');

    //Begrüßungsnachricht
    ws.send('Erfolgreich mit Server verbunden');

    //Trigger für den Eingang von Nachrichten
    ws.on('message', (message:string) => {

        //Prüfen ob der Client sich als Smartphone identifiziert
        if(`${message}` == fixedValues.websocket_smartphoneID)
        {
            //ClientID (für spätere Identifikation des Clients) vergeben
            clients.set(fixedValues.websocket_smartphoneID,ws);
            ws.send('Hallo Smartphone');
        }
        else if(`${message}` == fixedValues.websocket_gesichtserkennungID)
        {
            //ClientID (für spätere Identifikation des Clients) vergeben
            clients.set(fixedValues.websocket_gesichtserkennungID,ws);
            ws.send('Hallo Gesichtserkennung');
        }
        else if(`${message}` == fixedValues.websocket_spracherkennungID)
        {
            //ClientID (für spätere Identifikation des Clients) vergeben
            clients.set(fixedValues.websocket_spracherkennungID,ws);
            ws.send('Hallo Spracherkennung');
        }
        else if(`${message}` == fixedValues.websocket_RoboterID)
        {
            //ClientID (für spätere Identifikation des Clients) vergeben
            clients.set(fixedValues.websocket_RoboterID,ws);
            ws.send('Hallo Wall-E');
        }

        const matchingKeys = [];

        for (const [key, value] of clients.entries()) {
            if (value === ws) {
                matchingKeys.push(key);
            }
        }

        if(matchingKeys[0]){
            if(matchingKeys[0] == fixedValues.websocket_smartphoneID){
                recivedFormAuthenticatedClient(fixedValues.websocket_smartphoneID,message);
            }
            else if(matchingKeys[0] == fixedValues.websocket_gesichtserkennungID){
                recivedFormAuthenticatedClient(fixedValues.websocket_gesichtserkennungID,message);
            }
            else if(matchingKeys[0] == fixedValues.websocket_spracherkennungID){
                recivedFormAuthenticatedClient(fixedValues.websocket_spracherkennungID,message);
            }
            else if(matchingKeys[0] == fixedValues.websocket_RoboterID){
                recivedFormAuthenticatedClient(fixedValues.websocket_RoboterID,message);
            }
        }

    });

    // Trigger für das Schließen der Verbindung
    ws.on('close', () => {
        const smartphone = clients.get(fixedValues.websocket_smartphoneID);
        const gesichtserkennung = clients.get(fixedValues.websocket_gesichtserkennungID);
        const spracherkennung = clients.get(fixedValues.websocket_spracherkennungID);
        const roboter = clients.get(fixedValues.websocket_RoboterID);
        if(Type_Validations.isUndefined(typeof smartphone))
        {
            clients.delete(fixedValues.websocket_smartphoneID);
        }
        if(Type_Validations.isUndefined(typeof gesichtserkennung))
        {
            clients.delete(fixedValues.websocket_gesichtserkennungID);
        }
        if(Type_Validations.isUndefined(typeof spracherkennung))
        {
            clients.delete(fixedValues.websocket_spracherkennungID);
        }
        if(Type_Validations.isUndefined(typeof roboter))
        {
            clients.delete(fixedValues.websocket_RoboterID);
        }
        console.log('Client Verbindung getrennt');
    });
});

console.log('Websocket running on ws://localhost:3001');
}

function recivedFormAuthenticatedClient(id:string,message:string){

    //Log
    console.log(`Received From ${id}: ${message}`);

    //Smartphone
    if(id == fixedValues.websocket_smartphoneID){
        if(smartphone_wscom.IsMessageInit(message) == true) {smartphone_wscom.InitActions(message);}
        else {clients_lastmessage.set(fixedValues.websocket_smartphoneID,message);}
    }

    clients_lastmessage.set(id,message);

    //Workflow_Queue
    if(`${message}` != fixedValues.websocket_smartphoneID && `${message}` != fixedValues.websocket_gesichtserkennungID && `${message}` != fixedValues.websocket_spracherkennungID && `${message}` != fixedValues.websocket_RoboterID)
    {
        try{JSON.parse(message)}
        catch{ConsoleLogger.logWarning(`Die Nachricht ${message} ist kein gültiges JSON Format. Nachricht wird ignoriert.`); return;}
        Workflow_Actions.reciveMessage(id,JSON.parse(message));
    }
}
