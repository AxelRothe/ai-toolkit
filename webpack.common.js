import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  entry: {
    app: "./app/index.js",
  },
  resolve: {
    alias: {
      vue$: "vue/dist/vue.esm-bundler.js", // 'vue/dist/vue.common.js' for webpack 1
      handlebars: "handlebars/dist/handlebars.min.js",
    },
  },
  output: {
    filename: "[name].js",
    path: __dirname + "/httpdocs/build",
    clean: true,
  },
};
