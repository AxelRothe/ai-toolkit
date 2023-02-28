import RouteResult from "../RouteResult";

export default {
  method: "get",
  url: "/auth",
  handler: async (req, server) => {
    return new RouteResult(200, true);
  },
};
