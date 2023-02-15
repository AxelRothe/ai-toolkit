import Snackbar from "./snackbar.js";
import prettyMilliseconds from "pretty-ms";

const prettyMs = (ms) => {
  try {
    return prettyMilliseconds(ms, { colonNotation: true });
  } catch (e) {
    console.error(e);
    return ms;
  }
};

export default {
  Snackbar,
  prettyMs,
};
