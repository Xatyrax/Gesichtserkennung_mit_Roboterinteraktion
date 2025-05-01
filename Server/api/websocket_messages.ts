import fixedValues from '../phandam_modules/config';

/*****************
*   Smartphone   *
******************/

//Kown Patient
export function SM_Face_KnownPatient(withAppointment:string):string{return `{"type":"Known_Customer", "Appointment":"${withAppointment}"}`;}
//Debug: 0
export function SM_Face_KnownPatient_WithAppointment():string{return SM_Face_KnownPatient("TRUE");}
//Debug: 1
export function SM_Face_KnownPatient_WithoutAppointment():string{return SM_Face_KnownPatient("FALSE");}

//Unkown Patient (Debug: 2)
export function SM_Face_UnknownPatient():string{return `{"type":"Unknown_Customer"}`;}

//Smartphone Timeout (Debug: 3)
export function SM_Face_Timeout():string{return `{"type":"Timeout"}`;}

//Smartphone Timeout (Debug: 4)
export function SM_Audio_GenerationSuccess():string{return `{"type":"AUDIO_GENERATION_REQUEST_SUCCESS"}`;}
//Smartphone Timeout (Debug: 5)
export function SM_Audio_GenerationFailure(fehlermeldung: string):string{return `{"type":"AUDIO_GENERATION_REQUEST_FAILURE", "message":"${fehlermeldung}"}`;}

// Für das Smartphone nicht wichtig, es bekommt nur eine With Appointment message, damit der Fall für das Smartphone abgeschlossen ist.
//export function SM_Face_KnownPatient_WithShortlyAppointment(){}

/**************
*   Gesicht   *
***************/



/**************
*   Sprache   *
***************/
export function SP_Audio_Genaration_Request(text:string):string{return `{"type":"GENERATE_AUDIO_REQUEST","message": {"fileName":"${fixedValues.generierteAudio_dateiname}","text":"${text}"}}`;}


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

//export default;

export default {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure};
