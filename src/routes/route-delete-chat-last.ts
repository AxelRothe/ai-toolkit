import fs from "fs";
import path from "path";
import RouteResult from "../RouteResult";
export default {
  method: "delete",
  url: "/chat/:id/last",
  handler: async (req, server) => {
    const { id } = req.params;
    //find chat
    const chat = server.chats.find((chat) => chat.id === id);
    if (!chat) {
      return new RouteResult(404, "Chat not found");
    }
    if (!chat.owner === req.get("authorization").split(" ")[1]) {
      return new RouteResult(401, "Unauthorized");
    }

    chat.thread.pop();
    //save the chat as json to the server as a file for later use
    fs.writeFileSync(
      path.join(server.PATH_CACHE, "/chats/", id + ".json"),
      JSON.stringify(chat)
    );
    return new RouteResult(200, chat);
  },
};
