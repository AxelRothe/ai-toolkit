import Snackbar from "node-snackbar";

export default function(message, btn = { text: "OK", action: () => {} }) {
    Snackbar.show({
        text: message,
        pos: "top-center",
        actionText: btn.text,
        actionHandler: btn.action || undefined,
    })
}