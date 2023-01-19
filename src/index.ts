/**LogBot
 * OpenAI GPT-3 Command Line Interface using Commander.js
 *
 * Takes a prompt and returns a completion.
 * You can also specify a temperature, a number between 0 and 1 that determines the randomness of the completion.
 * As well as a maxTokens, which determines the maximum number of tokens the completion can have.
 *
 * */
import {program} from 'commander'
import {Configuration, OpenAIApi} from 'openai'
import dotenv from 'dotenv'
import chatGPT from "chatgpt-io";
import logbot from "logbotjs";
import {prompt} from "enquirer";
//import express server
import express from 'express'
import bodyParser from 'body-parser';
import path from "path";
dotenv.config()

logbot.log("100", "🧠🖥️ OpenAI GPT-3 & chatGPT Command Line Interface")

const run = async (model = 'text-davinci-003', prompt, temperature = 0.6, max_tokens = 200) => {
    if (model === "chatgpt-unofficial") {

        if (!process.env.OPENAI_API_SESSION_TOKEN) {
            logbot.log(404, "❌ No OPENAI_API_SESSION_TOKEN found in .env file");
            return;
        }
        logbot.addSpinner("chatgpt", "⌚️ Waiting for okay from server...");

        let bot = new chatGPT(process.env.OPENAI_API_SESSION_TOKEN, {
            reconnection: true,
            forceNew: false,
            logLevel: 0,
            bypassNode: "https://gpt.pawan.krd",
        });

        await bot.waitForReady();
        logbot.updateSpinner("chatgpt", "🧠💭 chatGPT is thinking... ⏱️ 00:00:00");
        let tick = 0;

        const interval = setInterval(() => {
            tick++;
            logbot.updateSpinner("chatgpt", "🧠💭 chatGPT is thinking... ⏱️ " + new Date(tick * 1000).toISOString().substr(11, 8));
        }, 1000);

        const resp = await bot.ask(prompt);

        clearInterval(interval);
        logbot.endSpinner("chatgpt", "success", "chatGPT has finished thinking! ⏱️ Total Time " + new Date(tick * 1000).toISOString().substr(11, 8));
        return resp;
    } else {

        if (!process.env.OPENAI_API_KEY) {
            logbot.log(404, "❌ No OPENAI_API_KEY found in .env file");
            return;
        }

        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);

        const response = await openai.createCompletion({
            model,
            prompt,
            temperature: Number(temperature),
            max_tokens : Number(max_tokens)
        })
        return (response.data.choices[0].text)

    }
}

program.command('server')
    .description('Starts a server to run commands from')
    .action(() => {

        const chats : any = [];

        const app = express()
        //get body parser
        //use body parser
        app.use(bodyParser.json())
        app.use(bodyParser.urlencoded({extended: true}))
        //add static files
        app.use(express.static(path.join(__dirname, '..', '/httpdocs/')))
        const port = 8000;

        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, ".." , "/httpdocs/index.html"));
        })

        app.post('/api/chat/new', (req, res) => {
            const {model, prompt, temperature, max_tokens} = req.body;
            const id = Math.random().toString(36).substring(7);

            const promptText = "Request:\n" + prompt + "\nResponse:\n";
            run(model, promptText, temperature, max_tokens).then((response) => {
                res.send({
                    id,
                    prompt: promptText,
                    response
                });
                //add new chat to chats
                chats.push({
                    id,
                    thread: [{
                        prompt,
                        response
                    }]
                });
            })
        })

        app.get('/api/chat/:id', (req, res) => {
            const {id} = req.params;
            const chat = chats.find((chat) => chat.id === id);
            if (chat) {
                res.send(chat);
            } else {
                res.send({
                    error: "Chat not found"
                });
            }
        })

        app.post('/api/chat/:id', (req, res) => {
            const {model, prompt, temperature, max_tokens} = req.body;
            const id = req.params.id;
            //find chat
            const chat = chats.find((chat) => chat.id === id);
            if (!chat) {
                res.status(404).send("Chat not found");
                return;
            }

            //rebuild history for prompt
            let history = "";
            chat.thread.forEach((message) => {
                history += "Request:\n"+message.prompt + "\nResponse:\n" + message.response+"\n";
            })
            const promptText = history + "Request:\n" + prompt + "\nResponse:\n";
            run(model, promptText, temperature, max_tokens).then((response) => {
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
            })
        })

        app.post('/api/chat/delete/:id', (req, res) => {
            const id = req.params.id;
            const chat = chats.find((chat) => chat.id === id);
            if (!chat) {
                res.status(404).send("Chat not found");
                return;
            }
            chats.splice(chats.indexOf(chat), 1);
            res.send("Deleted");
        })

        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, ".." , "/httpdocs/index.html"));
        })

        app.listen(port, () => {
            console.log(`App listening at http://localhost:${port}`)
        })

    })

