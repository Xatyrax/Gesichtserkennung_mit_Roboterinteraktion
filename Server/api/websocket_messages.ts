import fixedValues from '../phandam_modules/config';

/*****************
*   Smartphone   *
******************/

//Kown Patient
export function SM_Face_KnownPatient(withAppointment:string):string{return `{"type":"KNOWN_CUSTOMER", "appointment":"${withAppointment}"}`;}
//Debug: 0
export function SM_Face_KnownPatient_WithAppointment():string{return SM_Face_KnownPatient("TRUE");}
//Debug: 1
export function SM_Face_KnownPatient_WithoutAppointment():string{return SM_Face_KnownPatient("FALSE");}

//Unkown Patient (Debug: 2)
export function SM_Face_UnknownPatient():string{return `{"type":"UNKNOWN_CUSTOMER"}`;}

//Smartphone Timeout (Debug: 3)
export function SM_Face_Timeout():string{return `{"type":"TIMEOUT"}`;}

//Smartphone Timeout (Debug: 4)
export function SM_Audio_GenerationSuccess():string{return `{"type":"AUDIO_GENERATION_REQUEST_SUCCESS"}`;}
//Smartphone Timeout (Debug: 5)
export function SM_Audio_GenerationFailure(fehlermeldung: string):string{return `{"type":"AUDIO_GENERATION_REQUEST_FAILURE", "message":"${fehlermeldung}"}`;}

export function SM_ReachedGoal(arrived:boolean):string{return `{"type":"ROBOT_REACHED_GOAL","success":"${arrived == true ? 'TRUE' : 'FALSE'}"}`;}

export function SM_Extract_From_Audio_Success():string{return `{"type":"EXTRACT_DATA_FROM_AUDIO_SUCCESS","message":"YES"}`;}

function SM_Extract_From_Audio_YesOrNo(response:boolean):string{return `{"type":"EXTRACT_DATA_FROM_AUDIO_SUCCESS","message":"${response == true ? 'YES' : 'NO'}"}`;}

export function SM_Extract_From_Audio_Yes():string{return SM_Extract_From_Audio_YesOrNo(true);}

export function SM_Extract_From_Audio_No():string{return SM_Extract_From_Audio_YesOrNo(false);}

export function SM_Extract_From_Audio_Success():string{return `{"type":"PHONE_IS_BACK"}`;}

export function SM_Failure(errorMessage:string):string{return `{"type":"FAILURE","message":"${errorMessage}"}`;}



// export function SM_Extract_From_Audio_No():string{return `{"type":"EXTRACT_DATA_FROM_AUDIO_SUCCESS","message":{"text":{"result":"No"}}`;}

export function SM_NextAppointment_Response(date:string,time:string,weekday:string):string{return `{"type":"NEXT_APPOINTMENT", "message":{"date":"${date}", "time":"${time}", "weekday":"${weekday}"}}`;}

export function SM_Persondata(firstname:string,lastname:string,sex:string,date_of_birth:string,phone_number:string,email_address:string):string{return `{ "type":"PERSON_DATA", "success":"success", "message":{"firstname":"${firstname}","lastname":"${lastname}","sex":"${sex}","date_of_birth":"${date_of_birth}","phone_number":"${phone_number}","email_address":"${email_address}"}}`;}


// Für das Smartphone nicht wichtig, es bekommt nur eine With Appointment message, damit der Fall für das Smartphone abgeschlossen ist.
//export function SM_Face_KnownPatient_WithShortlyAppointment(){}

/**************
*   Gesicht   *
***************/
//TODO: Verwendet???
export function GE_Does_Face_Exist():string{return `{"type": "AVALIBLE"}`;}
export function GE_New_Patient():string{return `{"action":"save"}`;}
export function GE_Failure(errorMessage:string):string{return `{"type":"FAILURE","message":"${errorMessage}"}`;}


/**************
*   Sprache   *
***************/
export function SP_Audio_Genaration_Request(text:string):string{return `{"type":"GENERATE_AUDIO_REQUEST","message": {"fileName":"${fixedValues.generierteAudio_dateiname}","text":"${text}"}}`;}
export function SP_Failure(errorMessage:string):string{return `{"type":"FAILURE","message":"${errorMessage}"}`;}

/**************
*   Roboter   *
***************/
export function DriveToTarget(target:string):string
{
    let arrTarget:string;
          switch (target) {
            case "W":
                arrTarget = '[1,0,0,0]';
                break;
            case "B1":
                arrTarget = '[0,1,0,0]';
                break;
            case "B2":
                arrTarget = '[0,0,1,0]';
                break;
            case "B3":
                arrTarget = '[0,0,0,1]';
                break;
            default:
              return 'Error';
          }
          return `{"Type": "DRIVE_TO_ROOM", "Target":"${arrTarget}"}`;
}
export function DriveToBase():string{return '{"Type": "DRIVE_TO_BASE"}';}
export function DriveToPickUpPatient():string{return '{"Type": "PICK_PATIENT"}';}
export function Ro_Failure(errorMessage:string):string{return `{"Type":"FAILURE","message":"${errorMessage}"}`;}

/*************
*   Export   *
**************/

//export default;

export default {SM_Face_UnknownPatient,SM_Face_KnownPatient_WithAppointment,SM_Face_KnownPatient_WithoutAppointment,DriveToTarget,DriveToBase,DriveToPickUpPatient,SP_Audio_Genaration_Request,SM_Audio_GenerationSuccess,SM_Audio_GenerationFailure,GE_Does_Face_Exist,SM_Face_Timeout,SM_Failure,SP_Failure,SM_Extract_From_Audio_Success,GE_New_Patient,SM_NextAppointment_Response,Ro_Failure,GE_Failure,SM_Persondata,SM_ReachedGoal,SM_Extract_From_Audio_Yes,SM_Extract_From_Audio_No};
