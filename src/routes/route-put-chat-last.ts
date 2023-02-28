import fs from "fs";
import path from "path";
import RouteResult from "../RouteResult";

export default {
  method: "put",
  url: "/chat/:id/last",
  handler: async (req, server) => {
    const { id } = req.params;
    const { prompt, response } = req.body;
    //if both prompt and response are empty, return error
    if (!prompt && !response) {
      return new RouteResult(400, "Bad Request");
    }

    //find chat
    const chat = server.chats.find((chat) => chat.id === id);

    if (!chat) {
      return new RouteResult(404, "Chat not found");
    }
    if (!chat.owner === req.get("authorization").split(" ")[1]) {
      return new RouteResult(401, "Unauthorized");
    }

    chat.thread[chat.thread.length - 1].prompt =
      prompt || chat.thread[chat.thread.length - 1].prompt;
    chat.thread[chat.thread.length - 1].response =
      response || chat.thread[chat.thread.length - 1].response;

    //save the chat as json to the server as a file for later use
    fs.writeFileSync(
      path.join(server.PATH_CACHE, "/chats/", id + ".json"),
      JSON.stringify(chat)
    );
    return new RouteResult(200, chat);
  },
};
