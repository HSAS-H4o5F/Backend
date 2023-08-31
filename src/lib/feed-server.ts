import { XMLParser } from "fast-xml-parser";
import { writeFile } from "fs";
import { IncomingMessage } from "http";
import https from "https";
import { parse } from "node-html-parser";
import { resolve } from "path";
import ts from "typescript";
import * as TJS from "typescript-json-schema";
import { app, projectPath, schemaPath } from "../app.js";
import { Feed, FeedOrigin, FeedParser, feedOrigins } from "../types/feed.js";

const { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } = ts;

export function startFeedServer() {
  console.log("Generating JSON Schema for feed.");

  const configFilePath = findConfigFile(projectPath, sys.fileExists);

  if (!configFilePath) {
    console.error("Failed to find tsconfig.json.");
    process.exit(1);
  }

  const configFile = readConfigFile(configFilePath, sys.readFile);

  const compilerOptions = parseJsonConfigFileContent(
    configFile.config,
    sys,
    projectPath
  ).options;

  const program = TJS.getProgramFromFiles(
    [resolve(projectPath, "src", "types", "feed.ts")],
    compilerOptions,
    projectPath
  );

  const settings: TJS.PartialArgs = {
    noExtraProps: true,
    required: true,
  };

  const schema = TJS.generateSchema(program, "Feed", settings);

  if (!schema) {
    console.error("Failed to generate JSON Schema for feed.");
    process.exit(1);
  }

  const schemaFile = resolve(schemaPath, "feed.schema.json");

  writeFile(schemaFile, JSON.stringify(schema), (err) => {
    if (err) {
      console.error(`Failed to write JSON Schema for feed: ${err}.`);
      process.exit(1);
    }
  });

  console.log(`Generated JSON Schema for feed to ${schemaFile}.`);

  app.get("/feed/schema", (req, res) => {
    console.log(
      `Received request of feed schema. ` +
        `Requsting IP: ${req.ip}. CF-Connecting-IP: ${req.headers["cf-connecting-ip"]}.`
    );

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.write(JSON.stringify(schema));
    res.end();
  });

  app.get("/feed/origins", (req, res) => {
    console.log(
      `Received request of feed origins. ` +
        `Requsting IP: ${req.ip}. CF-Connecting-IP: ${req.headers["cf-connecting-ip"]}.`
    );

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.write(JSON.stringify(feedOrigins));
    res.end();
  });

  app.get("/feed", async (req, res) => {
    let origins = (req.query.origin ?? []) as FeedOrigin[];

    if (!Array.isArray(origins)) {
      origins = [origins];
    }

    let page: number;

    try {
      page = parseInt(req.query.page as string);
    } catch (e) {
      console.error(`Failed to parse page number: ${e}, using page 1.`);
      page = 1;
    }

    if (Number.isNaN(page)) {
      console.error(
        `Failed to parse page number: ${req.query.page}, using page 1.`
      );
      page = 1;
    }

    if (origins.length === 0) {
      res.status(400).send("No origin specified.");
      return;
    }

    console.log(
      `Received request of feed page ${page} containing origin ${origins}. ` +
        `Requsting IP: ${req.ip}. CF-Connecting-IP: ${req.headers["cf-connecting-ip"]}.`
    );

    let feed: Feed = {
      version: 1,
      items: [],
    };

    function addError(origin: FeedOrigin, message: string) {
      if (!feed.error) {
        feed.error = [];
      }
      feed.error.push({
        origin,
        message,
      });
    }

    await Promise.all(
      origins.map((origin) => {
        const feedOrigin = feedOrigins[origin];

        if (!feedOrigin) {
          const errorMessage = `Unknown origin: ${origin}.`;
          console.error(errorMessage);
          addError(origin, errorMessage);
          return Promise.resolve();
        }

        return new Promise<void>((resolve, _reject) => {
          https.get(feedOrigin.url, async (rssResponse) => {
            console.log(
              `Get ${origin} feed, status code: ${rssResponse.statusCode}.`
            );

            let body: string;

            try {
              body = await rssResponse.body();
            } catch (e) {
              const errorMessage = `Failed to get ${feedOrigin.name} feed: ${e}.`;
              console.error(errorMessage);
              addError(origin, errorMessage);
              resolve();
              return;
            }

            try {
              function parseFeed(
                parser: FeedParser,
                body: string,
                origin: FeedOrigin
              ) {
                return parser(body).map((item) => ({ ...item, origin }));
              }

              if (feedOrigin.parser) {
                feed.items.push(...parseFeed(feedOrigin.parser, body, origin));
              } else {
                feed.items.push(...parseFeed(commonFeedParser, body, origin));
              }
            } catch (e) {
              const errorMessage = `Failed to parse ${feedOrigin.name} feed: ${e}.`;
              console.error(errorMessage);
              addError(origin, errorMessage);
              resolve();
              return;
            }

            resolve();
          });
        });
      })
    );

    feed.items.sort((a, b) => b.published - a.published);

    //TODO: 客户端实现分页
    //feed.items = feed.items.slice((page - 1) * 10, page * 10);

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.write(JSON.stringify(feed));
    res.end();
  });
}

const commonFeedParser: FeedParser = (raw) =>
  (parseRss(raw).rss.channel.item as any[]).map((item) => ({
    title: item.title,
    summary: parse(item.description).text.substring(0, 100) + "…",
    link: item.link,
    published: new Date(item.pubDate).getTime(),
  }));

declare module "http" {
  interface IncomingMessage {
    /**
     * 获取 body
     */
    body(): Promise<string>;
  }
}

IncomingMessage.prototype.body = async function () {
  return new Promise<string>((resolve, reject) => {
    const bodyParts: any[] = [];
    this.on("data", (chunk) => {
      bodyParts.push(chunk);
    });
    this.on("end", () => {
      resolve(Buffer.concat(bodyParts).toString());
    });
    this.on("error", (err) => {
      reject(err);
    });
  });
};

function parseRss(raw: string) {
  return new XMLParser({ ignoreAttributes: false }).parse(raw);
}
