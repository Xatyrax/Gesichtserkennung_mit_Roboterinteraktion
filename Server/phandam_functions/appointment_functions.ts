import fixedValues from '../phandam_modules/config';
import {ConsoleLogger} from '../classes/ConsoleLogger';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import { convertDateToUString } from '../phandam_modules/date_time_utils';

export async function getNextAppointment():Promise<Date>{
    return new Promise(async (resolve, reject) => {

        ConsoleLogger.logDebug(`Terminauswahl gestartet`);
        let now:Date = new Date();

        //Tage
        while(true) {
            let AppoinmentStartPointer:Date = new Date();
            let currentPointer:Date = new Date(now.getFullYear(),now.getMonth(),AppoinmentStartPointer.getDate(),fixedValues.OeffnungszeitVon,0,0);

            //Termine an dem Tag
            while (true){
                if(AppoinmentStartPointer.getHours() >= fixedValues.OeffnungszeitBis){break;ConsoleLogger.logDebug(`Alle Termine vergeben an dem Tag welchsele zum nächsten Tag`);}

                while (currentPointer < AppoinmentStartPointer)
                {
                    currentPointer = new Date(currentPointer.getTime() + fixedValues.TermindauerInMinuten * 60000); // + 1 Terminslot
                }

                let SelectCurrentTimeAppointment_Command = `SELECT AppointmentID FROM Appointments WHERE Start < '${convertDateToUString(currentPointer,true)}' AND End > '${convertDateToUString(currentPointer,true)}';`;
                let CurrentTimeAppointments:any = await sql_execute(SelectCurrentTimeAppointment_Command);
                if(CurrentTimeAppointments.length < 3)
                {
                    ConsoleLogger.logDebug(`Termin ausgewählt: ${currentPointer}`);
                    resolve(currentPointer);
                    return currentPointer;
                    ConsoleLogger.logDebug(`returned?`);
                }
                else
                {
                    ConsoleLogger.logDebug(`Alle Termine vergeben um: ${currentPointer}`);
                }

                AppoinmentStartPointer = new Date(AppoinmentStartPointer.getTime() + fixedValues.TermindauerInMinuten * 60000); // + 1 Terminslot
            }
            AppoinmentStartPointer.setDate(AppoinmentStartPointer.getDate() + 1); // + 1 Tag
        }
    });
}

export default {getNextAppointment};
