import RouteResult from "../RouteResult";

export default {
  method: "get",
  url: "/chat/:id",
  handler: async (req, server) => {
    const { id } = req.params;
    const chat = server.chats.find((chat) => chat.id === id);
    if (chat) {
      if (!chat.owner === req.get("authorization").split(" ")[1]) {
        return new RouteResult(401, "Unauthorized");
      }

      return new RouteResult(200, chat);
    } else {
      return new RouteResult(404, "Chat not found");
    }
  },
};
