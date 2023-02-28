import fs from "fs";
import path from "path";
import RouteResult from "../RouteResult";

export default {
  method: "delete",
  url: "/chat/:id",
  handler: async (req, server) => {
    const id = req.params.id;
    const chat = server.chats.find((chat) => chat.id === id);
    if (!chat) {
      return new RouteResult(404, "Chat not found");
    }
    if (!chat.owner === req.get("authorization").split(" ")[1]) {
      return new RouteResult(401, "Unauthorized");
    }

    server.chats.splice(server.chats.indexOf(chat), 1);
    fs.unlinkSync(path.join(server.PATH_CACHE, "/chats/", id + ".json"));
    return new RouteResult(200, "Chat deleted");
  },
};
