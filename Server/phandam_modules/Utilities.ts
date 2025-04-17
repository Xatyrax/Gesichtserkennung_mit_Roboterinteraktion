const mysql = require('mysql2');
import { QueryError } from 'mysql2';
const db_connection = require('./dbConnect.js');

  export function sql_execute(command: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      db_connection.query(command, (err: QueryError | null, result: any) => {
      if (err) {
        reject(err.message);
      }
      else{
        resolve(result);
      }
    });
      });
  }

