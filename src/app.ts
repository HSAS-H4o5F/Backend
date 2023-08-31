import express from "express";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";
import { startMongod } from "./lib/mongod.js";
import { startParseServer } from "./lib/parse-server.js";
import { startParseDashboard } from "./lib/parse-dashboard.js";
import { startFeedServer } from "./lib/feed-server.js";
import { startAppServer } from "./lib/app-server.js";
import { recursiveMkdirSync } from "./utils/mkdir.js";
import cors from "cors";
import { startFaceServer } from "./lib/face-server.js";

export const projectPath = resolve(fileURLToPath(import.meta.url), "..", "..");
export const dbPath = resolve(projectPath, "db", "data");
export const PythonPath = resolve(projectPath, "python");
export const resPath = resolve(projectPath, "res");
export const schemaPath = resolve(resPath, "schema");

export const {
  values: { databasePort, serverPort, noMongod, mongodPath },
} = parseArgs({
  options: {
    databasePort: {
      type: "string",
      short: "d",
      default: "2007",
    },
    serverPort: {
      type: "string",
      short: "s",
      default: "1337",
    },
    noMongod: {
      type: "boolean",
      short: "n",
      default: false,
    },
    mongodPath: {
      type: "string",
      default: "mongod",
    },
  },
});

export const appId = "smartCommunity";
export const appName = "Smart Community";
export const masterKey = "hsasSmartCommunity";

export const apiPath = "/api";
export const dashPath = "/dash";
export const databaseURI = `mongodb://127.0.0.1:${databasePort}${apiPath}`;
export const serverURL = `http://127.0.0.1:${serverPort}${apiPath}`;

export const appPath = resolve(projectPath, "../APP/build/web");

export const app = express();
export const server = app.listen(serverPort);

app.use(
  cors({
    origin: "*",
  })
);

recursiveMkdirSync(dbPath);
recursiveMkdirSync(resPath);
recursiveMkdirSync(schemaPath);

await startMongod();

await startParseServer();

startParseDashboard();

startFaceServer();

startFeedServer();

startAppServer();

console.log(`Server running on port ${serverPort}.`);