program.command('chat')
    .alias('c')
    .option('-m, --model <model>', 'The model to use. Defaults to davinci. Can be davinci, curie, babbage, ada, or chatgpt-unofficial')
    .option('-t, --temperature <temperature>', 'The temperature to use. Defaults to 0.5. Can be any number between 0 and 1')
    .option('-n, --max_tokens <max_tokens>', 'The max tokens to use. Defaults to 100. Can be any number between 1 and 2048')
    .description('Start the UI')
    .action(async (options) => {
        let __exit = false
        let history : any = [
        ];

        //get model
        if (options.model === undefined) {
            const response2 : any = await prompt({
                type: 'select',
                name: 'model',
                message: 'Which model would you like to use?',
                choices: [
                    { name: 'text-davinci-003', message: 'text-davinci-003' },
                    { name: 'text-davinci-002', message: 'text-davinci-002' },
                    { name: 'chatgpt-unofficial', message: 'Unofficial ChatGPT' }
                ]
            });
            options.model = response2.model
        }

        if (options.model === "chatgpt-unofficial") {
            if (!process.env.OPENAI_API_SESSION_TOKEN) {
                logbot.log(404, "❌ No OPENAI_API_SESSION_TOKEN found in .env file");
                return;
            }
        } else {
            if (!process.env.OPENAI_API_KEY) {
                logbot.log(404, "❌ No OPENAI_API_KEY found in .env file");
                return;
            }
        }

        if (options.temperature === undefined && options.model !== "chatgpt-unofficial") {
            //get temperature
            const response3 : any = await prompt({
                type: 'numeral',
                name: 'temperature',
                message: 'What temperature would you like to use? (0-1)',
                initial: 0.6,
                float: true,
                min: 0,
                max: 1
            });
            options.temperature = response3.temperature
        }

        //get max tokens
        if (options.max_tokens === undefined && options.model !== "chatgpt-unofficial") {
            const response4 : any = await prompt({
                type: 'numeral',
                name: 'max_tokens',
                message: 'What max tokens would you like to use?',
                initial: 1000,
                float: false,
                min: 50,
                max: 4000
            });
            options.max_tokens = response4.max_tokens
        }


        logbot.log(100, "The chat is starting! Type /exit to exit the chat.")

        while(!__exit) {
            //get enquirer
            const response : any = await prompt({
                type: 'input',
                name: 'prompt',
                message: '💬 You:',
            })

            if (response.prompt === "/exit") {
                __exit = true;
                continue;
            }

            let promptContent = history.map(h=>{return "Prompt:\n" + h.prompt + "\nResponse:\n" + h.result}).join("\n") + (history.length > 0 ? '\n' : '') + "Prompt:\n" + response.prompt + "\nResponse:\n"
            //run
            try {
                logbot.addSpinner("openai", "⌚️");
                const result = await run(options.model, promptContent, options.temperature, options.max_tokens)
                logbot.endSpinner("openai", "success", "⌚️");
                logbot.log(200, "💬 Bot: " + result);

                //add to history
                history.push({
                    prompt: response.prompt,
                    model: options.model,
                    temperature: options.temperature,
                    max_tokens: options.max_tokens,
                    result: result
                })

            } catch (e) {
                logbot.log(500, "❌ Error: " + e);
            }


        }
    })



program
    .command('prompt <i1> [i2]')
    .alias('p')
    .description("Prompt the model")
    .option('-t, --temperature <temperature>', 'Temperature (not supported in chatGPT)', '0')
    .option('-m, --max_tokens <max_tokens>', 'Max Tokens (not supported in chatGPT)', '100')
    .option('-e, --engine <engine>', 'Engine model', 'chatgpt-unofficial')
    .option("-j --json", "Output JSON", false)
    .action((i1,i2, options) => {
        const printResponse = (response) => {
            if (options.json) {
                console.log(JSON.stringify({
                    status: 200,
                    prompt: i1,
                    response: response
                }));
                return;
            }

            logbot.log(200, `💌 Response:\n ${response}`)
        }

        if (options.engine === "chatgpt") {
            logbot.log(100, `🖋️Your Prompt:\n "${i1}"`)

            run(options.engine, i1, options.temperature, options.max_tokens).then((r) => {
                printResponse(r);
                process.exit(0)
            }).catch((e) => {
                logbot.log(500, `❌ Error: ${e}`)
                process.exit(1)
            })
        } else {
            const promptText = (!i2) ? i1 : `Do the following: ${i1}\n\nUsing the following content as reference:\n\n${i2}\n\nCompletion:`;
            logbot.log(100, `🖋️Your Prompt:\n "${promptText}"`)
            run(options.engine, promptText, options.temperature, options.max_tokens).then(r => {
                printResponse(r);
                process.exit(0)
            }).catch((e) => {
                logbot.log(500, `❌ Error: ${e}`)
                process.exit(1)
            })
        }

    });

program.command('list')
    .alias('l')
    .description('List all engines')
    .option("-j --json", "Output as JSON")
    .action((options) => {

        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);

        openai.listModels().then((response) => {
            const modelsUnsorted = response.data.data.map((e) => e.id);
            const models = modelsUnsorted.sort();

            if (options.json) {
                console.log(JSON.stringify(models));
                process.exit(0)
            }

            console.log(["📖 Engines:"].concat(models).join("\n"));
            process.exit(0)
        }).catch((err) => {
            console.log(err.response.data.error);
        })
    })

program.parse(process.argv)