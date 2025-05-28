// import fixedValues from '../phandam_modules/config';
import {getLastMessage } from './websocket_modules';
import { sleep } from '../phandam_modules/timing_utils';

export async function waitForMessage(senderID:string, waitInSeconds:number):Promise<any | null>{
return new Promise(async (resolve, reject) => {
    await sleep()
    console.log("Waiting for message from: " + senderID)
    for (let i = 0; i < waitInSeconds; i++) {
        await sleep()
    try{
      let messageText = getLastMessage(senderID);
      let message = senderID + ': ' + messageText;
      // console.log(message);
      const parsedjson = JSON.parse(messageText);
      //TODO: event raus
      if(parsedjson.type != null || parsedjson.event != null)
      {
          resolve(parsedjson);
          break;
      }
    }catch{}
    await sleep();
    console.log('Nachricht verarbeitet')
  }
resolve(null);
});
}
