import logbot from "logbotjs";
import express from 'express'
import bodyParser from 'body-parser';
import path from "path";
import * as fs from "fs";
import dotenv from 'dotenv'
dotenv.config()

const port = (process.env.SERVER_PORT || 8000)
const tokenPath = process.env.SERVER_TOKENS
if (!tokenPath) throw new Error("No SERVER_TOKENS found in .env file")

const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));

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
        res.status(401).send({ error: `Invalid Authorization Format or Token. Should be: Bearer <token>` });
        return false;
    }

    const token = auth.split(" ")[1];
    if (!tokens.includes(token)) {
        res.status(401).send({ error: `Invalid Token` });
        return false;
    }
    return true;
};

export default function(program, core){
    program.command('server')
        .option('-p, --port <port>', 'Port to run server on', port.toString())
        .description('Starts a server to run commands from')
        .action((options) => {
            logbot.log(100, "🚀 Starting server...");

            const PATH_CACHE = process.env.SERVER_PATH_CACHE || process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
            if (!PATH_CACHE) throw new Error("❌ No PATH_CACHE found in .env file");

            //create a folder for the chat on the server
            if (!fs.existsSync(path.join(PATH_CACHE, "/chats/"))) {
                fs.mkdirSync(path.join(PATH_CACHE, "/chats/"), {recursive: true});
            }

            const port = options.port

            const chats : any = [];

            const app = express()
            app.use(bodyParser.json())
            app.use(bodyParser.urlencoded({extended: true}))
            app.use(express.static(path.join(__dirname, '..', '/httpdocs/')))

            //load chats from cache
            fs.readdirSync(path.join(PATH_CACHE, "/chats/")).forEach(file => {
                const chat = JSON.parse
                (fs.readFileSync(path.join(PATH_CACHE, "/chats/", file), 'utf8'));
                chats.push(chat);
                logbot.log(200, `📁 Loaded chat ${chat.id} from cache`)
            });
            logbot.log(200, "📂 Loaded " + chats.length + " chats from cache");

            app.get('/', (req, res) => {
                res.sendFile(path.join(__dirname, ".." , "/httpdocs/index.html"));
            })

            app.post('/api/chat/new', (req, res) => {
                //check if token is valid
                if (!checkRequestAuthorization(req, res)) return;

                const {model, prompt, temperature, max_tokens} = req.body;
                const id = Math.random().toString(36).substring(7);

                const promptText = "Request:\n" + prompt + "\nResponse:\n";
                core(model, promptText, temperature, max_tokens).then((response) => {

                    res.send({
                        id,
                        prompt: promptText,
                        response
                    });
                    const chat = {
                        id,
                        owner: req.get("authorization").split(" ")[1],
                        thread: [{
                            prompt,
                            response
                        }]
                    };
                    //add new chat to chats
                    chats.push(chat);
                    //save the chat as json to the server as a file for later use
                    fs.writeFile(path.join(PATH_CACHE, "/chats/", id + ".json"), JSON.stringify(chat), function (err) {
                        if (err) throw err;
                    });
                }).catch((err) => {
                    res.status(500).send({error: err});
                })
            })

            app.get('/api/chat/:id', (req, res) => {

                //check if token is valid
                if (!checkRequestAuthorization(req, res)) return;

                const {id} = req.params;
                const chat = chats.find((chat) => chat.id === id);
                if (chat) {
                    if (!chat.owner === req.get("authorization").split(" ")[1]) {
                        res.status(401).send("Unauthorized");
                        return;
                    }

                    res.send(chat);
                } else {
                    res.send({
                        error: "Chat not found"
                    });
                }
            })

            app.post('/api/chat/:id', (req, res) => {

                //check if token is valid
                if (!checkRequestAuthorization(req, res)) return;

                const {model, prompt, temperature, max_tokens} = req.body;
                const id = req.params.id;
                //find chat
                const chat = chats.find((chat) => chat.id === id);
                if (!chat) {
                    res.status(404).send("Chat not found");
                    return;
                }
                if (!chat.owner === req.get("authorization").split(" ")[1]) {
                    res.status(401).send("Unauthorized");
                    return;
                }

                //rebuild history for prompt
                let history = "";
                chat.thread.forEach((message) => {
                    history += "Request:\n"+message.prompt + "\nResponse:\n" + message.response+"\n";
                })
                const promptText = history + "Request:\n" + prompt + "\nResponse:\n";
                core(model, promptText, temperature, max_tokens).then((response) => {
                    res.send({
                        id,
                        prompt: promptText,
                        response
                    });
                    //add new chat to chats
                    chat.thread.push({
                        prompt,
                        response
                    });
                    //save the chat as json to the server as a file for later use
                    fs.writeFile(path.join(PATH_CACHE,"/chats/" , id + ".json"), JSON.stringify(chat), function (err) {
                        if (err) throw err;
                    })
                }).catch((err) => {
                    res.status(500).send({error: err});
                })
            })

            app.delete('/api/chat/:id', (req, res) => {
                if (!checkRequestAuthorization(req, res)) return;

                const id = req.params.id;
                const chat = chats.find((chat) => chat.id === id);
                if (!chat) {
                    res.status(404).send("Chat not found");
                    return;
                }
                if (!chat.owner === req.get("authorization").split(" ")[1]) {
                    res.status(401).send("Unauthorized");
                    return;
                }

                chats.splice(chats.indexOf(chat), 1);
                fs.unlink(path.join(PATH_CACHE, "/chats/", id + ".json"), function (err) {
                    if (err) throw err;
                    res.send("Chat deleted");
                })
            })

            app.post('/api/prompt', (req, res) => {
                if (!checkRequestAuthorization(req, res)) return;

                const {model, prompt, temperature, max_tokens} = req.body;
                core(model, prompt, temperature, max_tokens).then((response) => {
                    res.send({
                        prompt,
                        response
                    });
                }).catch((err) => {
                    res.status(500).send({error: err});
                })
            })

            /**
             * checks wether the token is valid
             */
            app.get('/api/auth', (req, res) => {
                if (!checkRequestAuthorization(req, res)) return;
                res.send("Authorized");
            })

            app.get('/api/chats', (req, res) => {
                if (!checkRequestAuthorization(req, res)) return;

                //find filters that match the owner token
                const owner = req.get("authorization").split(" ")[1];
                const filteredChats = chats.filter((chat) => chat.owner === owner);

                res.status(200).send(filteredChats.map((chat) =>chat.id))
            })

            app.get('*', (req, res) => {
                res.sendFile(path.join(__dirname, ".." , "/httpdocs/index.html"));
            })

            app.listen(port, () => {
                console.log(`App listening at http://localhost:${port}`)
            })

        })

}