import {program} from "commander";
import logbot from "logbotjs";
import dotenv from 'dotenv'
dotenv.config()
export default function(program, core) {
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

                core(options.engine, i1, options.temperature, options.max_tokens).then((r) => {
                    printResponse(r);
                    process.exit(0)
                }).catch((e) => {
                    logbot.log(500, `❌ Error: ${e}`)
                    process.exit(1)
                })
            } else {
                const promptText = (!i2) ? i1 : `Do the following: ${i1}\n\nUsing the following content as reference:\n\n${i2}\n\nCompletion:`;
                logbot.log(100, `🖋️Your Prompt:\n "${promptText}"`)
                core(options.engine, promptText, options.temperature, options.max_tokens).then(r => {
                    printResponse(r);
                    process.exit(0)
                }).catch((e) => {
                    logbot.log(500, `❌ Error: ${e}`)
                    process.exit(1)
                })
            }

        });

}