import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import {TakePatientFromWatingRoom} from '../api/websocket_client_actions';
import {Workflow_Starter} from '../classes/Workflow_Starter';

export async function GetAllRooms():Promise<any>{
    return new Promise(async (resolve, reject) => {
        let RaumDaten:any = await sql_execute(`SELECT RoomID, RoomName, Free FROM Rooms;`);
        for (let i = 0; i < RaumDaten.length; i++) {
            let Roomstatus:number = JSON.parse(JSON.stringify(RaumDaten[i].Free)).data;
            RaumDaten[i].Free = Roomstatus == 1 ? true : false;
        }
        resolve(RaumDaten);
    });
}

export async function GetRoomByID(roomID:number):Promise<any>{
    return new Promise(async (resolve, reject) => {
    let RaumDaten:any = await sql_execute(`SELECT RoomID, RoomName, Free FROM Rooms WHERE RoomID = ${roomID};`);
    let Roomstatus:number = JSON.parse(JSON.stringify(RaumDaten[0].Free)).data;
    RaumDaten[0].Free = Roomstatus == 1 ? true : false;
    resolve(RaumDaten);
    });
}

export async function SetRoomStatus(roomID:number,Free:Boolean){

    let sqlcommand:string = '';

    if(Free == true)
    {
        sqlcommand = "Update Rooms set Free = 1 WHERE RoomID = ?";

        let PatientenID:any = await sql_execute(`SELECT PatientID FROM Patients_Rooms as PR Join Rooms as R WHERE R.RoomKey = 'W';`);
        if(PatientenID.length > 0)
        {
            Workflow_Starter.tryStartPickFromWatingroom();
            // return; //Damit der Raum nicht freigegeben wird
        }
        // PatientFromWatingroom();
    }
    else
    {sqlcommand = "Update Rooms set Free = 0 WHERE RoomID = ?";}

    let data = [roomID];
    await sql_execute_write(sqlcommand,data);

}

async function PatientFromWatingroom(){
// return new Promise(async (resolve, reject) => {
    let PatientenID:any = await sql_execute(`SELECT PatientID FROM Patients_Rooms as PR Join Rooms as R WHERE R.RoomKey = 'W';`);

    if(PatientenID.length <= 0) {return;}

    let PatientHolenErfolgreich:Boolean = await TakePatientFromWatingRoom(PatientenID[0].PatientenID);
    if(PatientHolenErfolgreich == false)
    {
        console.log('Patient konnte nicht aus Wartezimmer geholt werden');
        //TODO: Zum Vermeiden von Datenbankleichen kein Return. Evtl. Wiederholen?
    }

    let sqlcommand:string = 'DELETE FROM Patients_Rooms WHERE PatientID = ?';
    let data = [PatientenID[0].PatientenID];
    await sql_execute_write(sqlcommand,data);

    // resolve(true);
// });
}
