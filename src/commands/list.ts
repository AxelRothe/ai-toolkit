import {program} from "commander";
import {Configuration, OpenAIApi} from "openai";
import dotenv from 'dotenv'
dotenv.config()
export default function(program, core) {
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

}