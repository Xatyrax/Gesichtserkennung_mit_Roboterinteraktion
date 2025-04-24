/*****************
*   Smartphone   *
******************/

//Kown Patient
function SM_Face_KnownPatient(withAppointment:string):string{return `{"type":"Known_Customer", "Appointment":"${withAppointment}"}`;}
export function SM_Face_KnownPatient_WithAppointment():string{return SM_Face_KnownPatient("TRUE");}
export function SM_Face_KnownPatient_WithoutAppointment():string{return SM_Face_KnownPatient("FALSE");}

//Unkown Patient
export function SM_Face_UnknownPatient():string{return `{"type":"Unknown_Customer"}`;}

//Smartphone Timeout
export function SM_Face_Timeout():string{return `{"type":"Timeout"}`;}

export default {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment};


// Für das Smartphone nicht wichtig, es bekommt nur eine With Appointment message, damit der Fall für das Smartphone abgeschlossen ist.
//export function SM_Face_KnownPatient_WithShortlyAppointment(){}
