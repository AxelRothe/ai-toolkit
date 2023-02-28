import fs from "fs";
import path from "path";
import RouteResult from "../RouteResult";

export default {
  method: "delete",
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

      server.brushes.splice(server.brushes.indexOf(brush), 1);
      fs.unlinkSync(
        path.join(server.PATH_CACHE, "/brushes/", brushId + ".json")
      );
      return new RouteResult(200, "Brush deleted");
    } catch (e) {
      return new RouteResult(500, { error: e });
    }
  },
};
