import { spawn } from "child_process";
import { databasePort, dbPath, mongodPath, noMongod } from "../app.js";

interface MongodLog {
  t: {
    $date: string;
  };
  s: string;
  c: string;
  id: number;
  ctx: string;
  msg: string;
  attr: any | undefined;
  tags: string[] | undefined;
  truncated: any | undefined;
  size: number | undefined;
}

function splitLogs(data: Buffer, callback: (log: string) => void) {
  data
    .toString("utf8")
    .split("\n")
    .forEach((log) => {
      if (log) {
        callback(log);
      }
    });
}

export function startMongod(): Promise<void> {
  if (!noMongod) {
    console.log("Starting MongoDB.");

    const mongod = spawn(mongodPath!, [
      "--dbpath",
      dbPath,
      "--port",
      databasePort!,
    ]);

    mongod.stdout.on("data", (data) => {
      splitLogs(data, (log) => {
        console.log(`MongoDB stdout: ${log}`);
      });
    });

    mongod.stderr.on("data", (data) => {
      splitLogs(data, (log) => {
        console.log(`MongoDB stderr: ${log}`);
      });
    });

    mongod.on("message", (message, _sendHandle) => {
      console.log(`MongoDB message: ${message}`);
    });

    mongod.on("close", (code, signal) => {
      console.error(`MongoDB exited with code ${code}, signal ${signal}.`);
      process.exit(1);
    });

    mongod.on("error", (err) => {
      console.error(`MongoDB error: ${err}`);
      process.exit(1);
    });

    return new Promise((resolve, _reject) => {
      const listener = (data: Buffer) => {
        splitLogs(data, (log) => {
          const jsonLog: MongodLog = JSON.parse(log);
          if (jsonLog.id == 23016) {
            console.log("Started mongod.");
            mongod.stdout.removeListener("data", listener);
            resolve();
          }
        });
      };
      mongod.stdout.on("data", listener);
    });
  } else {
    console.log("MongoDB will not be started.");
    return Promise.resolve();
  }
}
