import "express-session";

declare module "express-session" {
  interface SessionData {
    date: string;
    time: string;
    datetime: Date;
  }
}
