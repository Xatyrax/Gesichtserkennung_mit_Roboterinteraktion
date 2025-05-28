import {WebSocketServer} from 'ws';
// import { Server } from 'http';
import fixedValues from '../phandam_modules/config';
import {smartphone_wscom} from './websocket_client_actions';
import {clients,clients_lastmessage,sendToClient, getLastMessage } from './websocket_modules';
// import {Workflow} from '../classes/Workflow';
import {With_Appointment_Workflow} from '../classes/With_Appointment_Workflow';
import {Workflow_Queue} from '../classes/Workflow_Queue';

export async function startWebsocketServer(){

let wf:With_Appointment_Workflow = new With_Appointment_Workflow(1,'',''); //keine funktionale Wirkung, aber nötig da sonst Workflow erst nach dem Websocket importiert wird

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws) => {

    console.log('Neuer Client verbunden');

    //Begrüßungsnachricht
    ws.send('Erfolgreich mit Server verbunden');

    //Trigger für den Eingang von Nachrichten
    ws.on('message', (message:string) => {

        //Debug

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
                recivedFormAuthenticatedClient(fixedValues.websocket_smartphoneID,message);
                // console.log(`Received From ${fixedValues.websocket_smartphoneID}: ${message}`);
                // if(smartphone_wscom.IsMessageInit(message) == true)
                // {
                //     smartphone_wscom.InitActions(message);
                // }
                // else
                // {
                //     clients_lastmessage.set(fixedValues.websocket_smartphoneID,message);
                // }
            }
            else if(matchingKeys[0] == fixedValues.websocket_gesichtserkennungID){
                recivedFormAuthenticatedClient(fixedValues.websocket_gesichtserkennungID,message);
                // console.log(`Received From ${fixedValues.websocket_gesichtserkennungID}: ${message}`);
                // clients_lastmessage.set(fixedValues.websocket_gesichtserkennungID,message);
            }
            else if(matchingKeys[0] == fixedValues.websocket_spracherkennungID){
                recivedFormAuthenticatedClient(fixedValues.websocket_spracherkennungID,message);
                // console.log(`Received From ${fixedValues.websocket_spracherkennungID}: ${message}`);
                // clients_lastmessage.set(fixedValues.websocket_spracherkennungID,message);
            }
            else if(matchingKeys[0] == fixedValues.websocket_RoboterID){
                recivedFormAuthenticatedClient(fixedValues.websocket_RoboterID,message);
                // console.log(`Received From ${fixedValues.websocket_RoboterID}: ${message}`);
                // clients_lastmessage.set(fixedValues.websocket_RoboterID,message);
            }
            else
            {
                console.log(`Received From Unknown Client: ${message}`);
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

console.log('Websocket running on ws://localhost:3001');
}

function recivedFormAuthenticatedClient(id:string,message:string){

    console.log(`Received From ${id}: ${message}`);

    if(id == fixedValues.websocket_smartphoneID){
        if(smartphone_wscom.IsMessageInit(message) == true)
        {
            smartphone_wscom.InitActions(message);
        }
        else
        {
            clients_lastmessage.set(fixedValues.websocket_smartphoneID,message);
        }
    }

    clients_lastmessage.set(id,message);

    if(`${message}` != fixedValues.websocket_smartphoneID && `${message}` != fixedValues.websocket_gesichtserkennungID && `${message}` != fixedValues.websocket_spracherkennungID && `${message}` != fixedValues.websocket_RoboterID)
    {
    // let wf = new With_Appointment_Workflow(0);
    Workflow_Queue.reciveMessage(id,JSON.parse(message));
    }
}

// export default wss;
