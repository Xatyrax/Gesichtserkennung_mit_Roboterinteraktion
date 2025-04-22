import { sleep } from './timing_utils';
import fixedValues from './config';
import { sql_execute, sql_execute_write } from './db_utils';
import { convertDateToUString } from './date_time_utils';

export async function StartBackgroudActions(){
    while(true){
        //TODO: Tasks

        let newDate = new Date();
        newDate.setMinutes(newDate.getMinutes() - fixedValues.MaximaleVerspaetungsDauerInMinuten);
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);
        let MaxAcceptedAppointmentTime:string = convertDateToUString(newDate, true);

        let verspaeteteTermine = await sql_execute(`Select AppointmentID From Appointments WHERE Start < '${MaxAcceptedAppointmentTime}'`);

        verspaeteteTermine.forEach((termin:any) => {
            let data = [termin.AppointmentID];
            let command = "Delete from Appointments Where AppointmentID = ?";
            sql_execute_write(command,data);
        });

        await sleep(10);
    }
}
