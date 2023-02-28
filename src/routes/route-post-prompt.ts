import RouteResult from "../RouteResult";
import { response } from "express";

export default {
  method: "post",
  url: "/prompt/:engine",
  handler: async (req, server) => {
    const engine = req.params.engine;
    const {
      prompt,
      temperature,
      max_tokens,
      model,
      input,
      instruction,
      stop_sequences,
    } = req.body;
    let completionRequest, response, usage;

    const token = req.get("authorization").split(" ")[1];

    if (engine === "aleph-alpha") {
      completionRequest = await server.run("aleph-alpha", {
        token,
        prompt,
        temperature,
        maximum_tokens: max_tokens,
        model,
        stop_sequences,
      });
      response = completionRequest.completion;
      usage = completionRequest.usage;

      return new RouteResult(200, {
        response,
        usage,
      });
    } else if (engine === "gpt-3") {
      completionRequest = await server.run("gpt-3", {
        token,
        prompt,
        temperature,
        max_tokens,
        model,
        input,
        instruction,
      });
      response = completionRequest.result.choices[0].text;
      usage = completionRequest.result.usage;

      if (completionRequest.status === 200) {
        return new RouteResult(200, {
          prompt,
          response,
          usage,
        });
      } else {
        return new RouteResult(completionRequest.status, {
          error: completionRequest.result,
        });
      }
    } else {
      return new RouteResult(400, "Invalid engine");
    }
  },
};
