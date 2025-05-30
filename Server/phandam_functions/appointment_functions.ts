import fixedValues from '../phandam_modules/config';
import { sql_execute, sql_execute_write } from '../phandam_modules/db_utils';
import { convertDateToUString } from '../phandam_modules/date_time_utils';

export async function getNextAppointment():Promise<Date>{
    return new Promise(async (resolve, reject) => {
    let now:Date = new Date();
    //Termine emitteln
    // let Appoinments:any<Date>;
    now.setHours(fixedValues.OeffnungszeitVon);
    now.setMinutes(0);
    let TimePointer:Date = now;
    //TODO: Was wenn es nicht aufgeht, z.B. Termindauer 17 Min --> Startup Checks der Config? Verlassen darauf das Config datei richtig ist?
    let numberOfAppointments:number = ((fixedValues.OeffnungszeitBis - fixedValues.OeffnungszeitVon)*60)/fixedValues.TermindauerInMinuten
    for (let i = 0; i < numberOfAppointments; i++) {
        //TODO: Dateumwandlungsfunktion
        let AppointmentStart:string = convertDateToUString(TimePointer);

        //TODO: Was ist wenn die Stunde überläuft? wird die automatisch erhöht?
        TimePointer.setMinutes(TimePointer.getMinutes() + fixedValues.TermindauerInMinuten);
        // console.log('Neue Zeit: ' + String(TimePointer));

        TimePointer.setMinutes(TimePointer.getMinutes() + fixedValues.TermindauerInMinuten);
        let TimePointerEnd:Date = TimePointer;
        let AppointmentEnd:string = convertDateToUString(TimePointerEnd);

        let SelectCurrentTimeAppointment_Command = `SELECT AppointmentID FROM Appointments WHERE ('${AppointmentStart}' BETWEEN Start AND End) OR ('${AppointmentEnd}' BETWEEN Start AND End)`;
        let CurrentTimeAppointments:any = await sql_execute(SelectCurrentTimeAppointment_Command);

        //Return oder nächster Schleifendurchlauf
        if(CurrentTimeAppointments.length <= 3)
        {resolve(TimePointer);break;}

        TimePointer = TimePointerEnd;
    }
    });

    //TODO: Was wenn alle Termine an dem Tag belegt sind? nächster Tag?
}

export default {getNextAppointment};
