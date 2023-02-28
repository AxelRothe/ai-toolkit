import RouteResult from "../RouteResult";

export default {
  method: "get",
  url: "/balance",
  handler: async (req, server) => {
    return new RouteResult(200, {
      balance: await server.core.database.getBalance(
        req.get("authorization").split(" ")[1]
      ),
    });
  },
};
