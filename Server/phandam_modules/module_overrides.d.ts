import "express-session";

declare module "express-session" {
  interface SessionData {
    eventid: string;
    date: string;
    time: string;
    weekdate: Date;
    datetime: Date;
  }
}
