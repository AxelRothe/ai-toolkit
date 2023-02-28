import fs from "fs";
import path from "path";
import RouteResult from "../RouteResult";

export default {
  method: "post",
  url: "/chat/:id",
  handler: async (req, server) => {
    const { model, prompt, temperature, max_tokens } = req.body;
    const id = req.params.id;
    //find chat
    const chat = server.chats.find((chat) => chat.id === id);
    if (!chat) {
      return new RouteResult(404, "Chat not found");
    }
    if (!chat.owner === req.get("authorization").split(" ")[1]) {
      return new RouteResult(401, "Unauthorized");
    }

    //rebuild history for prompt
    let history = "";
    chat.thread.forEach((message) => {
      history +=
        "Request:\n" +
        message.prompt +
        "\nResponse:\n" +
        message.response +
        "\n";
    });
    const promptText = history + "Request:\n" + prompt + "\nResponse:\n";
    const response = await server.run("gpt-3", {
      token: req.get("authorization").split(" ")[1],
      prompt: promptText,
      temperature,
      max_tokens,
      model,
    });
    if (response.status === 200) {
      //add new chat to chats
      chat.thread.push({
        prompt,
        response: response.result.choices[0].text,
        usage: response.result.usage,
      });

      chat.usage.total_tokens += response.result.usage.total_tokens;
      chat.usage.prompt_tokens += response.result.usage.prompt_tokens;
      chat.usage.completion_tokens += response.result.usage.completion_tokens;

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
      return new RouteResult(response.status, {
        error: response.result,
      });
    }
  },
};
