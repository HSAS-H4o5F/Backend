import express from "express";
import { app, appPath } from "../app.js";

export function startAppServer() {
  console.log(`Server will use ${appPath} as web app's root path.`);

  app.use("/", express.static(appPath));
}
