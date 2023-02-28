import fs from "fs";
import path from "path";
import RouteResult from "../RouteResult";

export default {
  method: "post",
  url: "/chat/new",
  handler: async (req, server) => {
    const { model, prompt, temperature, max_tokens } = req.body;
    const id = Math.random().toString(36).substring(7);

    const promptText = "Request:\n" + prompt + "\nResponse:\n";
    const response = await server.run("gpt-3", {
      token: req.get("authorization").split(" ")[1],
      prompt: promptText,
      temperature,
      max_tokens,
      model,
    });

    if (response.status === 200) {
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
      server.chats.push(chat);

      //save the chat as json to the server as a file for later use
      fs.writeFileSync(
        path.join(server.PATH_CACHE, "/chats/", id + ".json"),
        JSON.stringify(chat)
      );

      return new RouteResult(200, {
        id,
        prompt: promptText,
        response: response.result.choices[0].text,
        usage: response.result.usage,
      });
    } else {
      return new RouteResult(500, {
        error: response.result,
      });
    }
  },
};
