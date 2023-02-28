export default class Database {
  constructor() {}

  checkToken(token): Promise<boolean> {
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }

  saveUsage(options): Promise<boolean> {
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }

  getBalance(token): Promise<number> {
    return new Promise((resolve, reject) => {
      resolve(-1);
    });
  }

  auth() {
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }
}
