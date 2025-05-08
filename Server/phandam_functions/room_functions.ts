import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';

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
    {sqlcommand = "Update Rooms set Free = 1 WHERE RoomID = ?";}
    else
    {sqlcommand = "Update Rooms set Free = 0 WHERE RoomID = ?";}

    let data = [roomID];
    await sql_execute_write(sqlcommand,data);

}
