import server from "./server";
import list from "./list";
import prompt from "./prompt";
import chat from "./chat";

export default function(program, core) {
    server(program, core);
    list(program, core);
    prompt(program, core);
    chat(program, core);
}