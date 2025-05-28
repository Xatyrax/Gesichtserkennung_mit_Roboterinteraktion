export class Type_Validations {
    static isUndefined(ToCheck:any): boolean {
        if(ToCheck === undefined)
        {
            return true;
        }
        else
        {
            return false;
        }
    }
    static isNummber(ToCheck:any): boolean {
        if(isNaN(Number(ToCheck)))
        {
            return false;
        }
        else
        {
            return true;
        }
    }
}
