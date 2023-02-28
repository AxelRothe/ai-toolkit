import RouteResult from "../RouteResult";

export default {
  method: "get",
  url: "/chats",
  handler: async (req, server) => {
    try {
      const owner = req.get("authorization").split(" ")[1];
      const userChats = server.chats.filter((chat) => chat.owner === owner);
      return new RouteResult(
        200,
        userChats.map((chat) => chat.id)
      );
    } catch (e) {
      return new RouteResult(500, { error: e });
    }
  },
};
