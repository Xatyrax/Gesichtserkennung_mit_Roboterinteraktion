// import express,{ Request, Response } from 'express';
// import session from 'express-session';
import fixedValues from '../phandam_modules/config';

export function validateUserInputs(starttime:Date,endtime:Date,sex:string|null,firstname:string, lastname:string, birthday:Date, phone:string|null,mail:string|null):string|null{

    if(String(starttime) == 'Invalid Date')
    {return "Ungültige Startzeit";}
    if(starttime.getHours() < fixedValues.OeffnungszeitVon)
    {return "Terminbeginn liegt vor der Öffnungszeit";}

    if(String(endtime) == 'Invalid Date')
    {return "Ungültige Endzeit";}
    if(endtime.getHours() >= fixedValues.OeffnungszeitBis)
    {return "Terminende liegt nach der Schließungszeit";}

    if(firstname == '')
    {return "Vorname darf nicht leer sein!";}

    if(lastname == '')
    {return "Nachname darf nicht leer sein!";}

    if(String(birthday) == 'Invalid Date')
    {return "Geburtstag darf nicht leer sein!";}


    if(starttime.getHours() < fixedValues.OeffnungszeitVon)
    {return "Terminbeginn liegt vor der Öffnungszeit";}

    if(endtime.getHours() >= fixedValues.OeffnungszeitBis)
    {return "Terminende liegt nach der Schließungszeit";}

    if(starttime >= endtime)
    {return "Die Endzeit des Termins muss nach der Startzeit liegen!";}

    if(sex != null)
    {
        if((sex as string) !== 'M' || (sex as string) !== 'W' || (sex as string) !== 'D')
        {return "Das Geschlecht muss M, W oder D sein oder leer gelassen werden!";}
    }

    if(birthday > new Date())
    {return "Der Geburtstag darf nicht nach dem heutigen Tag liegen";}

    return null;
    //TODO: Andere Fehlerprüfungen. Regex?

}
