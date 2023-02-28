import fs from "fs";
import dotenv from "dotenv";
import Database from "./Database";
dotenv.config();

export default class DatabaseFS extends Database {
  private readonly path: string;
  constructor(options) {
    super();
    this.path = options.path;
  }

  checkToken(token): Promise<boolean> {
    return new Promise((resolve, reject) => {
      //read from tokens.json
      if (!fs.existsSync(this.path + "/tokens.json")) {
        fs.writeFileSync(this.path + "/tokens.json", "[]");
      }
      let tokens = JSON.parse(
        fs.readFileSync(this.path + "/tokens.json", "utf-8")
      );
      if (tokens.includes(token)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  saveUsage(options): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.path + "/usage.json")) {
        fs.writeFileSync(this.path + "/usage.json", JSON.stringify({}));
      }

      fs.readFile(this.path + "/usage.json", "utf8", (err, data) => {
        if (err) {
          reject(err);
        } else {
          const json = JSON.parse(data);
          json[options.token] = json[options.token] || {};
          json[options.token][options.engine] =
            json[options.token][options.engine] || {};
          json[options.token][options.engine].usage = json[options.token][
            options.engine
          ].usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          };
          json[options.token][options.engine].usage.prompt_tokens +=
            options.usage.prompt_tokens;
          json[options.token][options.engine].usage.completion_tokens +=
            options.usage.completion_tokens;
          json[options.token][options.engine].usage.total_tokens +=
            options.usage.total_tokens;

          fs.writeFile(
            this.path + "/usage.json",
            JSON.stringify(json),
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(true);
              }
            }
          );
        }
      });
    });
  }
}
