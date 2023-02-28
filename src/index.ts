import { program } from "commander";
import commands from "./commands";
import core from "./AICore";

core.init().then(() => {
  commands(program, core);

  program.parse(process.argv);
});
