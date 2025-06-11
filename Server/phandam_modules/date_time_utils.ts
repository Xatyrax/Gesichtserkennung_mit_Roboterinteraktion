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

export function convertDateToSmartphoneDate(date:Date): string {
    let Year = date.getFullYear();
    let Month = `${date.getMonth() + 1}`.padStart(2, '0');
    let Day = `${date.getDate()}`.padStart(2, '0');
    return `${Day}.${Month}.${Year}`;
}

export function convertDateToSmartphoneTime(date:Date): string {
    let Hour = `${date.getHours()}`.padStart(2, '0');
    let Minute = `${date.getMinutes()}`.padStart(2, '0');
    return `${Hour}:${Minute}`;
}

export function convertDateToWeekdayShortform(date:Date): string {
    const weekdays = ['so', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
    return weekdays[date.getDay()];
}
