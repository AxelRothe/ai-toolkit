import fs from "fs";
import path from "path";
import routes from "./routes";
import logbot from "logbotjs";
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

import { dirname } from "path";
import { fileURLToPath } from "url";
import RouteFactory from "./RouteFactory";
const __dirname = dirname(fileURLToPath(import.meta.url));

export default class RESTServer {
  port: number;
  app: express.Application;

  brushes: any;
  chats: any;
  private PATH_CACHE;
  private core;

  constructor(core, port: number) {
    this.port = port;
    this.core = core;
  }

  async init() {
    logbot.log(100, "🚀 Starting server...");

    this.PATH_CACHE =
      process.env.SERVER_PATH_CACHE ||
      process.env.HOME ||
      process.env.HOMEPATH ||
      process.env.USERPROFILE;
    if (!this.PATH_CACHE)
      throw new Error("❌ No PATH_CACHE found in .env file");

    //create a folder for the chat on the server
    if (!fs.existsSync(path.join(this.PATH_CACHE, "/chats/"))) {
      fs.mkdirSync(path.join(this.PATH_CACHE, "/chats/"), { recursive: true });
    }
    if (!fs.existsSync(path.join(this.PATH_CACHE, "/brushes/"))) {
      fs.mkdirSync(path.join(this.PATH_CACHE, "/brushes/"), {
        recursive: true,
      });
    }

    this.port = this.port || Number(process.env.SERVER_PORT) || 8000;

    this.chats = [];
    this.brushes = [];

    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(express.static(path.join(__dirname, "..", "/httpdocs/")));

    //load chats from cache
    fs.readdirSync(path.join(this.PATH_CACHE, "/chats/")).forEach((file) => {
      const chat = JSON.parse(
        fs.readFileSync(path.join(this.PATH_CACHE, "/chats/", file), "utf8")
      );
      this.chats.push(chat);
      logbot.log(200, `📁 Loaded chat ${chat.id} from cache`);
    });
    logbot.log(200, "📂 Loaded " + this.chats.length + " chats from cache");

    //load brushes from cache
    fs.readdirSync(path.join(this.PATH_CACHE, "/brushes/")).forEach((file) => {
      const brush = JSON.parse(
        fs.readFileSync(path.join(this.PATH_CACHE, "/brushes/", file), "utf8")
      );
      this.brushes.push(brush);
      logbot.log(200, `📁 Loaded brushes ${brush.id} from cache`);
    });
    logbot.log(200, "📂 Loaded " + this.chats.length + " chats from cache");

    const defaultRoute = (req, res) => {
      this.respond(req, res)
        .status(200)
        .sendFile(path.join(__dirname, "..", "/httpdocs/index.html"));
    };

    this.app.get("/", (req, res) => {
      defaultRoute(req, res);
    });

    /* ROUTES */

    const routeFactory = new RouteFactory({
      baseUrl: "/api",
      express: this.app,
      server: this,
      mailServer: undefined,
    });
    for (let route of routes) {
      routeFactory.build(route);
    }

    //wildcard catch all
    this.app.get("*", (req, res) => {
      defaultRoute(req, res);
    });

    this.app.listen(this.port, () => {
      console.log(`App listening at http://localhost:${this.port}`);
    });
  }

  respond(req, res) {
    return {
      status: (status) => {
        res.status(status);
        return {
          send: (data) => {
            res.send(data);
          },
          sendFile: (file) => {
            res.sendFile(file);
          },
        };
      },
    };
  }

  /**
   * Checks if the token is valid
   * @param {express.Request} req the request
   * @param {express.Response} res the response
   * @param {string|string[]} role
   * @returns {boolean} true if the token is valid
   */
  async checkRequestAuthorization(req, res, role: string | string[] = "") {
    const auth = req.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      this.respond(req, res).status(401).send({
        error: `Invalid Authorization Format or Token. Should be: Bearer <token>`,
      });
      return false;
    }

    const token = auth.split(" ")[1];

    const checkResult = await this.core.database.checkToken(token);

    if (!checkResult) {
      this.respond(req, res).status(401).send({ error: `Invalid Token` });
      return false;
    }

    return true;
  }

  get(path, func) {
    return this.app.get(path, func);
  }

  post(path, func) {
    return this.app.post(path, func);
  }

  put(path, func) {
    return this.app.put(path, func);
  }

  delete(path, func) {
    return this.app.delete(path, func);
  }

  async run(engine, options) {
    return await this.core.run(engine, options);
  }
}
