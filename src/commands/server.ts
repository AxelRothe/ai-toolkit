import RESTServer from "../RESTServer";

export default function (program, core) {
  program
    .command("server")
    .option("-p, --port <port>", "Port to run server on", 8000)
    .description("Starts a server to run commands from")
    .action(async (options) => {
      const ServerInstance = new RESTServer(core, options.port);
      await ServerInstance.init();
    });
}
