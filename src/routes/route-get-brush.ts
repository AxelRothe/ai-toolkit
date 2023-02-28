import RouteResult from "../RouteResult";

export default {
  method: "get",
  url: "/brush/:brushId",
  handler: async (req, server) => {
    try {
      const { brushId } = req.params;
      const brush = server.brushes.find((brush) => brush.id === brushId);
      if (!brush) {
        return new RouteResult(404, "Brush not found");
      }

      if (!brush.owner === req.get("authorization").split(" ")[1]) {
        return new RouteResult(401, "Unauthorized");
      }

      return new RouteResult(200, brush);
    } catch (e) {
      return new RouteResult(500, { error: e });
    }
  },
};
