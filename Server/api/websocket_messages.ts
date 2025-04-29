/*****************
*   Smartphone   *
******************/

//Kown Patient
export function SM_Face_KnownPatient(withAppointment:string):string{return `{"type":"Known_Customer", "Appointment":"${withAppointment}"}`;}
export function SM_Face_KnownPatient_WithAppointment():string{return SM_Face_KnownPatient("TRUE");}
export function SM_Face_KnownPatient_WithoutAppointment():string{return SM_Face_KnownPatient("FALSE");}

//Unkown Patient
export function SM_Face_UnknownPatient():string{return `{"type":"Unknown_Customer"}`;}

//Smartphone Timeout
export function SM_Face_Timeout():string{return `{"type":"Timeout"}`;}

// Für das Smartphone nicht wichtig, es bekommt nur eine With Appointment message, damit der Fall für das Smartphone abgeschlossen ist.
//export function SM_Face_KnownPatient_WithShortlyAppointment(){}

/**************
*   Gesicht   *
***************/



/**************
*   Sprache   *
***************/



/**************
*   Roboter   *
***************/
export function DriveToTarget(target:string):string
{
let arrTarget:string;

          switch (target) {
            case 'W':
                arrTarget = '[1,0,0,0]';
            case 'B1':
                arrTarget = '[0,1,0,0]'
            case 'B2':
                arrTarget = '[0,0,1,0]'
            case 'B3':
                arrTarget = '[0,0,0,1]'
            default:
              return 'Error';
          }
          return `{"Type": "DRIVE_TO_ROOM", "Target":"${arrTarget}"}`;
}
export function DriveToBase():string{return '{"Type": "DRIVE_TO_BASE"}';}
export function DriveToPickUpPatient():string{return '{"Type": "PICK_PATIENT"}';}

/*************
*   Export   *
**************/

export default {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,DriveToTarget,DriveToBase,DriveToPickUpPatient};
