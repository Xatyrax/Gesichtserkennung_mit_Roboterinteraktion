import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';

export async function isPatientenIDVorhanden(id:number):Promise<boolean>{
    return new Promise(async (resolve, reject) => {
    let command = `SELECT PatientID FROM Patients WHERE PatientID = ${id}`;
    let PatientsWithThisID:any = await sql_execute(command);
    if(PatientsWithThisID.length >= 1){resolve(true);}
    else {resolve(false);}
    });
}
