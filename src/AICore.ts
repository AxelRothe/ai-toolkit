import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config();
import logbot from "logbotjs";
import { DeepJS } from "deepvajs";
import { AlephAlpha } from "alephalphajs";
import * as fs from "fs";
import axios from "axios";
import { AlephAlphaOptions, DeepVAOptions, UsageOptions } from "./interfaces";
import DatabaseNinox from "./databases/DatabaseNinox";
import DatabaseFS from "./databases/DatabaseFS";

class AICore {
  private openai: OpenAIApi | undefined = undefined;
  private deepjs: DeepJS | undefined = undefined;
  private alephalpha: AlephAlpha | undefined = undefined;

  private database: DatabaseFS | DatabaseNinox | undefined = undefined;
  private readonly cost_factor: number;

  constructor() {
    this.cost_factor = Number(process.env.SERVER_CONVERSION_FAKTOR) || 1;
  }
  async init() {
    if (process.env.DATABASE === "fs") {
      if (!process.env.SERVER_PATH_CACHE)
        throw new Error("❌ Error loading fs database");

      this.database = new DatabaseFS({
        path: process.env.SERVER_PATH_CACHE,
      });
    } else if (process.env.DATABASE === "ninox") {
      if (
        !process.env.NINOX_TOKEN ||
        !process.env.NINOX_DATABASE ||
        !process.env.NINOX_TEAM
      )
        throw new Error("❌ Error loading ninox database");

      this.database = new DatabaseNinox({
        token: process.env.NINOX_TOKEN,
        database: process.env.NINOX_DATABASE,
        team: process.env.NINOX_TEAM,
      });
      await this.database.auth();
    } else {
      throw new Error("❌ Error loading database");
    }

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

    //check if user has a aleph alpha token
    if (process.env.ALEPH_ALPHA_API_KEY) {
      logbot.log(100, "✅ Aleph Alpha Key found");
      this.alephalpha = new AlephAlpha({
        API_TOKEN: process.env.ALEPH_ALPHA_API_KEY,
      });
    } else {
      logbot.log(
        404,
        "❌ Aleph Alpha is not available. No ALEPH_ALPHA_API_KEY found in .env file"
      );
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
            cost: (response.data.usage.total_tokens * (0.02/1000)) * this.cost_factor,
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

  async runAlephAlpha(options: AlephAlphaOptions): Promise<any> {
    if (!this.alephalpha) throw new Error("AlephAlpha not available");

    try {
      const res = await this.alephalpha.completion(options);

      const usage = {
        prompt_tokens: res.usage.prompt_tokens,
            completion_tokens: res.usage.completion_tokens,
            cost: res.usage.cost * this.cost_factor,
            images_count: res.usage.images_count,
      };

      await this.saveUsage({
        token: options.token,
        engine: "aleph-alpha",
        usage
      });
      return {
        completion : res.completion,
        usage
      };
    } catch (e: any) {
      logbot.log(500, "❌ Error running Aleph Alpha " + e.message);
      throw new Error(e.message);
    }
  }

  /**
   * Prompts a model with a prompt and returns the response which will vary depending on the model
   *
   * @param engine The engine to use default is gpt-3
   * @param options {GPTOptions | DeepVAOptions | AlephAlphaOptions} The options to use
   */
  async run(engine: string = "gpt-3", options): Promise<any> {
    if (!this.database)
      throw new Error("Database is not available, please init first");
    if ((await this.database.getBalance(options.token)) <= 0)
      throw new Error(
        `You have no tokens left. You can purchase more at ${process.env.SERVER_CONVERSION_URL}`
      );

    try {
      if (engine === "deepva") {
        return await this.runDeepVA(options);
      }
      if (engine === "gpt-3") {
        return await this.runOpenAI(options);
      }
      if (engine === "aleph-alpha") {
        return await this.runAlephAlpha(options);
      }
      throw new Error("Engine not found");
    } catch (e: any) {
      console.log(e);
      throw new Error("❌ Error running model " + engine);
    }
  }

  saveUsage(options: UsageOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.database) throw new Error("Database not available");
      this.database.saveUsage(options).then((r) => {
        if (r) resolve(true);
      });
    });
  }
}
export default new AICore();
