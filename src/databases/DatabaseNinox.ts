import ninox from "ninoxjs";
import Database from "./Database";

export default class DatabaseNinox extends Database {
  db;
  token;
  team;
  database;
  constructor(options) {
    super();
    this.token = options.token;
    this.team = options.team;
    this.database = options.database;
  }

  auth() {
    return new Promise((resolve, reject) => {
      ninox
        .auth({
          authKey: this.token,
          team: this.team,
          database: this.database,
        })
        .then((db) => {
          this.db = db;
          resolve(true);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  checkToken(token): Promise<boolean> {
    return new Promise((resolve, reject) => {
      ninox
        .query(`count(select Keys[key = "${token}"]) > 0`)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  getBalance(token): Promise<number> {
    return new Promise((resolve, reject) => {
      ninox
        .query(`first(select Keys[key = "${token}"]).Owner.balance`)
        .then((balance) => {
          resolve(balance);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  saveUsage(options): Promise<boolean> {
    return new Promise((resolve, reject) => {
      ninox
        .saveRecords("Usage", [
          {
            fields: {
              token: options.token,
              engine: options.engine,
              prompt_tokens: options.usage.prompt_tokens,
              completion_tokens: options.usage.completion_tokens,
              cost: options.usage.cost,
              image_count: options.usage.image_count || 0,
              video_count: options.usage.video_count || 0,
              document_count: options.usage.document_count || 0,
            },
          },
        ])
        .then(() => {
          resolve(true);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  }
}
