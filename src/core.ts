import {Configuration, OpenAIApi} from 'openai'
import dotenv from 'dotenv'
import chatGPT from "chatgpt-io";
import logbot from "logbotjs";
import { DeepJS } from "deepvajs"
import {VisualMiningModule} from "deepvajs/build/VisualMiningModule";

dotenv.config()

class AICore {
    private openai: OpenAIApi | undefined;
    private chatgpt: chatGPT | undefined;
    private deepjs : DeepJS | undefined;
    constructor() {

        //check if the user has a chatgpt token
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}));
            logbot.log(100, "✅ OpenAI API Key found")
        } else {
            logbot.log(404, "❌ OpenAI not available. No OPENAI_API_KEY found in .env file");
        }

        //check if the user has an open ai token
        if (process.env.OPENAI_API_SESSION_TOKEN) {
            // @ts-ignore
            this.chatgpt = new chatGPT(process.env.OPENAI_API_SESSION_TOKEN,{
                // @ts-ignore
                logLevel: 0
            })
            logbot.log(100, "✅ ChatGPT API Key found")
        } else {
            logbot.log(404, "❌ ChatGPT not available. No OPENAI_API_SESSION_TOKEN found in .env file");
        }

        //check if user has a deepva token
        if (process.env.DEEPVA_API_KEY) {
            logbot.log(100, "✅ DeepVA Token found")
            this.deepjs = new DeepJS({
                apiUrl: "https://api.deepva.com/api/v1",
                apiAuthPrefix: "Key",
                apiKey: process.env.DEEPVA_API_KEY
            })

        } else {
            logbot.log(404, "❌ DeepVA not available. No DEEPVA_TOKEN found in .env file");
        }
    }

    /**
     * prompts the chatGPT model with a prompt and returns the response
     * @returns {Promise<string>}
     * @param options
     */
    async runChatGPT(options): Promise<string> {
        if (!this.chatgpt) throw new Error("ChatGPT not available");

        try {
            await this.chatgpt.waitForReady();
            return await this.chatgpt.ask(options.message);
        } catch (e: any){
            throw new Error(e.message)
        }
    }

    async runOpenAI(options) : Promise<any> {
        if (!this.openai) throw new Error("OpenAI not available");

        const response = await this.openai.createCompletion({
            model: options.model || "text-davinci-003",
            prompt: options.prompt || 'The user forgot to provide a prompt. Please tell the user politely to provide a prompt.',
            temperature: options.temperature || 0.8,
            max_tokens : options.max_tokens || 1000
        })
        //check if the response is valid
        if (response.data) {
            return response.data;
        }
        //else
        throw new Error("Invalid response from OpenAI")
    }

    async runDeepVA(options : DeepVAOptions) : Promise<any> {
        if (!this.deepjs) throw new Error("DeepVA not available");

        try {

            const res = await this.deepjs.createJob(options.sources, options.visionModules)
            logbot.log(200, "Job created : " + res.id);

            return await this.deepjs.waitForJob(res.id)
        } catch (e: any){
            logbot.log(500, "❌ Error running deepVA " + e.message)
            throw new Error(e.message)
        }
    }

    /**
     * Prompts a model with a prompt and returns the response which will vary depending on the model
     *
     * @param engine The engine to use default is gpt-3
     * @param options {GPTOptions | chatGPTOptions | DeepVAOptions} The options to use
     */
    async run(engine : string = 'gpt-3', options) : Promise<any> {
        try {

            if (engine === 'chatgpt') {
                return await this.runChatGPT(options)
            }
            if (engine === 'deepva') {
                return await this.runDeepVA(options)
            }
            if (engine === 'gpt-3') {
                return await this.runOpenAI(options)
            }

        } catch (e : any) {
            console.log(e)
            throw new Error("❌ Error running model " + engine)
        }
    }
}

interface GPTOptions {
    prompt: string
    temperature? : number
    max_tokens?: number
}

interface chatGPTOptions {
    prompt: string
}

interface DeepVAOptions {
    sources : string[]
    visionModules : VisualMiningModule[]
}

export default new AICore()