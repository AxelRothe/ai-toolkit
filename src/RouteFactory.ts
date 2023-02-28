import express from "express";
import RESTServer from "./RESTServer";
const LogBot = require("logbotjs");

interface RouteOptions {
  method: string; //"get" | "post" | "put" | "delete"
  url: string;
  requiredRole?: string | string[];
  requiredParams?: string[] | undefined;
  requiredBody?: string[] | undefined;
  public?: boolean;
  handler: (req: express.Request, server: RESTServer) => Promise<any>;
}

interface FactoryOptions {
  baseUrl: string;
  express: express.Application;
  server: RESTServer;
  mailServer;
}

export default class RouteFactory {
  private readonly app: express.Application;
  private readonly server: RESTServer;
  private readonly mail: any;
  private readonly baseUrl: string;
  constructor(options: FactoryOptions) {
    this.baseUrl = options.baseUrl;
    this.app = options.express;
    this.server = options.server;
    this.mail = options.mailServer;

    if (!this.mail) {
      LogBot.log(100, "Mail server is not defined. Skipping...");
    }
  }

  build(options: RouteOptions) {
    if (!options.method) throw new Error("Method is required");

    LogBot.log(
      100,
      `Building route ${options.method.toUpperCase()} ${this.baseUrl}${
        options.url
      }`
    );

    this.app[options.method](
      `${this.baseUrl}${options.url}`,
      async (req, res) => {
        try {
          if (
            options.requiredRole &&
            !(await this.server.checkRequestAuthorization(
              req,
              res,
              options.requiredRole
            ))
          )
            return;
          else if (
            !options.public &&
            !(await this.server.checkRequestAuthorization(req, res))
          )
            return;

          const resolvedHandler = await options.handler(req, this.server);

          if (resolvedHandler) {
            res.status(resolvedHandler.status).send(resolvedHandler.result);
            LogBot.log(
              200,
              `[API] ${options.method.toUpperCase()} ${this.baseUrl}${
                options.url
              } by IP ${req.ip}`
            );
          }
        } catch (e: any) {
          LogBot.log(
            500,
            `[API] ${options.method.toUpperCase()} ${this.baseUrl}${
              options.url
            } by IP ${req.ip}`
          );
          console.error(e);
          if (!res.headersSent) {
            res.status(500).send({
              status: "error",
              message: e.message,
            });
          }
        }
      }
    );
  }
}
