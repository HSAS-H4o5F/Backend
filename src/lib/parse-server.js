// @ts-nocheck
import { ParseServer } from "parse-server";
import {
  apiPath,
  app,
  appId,
  appName,
  databaseURI,
  masterKey,
  serverURL,
} from "../app.js";

export async function startParseServer() {
  console.log("Starting Parse Server.");

  const server = new ParseServer({
    appId,
    appName,
    masterKey,
    serverURL,
    databaseURI,
    sessionLength: 7 * 24 * 60 * 60,
  });

  await server.start();

  app.use(apiPath, server.app);
}
