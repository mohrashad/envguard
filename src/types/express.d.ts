import * as express from  "express";
import { ParsedEnv } from "envguard";

declare global {
  namespace Express {
    interface Request {
      env: ParsedEnv;
    }
  }
}

export {}