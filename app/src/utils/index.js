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

const convertSerialToObj = (arr, index, value) => {
  let resultObj = {};
  arr.forEach((item) => {
    resultObj[item[index]] = item[value];
  });
  return resultObj;
};

export default {
  Snackbar,
  prettyMs,
  convertSerialToObj,
};
