// import fixedValues from '../phandam_modules/config';
import {getLastMessage } from './websocket_modules';
import { sleep } from '../phandam_modules/timing_utils';

export async function waitForMessage(senderID:string, waitInSeconds:number):Promise<any | null>{
return new Promise(async (resolve, reject) => {
    for (let i = 0; i < waitInSeconds; i++) {
    try{
      let messageText = getLastMessage(senderID);
      let message = senderID + ': ' + messageText;
      // console.log(message);
      const parsedjson = JSON.parse(messageText);
      if(parsedjson.type != null)
      {
          resolve(parsedjson);
          break;
      }
    }catch{}
    await sleep();
  }
reject(null);
});
}
