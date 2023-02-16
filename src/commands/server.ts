import logbot from "logbotjs";
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import * as fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.SERVER_PORT || 8000;
const tokenPath = process.env.SERVER_TOKENS;
if (!tokenPath) throw new Error("No SERVER_TOKENS found in .env file");

const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));

import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const logCall = (req, status = 100) => {
  logbot.log(
    status,
    "[" + req.method + "] " + req.originalUrl + " REQUESTEE: " + req.ip
  );
};

const respond = (req, res) => {
  return {
    status: (status) => {
      res.status(status);
      logCall(req, status);
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
};

/**
 * Checks if the token is valid
 * @param {express.Request} req the request
 * @param {express.Response} res the response
 * @param {string} role
 * @returns {boolean} true if the token is valid
 */
const checkRequestAuthorization = (req, res, role = "") => {
  const auth = req.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    respond(req, res).status(401).send({
      error: `Invalid Authorization Format or Token. Should be: Bearer <token>`,
    });
    return false;
  }

  const token = auth.split(" ")[1];
  if (!tokens.includes(token)) {
    respond(req, res).status(401).send({ error: `Invalid Token` });
    return false;
  }

  return true;
};

export default function (program, core) {
  program
    .command("server")
    .option("-p, --port <port>", "Port to run server on", port.toString())
    .description("Starts a server to run commands from")
    .action((options) => {
      logbot.log(100, "🚀 Starting server...");

      const PATH_CACHE =
        process.env.SERVER_PATH_CACHE ||
        process.env.HOME ||
        process.env.HOMEPATH ||
        process.env.USERPROFILE;
      if (!PATH_CACHE) throw new Error("❌ No PATH_CACHE found in .env file");

      //create a folder for the chat on the server
      if (!fs.existsSync(path.join(PATH_CACHE, "/chats/"))) {
        fs.mkdirSync(path.join(PATH_CACHE, "/chats/"), { recursive: true });
      }
      if (!fs.existsSync(path.join(PATH_CACHE, "/brushes/"))) {
        fs.mkdirSync(path.join(PATH_CACHE, "/brushes/"), { recursive: true });
      }

      const port = options.port;

      const chats: any = [];
      const brushes: any = [];

      const app = express();
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({ extended: true }));
      app.use(express.static(path.join(__dirname, "..", "/httpdocs/")));

      //load chats from cache
      fs.readdirSync(path.join(PATH_CACHE, "/chats/")).forEach((file) => {
        const chat = JSON.parse(
          fs.readFileSync(path.join(PATH_CACHE, "/chats/", file), "utf8")
        );
        chats.push(chat);
        logbot.log(200, `📁 Loaded chat ${chat.id} from cache`);
      });
      logbot.log(200, "📂 Loaded " + chats.length + " chats from cache");

      //load brushes from cache
      fs.readdirSync(path.join(PATH_CACHE, "/brushes/")).forEach((file) => {
        const brush = JSON.parse(
          fs.readFileSync(path.join(PATH_CACHE, "/brushes/", file), "utf8")
        );
        brushes.push(brush);
        logbot.log(200, `📁 Loaded brushes ${brush.id} from cache`);
      });
      logbot.log(200, "📂 Loaded " + chats.length + " chats from cache");

      app.get("/", (req, res) => {
        logCall(req);
        respond(req, res)
          .status(200)
          .sendFile(path.join(__dirname, "..", "/httpdocs/index.html"));
      });

      app.post("/api/chat/new", (req, res) => {
        //check if token is valid
        if (!checkRequestAuthorization(req, res)) return;

        const { model, prompt, temperature, max_tokens } = req.body;
        const id = Math.random().toString(36).substring(7);

        const promptText = "Request:\n" + prompt + "\nResponse:\n";
        core
          .run("gpt-3", {
            token: req.get("authorization").split(" ")[1],
            prompt: promptText,
            temperature,
            max_tokens,
            model,
          })
          .then((response) => {
            if (response.status === 200) {
              respond(req, res).status(200).send({
                id,
                prompt: promptText,
                response: response.result.choices[0].text,
                usage: response.result.usage,
              });
              const chat = {
                id,
                owner: req.get("authorization").split(" ")[1],
                usage: JSON.parse(JSON.stringify(response.result.usage)),
                thread: [
                  {
                    prompt,
                    response: response.result.choices[0].text,
                    usage: JSON.parse(JSON.stringify(response.result.usage)),
                  },
                ],
              };
              //add new chat to chats
              chats.push(chat);
              //save the chat as json to the server as a file for later use
              fs.writeFile(
                path.join(PATH_CACHE, "/chats/", id + ".json"),
                JSON.stringify(chat),
                function (err) {
                  if (err) throw err;
                }
              );
            } else {
              respond(req, res).status(response.status).send({
                error: response.result,
              });
            }
          })
          .catch((err) => {
            logCall(req, 500);
            respond(req, res).status(500).send({ error: err });
          });
      });

      app.get("/api/chat/:id", (req, res) => {
        //check if token is valid
        if (!checkRequestAuthorization(req, res)) return;

        const { id } = req.params;
        const chat = chats.find((chat) => chat.id === id);
        if (chat) {
          if (!chat.owner === req.get("authorization").split(" ")[1]) {
            respond(req, res).status(401).send("Unauthorized");
            return;
          }

          respond(req, res).status(200).send(chat);
        } else {
          respond(req, res).status(404).send({
            error: "Chat not found",
          });
        }
      });

      app.post("/api/chat/:id", (req, res) => {
        //check if token is valid
        if (!checkRequestAuthorization(req, res)) return;

        const { model, prompt, temperature, max_tokens } = req.body;
        const id = req.params.id;
        //find chat
        const chat = chats.find((chat) => chat.id === id);
        if (!chat) {
          respond(req, res).status(404).send("Chat not found");
          return;
        }
        if (!chat.owner === req.get("authorization").split(" ")[1]) {
          respond(req, res).status(401).send("Unauthorized");
          return;
        }

        //rebuild history for prompt
        let history = "";
        chat.thread.forEach((message) => {
          history +=
            "Request:\n" +
            message.prompt +
            "\nResponse:\n" +
            message.response +
            "\n";
        });
        const promptText = history + "Request:\n" + prompt + "\nResponse:\n";
        core
          .run("gpt-3", {
            token: req.get("authorization").split(" ")[1],
            prompt: promptText,
            temperature,
            max_tokens,
            model,
          })
          .then((response) => {
            if (response.status === 200) {
              respond(req, res).status(200).send({
                id,
                prompt: promptText,
                response: response.result.choices[0].text,
                usage: response.result.usage,
              });

              //add new chat to chats
              chat.thread.push({
                prompt,
                response: response.result.choices[0].text,
                usage: response.result.usage,
              });

              chat.usage.total_tokens += response.result.usage.total_tokens;
              chat.usage.prompt_tokens += response.result.usage.prompt_tokens;
              chat.usage.completion_tokens +=
                response.result.usage.completion_tokens;

              //save the chat as json to the server as a file for later use
              fs.writeFile(
                path.join(PATH_CACHE, "/chats/", id + ".json"),
                JSON.stringify(chat),
                function (err) {
                  if (err) throw err;
                }
              );
            } else {
              respond(req, res).status(response.status).send({
                error: response.result,
              });
            }
          })
          .catch((err) => {
            respond(req, res).status(500).send({ error: err });
          });
      });

      app.delete("/api/chat/:id/last", (req, res) => {
        //check if token is valid
        if (!checkRequestAuthorization(req, res)) return;

        const { id } = req.params;
        //find chat
        const chat = chats.find((chat) => chat.id === id);
        if (!chat) {
          respond(req, res).status(404).send("Chat not found");
          return;
        }
        if (!chat.owner === req.get("authorization").split(" ")[1]) {
          respond(req, res).status(401).send("Unauthorized");
          return;
        }

        chat.thread.pop();
        respond(req, res).status(200).send(chat);

        //save the chat as json to the server as a file for later use
        fs.writeFile(
          path.join(PATH_CACHE, "/chats/", id + ".json"),
          JSON.stringify(chat),
          function (err) {
            if (err) throw err;
          }
        );
      });

      /**
       * Allows changes to the chat history
       */
      app.put("/api/chat/:id/last", (req, res) => {
        //check if token is valid
        if (!checkRequestAuthorization(req, res)) return;

        const { id } = req.params;
        const { prompt, response } = req.body;
        //if both prompt and response are empty, return error
        if (!prompt && !response) {
          respond(req, res).status(400).send("Bad Request");
          return;
        }

        //find chat
        const chat = chats.find((chat) => chat.id === id);

        if (!chat) {
          respond(req, res).status(404).send("Chat not found");
          return;
        }
        if (!chat.owner === req.get("authorization").split(" ")[1]) {
          respond(req, res).status(401).send("Unauthorized");
          return;
        }

        chat.thread[chat.thread.length - 1].prompt =
          prompt || chat.thread[chat.thread.length - 1].prompt;
        chat.thread[chat.thread.length - 1].response =
          response || chat.thread[chat.thread.length - 1].response;

        //save the chat as json to the server as a file for later use
        fs.writeFile(
          path.join(PATH_CACHE, "/chats/", id + ".json"),
          JSON.stringify(chat),
          function (err) {
            if (err) throw err;
            respond(req, res).status(200).send(chat);
          }
        );
      });

      app.delete("/api/chat/:id", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;

        const id = req.params.id;
        const chat = chats.find((chat) => chat.id === id);
        if (!chat) {
          respond(req, res).status(404).send("Chat not found");
          return;
        }
        if (!chat.owner === req.get("authorization").split(" ")[1]) {
          respond(req, res).status(401).send("Unauthorized");
          return;
        }

        chats.splice(chats.indexOf(chat), 1);
        fs.unlink(
          path.join(PATH_CACHE, "/chats/", id + ".json"),
          function (err) {
            if (err) throw err;
            respond(req, res).status(200).send("Chat deleted");
          }
        );
      });

      app.post("/api/prompt", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;

        try {
          const { model, prompt, temperature, max_tokens, input, instruction } =
            req.body;
          core
            .run("gpt-3", {
              token: req.get("authorization").split(" ")[1],
              prompt,
              temperature,
              max_tokens,
              model,
              input,
              instruction,
            })
            .then((response) => {
              if (response.status === 200) {
                respond(req, res).status(200).send({
                  prompt,
                  response: response.result.choices[0].text,
                  usage: response.result.usage,
                });
              } else {
                respond(req, res).status(response.status).send({
                  error: response.result,
                });
              }
            })
            .catch((err) => {
              console.log(err);
              respond(req, res).status(500).send({ error: err });
              return;
            });
        } catch (e) {
          respond(req, res).status(500).send({ error: e });
        }
      });

      app.post("/api/brush/", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;

        try {
          const { title, instruction, model, temperature } = req.body;

          const newId = Math.random().toString(36).substring(7);
          //this is a new brush
          const brush = {
            id: newId,
            owner: req.get("authorization").split(" ")[1],
            title,
            instruction,
            model,
            temperature,
          };
          brushes.push(brush);
          //save the brush to the server as a file for later use
          fs.writeFile(
            path.join(PATH_CACHE, "/brushes/", newId + ".json"),
            JSON.stringify(brush),
            function (err) {
              if (err) throw err;
              respond(req, res).status(200).send({ status: "created", brush });
              return;
            }
          );
        } catch (e) {
          respond(req, res).status(500).send({ error: e });
          return;
        }
      });

      app.post("/api/brush/:brushId", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;

        try {
          const { title, instruction, model, temperature } = req.body;
          const { brushId } = req.params;

          //this is a brush that has already been created
          const brush = brushes.find((brush) => brush.id === brushId);
          if (!brush) {
            respond(req, res).status(404).send("Brush not found");
            return;
          }

          if (!brush.owner === req.get("authorization").split(" ")[1]) {
            respond(req, res).status(401).send("Unauthorized");
            return;
          }

          //update brush
          brush.title = title || brush.title;
          brush.instruction = instruction || brush.instruction;
          brush.model = model || brush.model;
          brush.temperature = temperature || brush.temperature;
          //save the brush to the server as a file for later use
          fs.writeFile(
            path.join(PATH_CACHE, "/brushes/", brush.id + ".json"),
            JSON.stringify(brush),
            function (err) {
              if (err) throw err;
              respond(req, res).status(200).send({ status: "updated", brush });
            }
          );
        } catch (e) {
          respond(req, res).status(500).send({ error: e });
        }
      });

      app.get("/api/brush/:brushId", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;

        try {
          const { brushId } = req.params;
          const brush = brushes.find((brush) => brush.id === brushId);
          if (!brush) {
            respond(req, res).status(404).send("Brush not found");
            return;
          }

          if (!brush.owner === req.get("authorization").split(" ")[1]) {
            respond(req, res).status(401).send("Unauthorized");
            return;
          }

          respond(req, res).status(200).send(brush);
        } catch (e) {
          respond(req, res).status(500).send({ error: e });
        }
      });

      app.get("/api/brush/", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;

        try {
          const owner = req.get("authorization").split(" ")[1];
          const userBrushes = brushes.filter((brush) => brush.owner === owner);
          respond(req, res).status(200).send(userBrushes);
        } catch (e) {
          respond(req, res).status(500).send({ error: e });
        }
      });

      app.delete("/api/brush/:brushId", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;

        try {
          const { brushId } = req.params;
          const brush = brushes.find((brush) => brush.id === brushId);
          if (!brush) {
            respond(req, res).status(404).send("Brush not found");
            return;
          }

          if (!brush.owner === req.get("authorization").split(" ")[1]) {
            respond(req, res).status(401).send("Unauthorized");
            return;
          }

          brushes.splice(brushes.indexOf(brush), 1);
          fs.unlink(
            path.join(PATH_CACHE, "/brushes/", brushId + ".json"),
            function (err) {
              if (err) throw err;
              respond(req, res).status(200).send("Brush deleted");
              return;
            }
          );
        } catch (e) {
          respond(req, res).status(500).send({ error: e });
          return;
        }
      });

      /**
       * checks wether the token is valid
       */
      app.get("/api/auth", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;
        respond(req, res).status(200).send("Authorized");
      });

      app.get("/api/chats", (req, res) => {
        if (!checkRequestAuthorization(req, res)) return;

        //find filters that match the owner token
        const owner = req.get("authorization").split(" ")[1];
        const filteredChats = chats.filter((chat) => chat.owner === owner);

        respond(req, res)
          .status(200)
          .send(filteredChats.map((chat) => chat.id));
      });

      app.get("*", (req, res) => {
        respond(req, res)
          .status(200)
          .sendFile(path.join(__dirname, "..", "/httpdocs/index.html"));
      });

      app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`);
      });
    });
}
