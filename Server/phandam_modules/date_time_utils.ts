//UString = YYYY-MM-DDTHH:MM

export function convertDateToUString(date:Date): string
export function convertDateToUString(date:Date, WithTime:Boolean): string

export function convertDateToUString(date:Date,WithTime?:Boolean): string {
    let boTime:Boolean = WithTime == undefined ? false : true;
    let Year = date.getFullYear();
    let Month = `${date.getMonth() + 1}`.padStart(2, '0');
    let Day = `${date.getDate()}`.padStart(2, '0');
    let Hour = `${date.getHours()}`.padStart(2, '0');
    let Minute = `${date.getMinutes()}`.padStart(2, '0');
    let UString = `${Year}-${Month}-${Day}T` + (boTime == true ? `${Hour}:${Minute}` : '00:00');
    return UString;
}
