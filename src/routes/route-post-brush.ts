import fs from "fs";
import path from "path";
import RouteResult from "../RouteResult";

export default {
  method: "post",
  url: "/brush/:brushId",
  handler: async (req, server) => {
    try {
      const { title, instruction, model, temperature } = req.body;
      const { brushId } = req.params;

      //this is a brush that has already been created
      const brush = server.brushes.find((brush) => brush.id === brushId);
      if (!brush) {
        return new RouteResult(404, "Brush not found");
      }

      if (!brush.owner === req.get("authorization").split(" ")[1]) {
        return new RouteResult(401, "Unauthorized");
      }

      //update brush
      brush.title = title || brush.title;
      brush.instruction = instruction || brush.instruction;
      brush.model = model || brush.model;
      brush.temperature = temperature || brush.temperature;
      //save the brush to the server as a file for later use
      fs.writeFileSync(
        path.join(server.PATH_CACHE, "/brushes/", brush.id + ".json"),
        JSON.stringify(brush)
      );
      return new RouteResult(200, { status: "updated", brush });
    } catch (e) {
      return new RouteResult(500, { error: e });
    }
  },
};
