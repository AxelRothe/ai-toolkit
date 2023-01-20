import {program} from "commander";
import {prompt} from "enquirer";
import logbot from "logbotjs";
import dotenv from 'dotenv'
dotenv.config()
export default function(program, run) {

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

}