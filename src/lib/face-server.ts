import { Server } from "socket.io";
import { PythonPath as pythonPath, server } from "../app.js";
import { pick } from "accept-language-parser";
import { PythonShell, Options } from "python-shell";
import { resolve } from "path";
import { EOL } from "os";

const version = "1";

const pyShellOptions: Options = {
  mode: "binary",
  pythonOptions: ["-u"],
};

export function startFaceServer() {
  const io = new Server(server, {
    path: "/face",
  });

  const facePath = resolve(pythonPath, "face");

  io.on("connection", (socket) => {
    const language =
      pick(
        Object.values(SupportedLanguage),
        socket.request.headers["accept-language"] ?? "zh",
        { loose: true }
      ) ?? SupportedLanguage.ZH;

    console.log(
      `A client from ${socket.request.headers["cf-connecting-ip"]} connected Face Server ` +
        `through ${socket.conn.remoteAddress}, id: ${socket.id}, requesting language: ${language}.`
    );

    const requestedVersion = socket.request.headers[RequestHeader.API_VERSION];

    if (requestedVersion != version) {
      socket.emit(Event.ERROR, Error.API_VERSION_MISMATCH.localize(language));
      socket.disconnect();
      return;
    }

    let py: PythonShell | null = null;

    socket.on("disconnect", () => {
      console.log(`Client ${socket.id} disconnected Face Server.`);
      py?.kill();
    });

    socket.on(Event.REQUEST, (data: FaceRequest) => {
      if (typeof data != "object") {
        console.log(
          `${socket.id} sent invalid type of request: ${typeof data}.`
        );
        socket.emit(Event.ERROR, Error.TYPE_ERROR.localize(language));
        return;
      }

      if (py != null) {
        console.log(`${socket.id} sent multiple requests.`);
        socket.emit(Event.ERROR, Error.MULTIPLE_REQUESTS.localize(language));
        return;
      }

      switch (data.operation) {
        case "detection":
          py = new PythonShell(
            resolve(facePath, "detection.py"),
            pyShellOptions
          );

          py.stdin.on("error", (err) => {
            console.error(
              `Error writing data of client ${socket.id}.\n  ${err}`
            );
          });

          py.stdout.on("data", (data) => {
            console.log(`Client ${socket.id} got detection result: ${Uint8Array.from(data)}`);
            socket.emit(Event.DETECTION, data);
          });

          py.stderr.on("data", (data) => {
            console.error(
              `Client ${socket.id} got detection error from stderr event data.\n  ${data}`
            );
            socket.emit(Event.ERROR, data);
          });

          py.on("error", (err) => {
            console.error(
              `Client ${socket.id} got detection error from event error.\n  ${err}`
            );
            socket.emit(Event.ERROR, err);
          });

          py.on("pythonError", (err) => {
            console.error(
              `Client ${socket.id} got detection error from event pythonError.\n  ${err}`
            );
            socket.emit(Event.ERROR, err);
          });

          console.log(`Client ${socket.id} is ready to detect faces.`);
          socket.emit(Event.SUCCESS);
          break;
        default:
          console.log(
            `Client ${socket.id} sent invalid operation: ${data.operation}.`
          );
          socket.emit(Event.ERROR, Error.INVALID_REQUEST.localize(language));
          break;
      }
    });

    socket.on(Event.CLOSE, () => {
      py?.kill();
      py = null;
    });

    socket.on(Event.DETECTION, (data) => {
      if (py == null) {
        console.log(
          `Client ${socket.id} sent detection data without a detection process.`
        );
        socket.emit(Event.ERROR, Error.INVALID_REQUEST.localize(language));
        return;
      }

      if (!(data instanceof Buffer)) {
        console.log(
          `Client ${
            socket.id
          } sent invalid type of detection data: ${typeof data}.`
        );
        socket.emit(Event.ERROR, Error.TYPE_ERROR.localize(language));
        return;
      }

      py.stdin.write(data.length.toString());
      py.stdin.write(EOL);
      py.stdin.write(data);
    });
  });
}

function parseEnumKey<E extends { [index: string]: V }, V>(
  enumObject: E,
  enumValue: V
) {
  let keys = Object.keys(enumObject).filter((x) => enumObject[x] == enumValue);
  return keys.length > 0 ? keys[0] : null;
}

enum RequestHeader {
  API_VERSION = "api-version",
}

enum SupportedLanguage {
  ZH = "zh",
  EN = "en",
}

enum Event {
  REQUEST = "request",
  SUCCESS = "success",
  ERROR = "error",
  DETECTION = "detection",
  CLOSE = "close",
}

type FaceRequest = {
  operation: "detection" | "registration" | "recognition";
  width: number;
  height: number;
};

type OutgoingMessage = {
  [index in SupportedLanguage]: string;
};

class Error {
  private constructor(
    public readonly code: number,
    public readonly message: OutgoingMessage
  ) {}

  static readonly TYPE_ERROR = new Error(0x00, {
    [SupportedLanguage.ZH]: "无效的数据类型",
    [SupportedLanguage.EN]: "Invalid data type",
  });

  static readonly MULTIPLE_REQUESTS = new Error(0x01, {
    [SupportedLanguage.ZH]: "重复的请求：正在进行另一操作",
    [SupportedLanguage.EN]:
      "Multiple requests: another operation is in progress",
  });

  static readonly INVALID_REQUEST = new Error(0x02, {
    [SupportedLanguage.ZH]: "无效的请求",
    [SupportedLanguage.EN]: "Invalid request",
  });

  static readonly API_VERSION_MISMATCH = new Error(0x03, {
    [SupportedLanguage.ZH]: "API 版本不匹配",
    [SupportedLanguage.EN]: "API version mismatch",
  });

  localize(language: SupportedLanguage) {
    return {
      code: this.code,
      message: this.message[language],
    };
  }
}
