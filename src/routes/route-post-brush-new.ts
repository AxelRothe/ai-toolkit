import fs from "fs";
import path from "path";
import RouteResult from "../RouteResult";

export default {
  method: "post",
  url: "/brush/",
  handler: async (req, server) => {
    try {
      const { title, instruction, model, temperature } = req.body;

      const newId = Math.random().toString(36).substring(7);
      //this is a new brush
      const brush = {
        id: newId,
        owner: req.get("authorization").split(" ")[1],
        title,
        instruction,
        model,
        temperature,
      };
      server.brushes.push(brush);
      //save the brush to the server as a file for later use
      fs.writeFileSync(
        path.join(server.PATH_CACHE, "/brushes/", newId + ".json"),
        JSON.stringify(brush)
      );
      return new RouteResult(200, { status: "created", brush });
    } catch (e) {
      return new RouteResult(500, { error: e });
    }
  },
};
