import { WebSocketServer, WebSocket } from 'ws';
import fixedValues from '../phandam_modules/config';
import {smartphone_wscom} from './websocket_client_actions';
import {clients,clients_lastmessage,sendToClient, getLastMessage } from './websocket_modules';

const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws:WebSocket) => {

    console.log('Neuer Client verbunden');

    //Begrüßungsnachricht
    ws.send('Erfolgreich mit Server verbunden');

    //Trigger für den Eingang von Nachrichten
    ws.on('message', (message:string) => {

        //Debug
        //console.log(`Received: ${message}`);
        //ws.send(`Echo: ${message}`);

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

        //const websocket_object = Array.from(clients.entries())[1];

        const matchingKeys = [];

        for (const [key, value] of clients.entries()) {
            if (value === ws) {
                matchingKeys.push(key);
            }
        }

        if(matchingKeys[0]){
            if(matchingKeys[0] == fixedValues.websocket_smartphoneID){
                if(smartphone_wscom.IsMessageInit(message) == true)
                {
                    smartphone_wscom.InitActions(message);
                }
                else
                {
                    clients_lastmessage.set(fixedValues.websocket_smartphoneID,message);
                }
            }
            else if(matchingKeys[0] == fixedValues.websocket_gesichtserkennungID){
                clients_lastmessage.set(fixedValues.websocket_gesichtserkennungID,message);
            }
            else if(matchingKeys[0] == fixedValues.websocket_spracherkennungID){
                clients_lastmessage.set(fixedValues.websocket_spracherkennungID,message);
            }
            else if(matchingKeys[0] == fixedValues.websocket_RoboterID){
                clients_lastmessage.set(fixedValues.websocket_RoboterID,message);
            }
        }

    });

    // Trigger für das Schließen der Verbindung
    ws.on('close', () => {
        const smartphone = clients.get(fixedValues.websocket_smartphoneID);
        const gesichtserkennung = clients.get(fixedValues.websocket_gesichtserkennungID);
        const spracherkennung = clients.get(fixedValues.websocket_spracherkennungID);
        const roboter = clients.get(fixedValues.websocket_RoboterID);
        if(typeof smartphone !== 'undefined')
        {
            clients.delete(fixedValues.websocket_smartphoneID);
        }
        if(typeof gesichtserkennung !== 'undefined')
        {
            clients.delete(fixedValues.websocket_gesichtserkennungID);
        }
        if(typeof spracherkennung !== 'undefined')
        {
            clients.delete(fixedValues.websocket_spracherkennungID);
        }
        if(typeof roboter !== 'undefined')
        {
            clients.delete(fixedValues.websocket_RoboterID);
        }
        console.log('Client Verbindung getrennt');
    });
});

export default wss;

console.log('Websocket running on ws://localhost:3001');
