import {Configuration, OpenAIApi} from 'openai'
import dotenv from 'dotenv'
dotenv.config()
import chatGPT from "chatgpt-io";
import logbot from "logbotjs";


export default async (model = 'text-davinci-003', prompt, temperature = 0.6, max_tokens = 200) => {
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