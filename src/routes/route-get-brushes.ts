import RouteResult from "../RouteResult";

export default {
  method: "get",
  url: "/brush/",
  handler: async (req, server) => {
    try {
      const owner = req.get("authorization").split(" ")[1];
      const userBrushes = server.brushes.filter(
        (brush) => brush.owner === owner
      );
      return new RouteResult(200, userBrushes);
    } catch (e) {
      return new RouteResult(500, { error: e });
    }
  },
};
