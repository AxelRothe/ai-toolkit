import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import chatGPT from "chatgpt-io";
import logbot from "logbotjs";
import { DeepJS } from "deepvajs";
import { VisualMiningModule } from "deepvajs/build/VisualMiningModule";
import * as fs from "fs";
import axios from "axios";

dotenv.config();

class AICore {
  private readonly openai: OpenAIApi | undefined;
  private readonly chatgpt: chatGPT | undefined;
  private readonly deepjs: DeepJS | undefined;
  constructor() {
    //check if the user has a chatgpt token
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAIApi(
        new Configuration({ apiKey: process.env.OPENAI_API_KEY })
      );
      logbot.log(100, "✅ OpenAI API Key found");
    } else {
      logbot.log(
        404,
        "❌ OpenAI not available. No OPENAI_API_KEY found in .env file"
      );
    }

    //check if the user has an open ai token
    if (process.env.OPENAI_API_SESSION_TOKEN) {
      // @ts-ignore
      this.chatgpt = new chatGPT(process.env.OPENAI_API_SESSION_TOKEN, {
        // @ts-ignore
        logLevel: 0,
      });
      logbot.log(100, "✅ ChatGPT API Key found");
    } else {
      logbot.log(
        404,
        "❌ ChatGPT not available. No OPENAI_API_SESSION_TOKEN found in .env file"
      );
    }

    //check if user has a deepva token
    if (process.env.DEEPVA_API_KEY) {
      logbot.log(100, "✅ DeepVA Token found");
      this.deepjs = new DeepJS({
        apiUrl: "https://api.deepva.com/api/v1",
        apiAuthPrefix: "Key",
        apiKey: process.env.DEEPVA_API_KEY,
      });
    } else {
      logbot.log(
        404,
        "❌ DeepVA not available. No DEEPVA_TOKEN found in .env file"
      );
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
    } catch (e: any) {
      console.log(e);
      throw new Error(e.message);
    }
  }

  async runOpenAI(options): Promise<any> {
    if (!this.openai) throw new Error("OpenAI not available");
    try {
      let response;

      if (
        options.model &&
        (options.model === "text-davinci-edit-001" ||
          options.model === "code-davinci-edit-001")
      ) {
        response = await axios.post(
          "https://api.openai.com/v1/edits",
          {
            model: options.model,
            instruction: options.instruction,
            input: options.input,
            temperature: options.temperature || 0.8,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );
      } else {
        response = await this.openai.createCompletion({
          model: options.model || "text-davinci-003",
          prompt:
            options.prompt ||
            "The user forgot to provide a prompt. Please tell the user politely to provide a prompt.",
          temperature: options.temperature || 0.8,
          max_tokens: options.max_tokens || 1000,
        });
      }

      if (response.data && response.data.usage) {
        //save usage to database
        await this.saveUsage({
          token: options.token,
          engine: "gpt-3",
          usage: {
            prompt_tokens: response.data.usage.prompt_tokens,
            completion_tokens: response.data.usage.completion_tokens,
            total_tokens: response.data.usage.total_tokens,
          },
        });

        return {
          status: 200,
          result: response.data,
        };
      } else {
        logbot.log(500, "❌ Error saving usage");
        return {
          status: 500,
          result: "❌ Error saving usage",
        };
      }
    } catch (e: any) {
      return {
        status: e.response.status,
        result: e.response.statusText,
      };
    }
  }

  /**
   * run deep VA on the current set of sources
   * @param {DeepVAOptions} options
   * @returns {Promise<any>}
   */
  async runDeepVA(options: DeepVAOptions): Promise<any> {
    if (!this.deepjs) throw new Error("DeepVA not available");

    try {
      const res = await this.deepjs.createJob(
        options.sources,
        options.visionModules
      );
      logbot.log(200, "Job created : " + res.id);

      return await this.deepjs.waitForJob(res.id);
    } catch (e: any) {
      logbot.log(500, "❌ Error running deepVA " + e.message);
      throw new Error(e.message);
    }
  }

  /**
   * Prompts a model with a prompt and returns the response which will vary depending on the model
   *
   * @param engine The engine to use default is gpt-3
   * @param options {GPTOptions | chatGPTOptions | DeepVAOptions} The options to use
   */
  async run(engine: string = "gpt-3", options): Promise<any> {
    try {
      if (engine === "chatgpt") {
        return await this.runChatGPT(options);
      }
      if (engine === "deepva") {
        return await this.runDeepVA(options);
      }
      if (engine === "gpt-3") {
        return await this.runOpenAI(options);
      }
    } catch (e: any) {
      console.log(e);
      throw new Error("❌ Error running model " + engine);
    }
  }

  saveUsage(options: UsageOptions): Promise<any> {
    //save to json file
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(process.env.SERVER_PATH_CACHE + "/usage.json")) {
        fs.writeFileSync(
          process.env.SERVER_PATH_CACHE + "/usage.json",
          JSON.stringify({})
        );
      }

      fs.readFile(
        process.env.SERVER_PATH_CACHE + "/usage.json",
        "utf8",
        (err, data) => {
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
              process.env.SERVER_PATH_CACHE + "/usage.json",
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
        }
      );
    });
  }
}

interface UsageOptions {
  token: string;
  engine: string;
  usage: UsageOptionsUsage;
}

interface UsageOptionsUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface GPTOptions {
  token: string;

  prompt: string;
  temperature?: number;
  max_tokens?: number;
}

interface chatGPTOptions {
  token: string;

  prompt: string;
}

interface DeepVAOptions {
  token: string;

  sources: string[];
  visionModules: VisualMiningModule[];
}

export default new AICore();
