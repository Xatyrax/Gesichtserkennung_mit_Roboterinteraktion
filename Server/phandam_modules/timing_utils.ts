export async function sleep():Promise<any>;
export async function sleep(seconds:number):Promise<any>;

export async function sleep(seconds?:number) {
  let secondsToWait:number = seconds ?? 1;
    await new Promise(resolve => setTimeout(resolve, secondsToWait*1000));
}
