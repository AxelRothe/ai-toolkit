const path = require("path");

module.exports = {
    entry: {
        app: "./app/index.js"
    },
    resolve: {
        alias: {
            vue$: "vue/dist/vue.esm-bundler.js", // 'vue/dist/vue.common.js' for webpack 1
        },
    },
    output: {
        filename: "[name].js",
        path: path.join(__dirname, "./httpdocs/build"),
        clean: true,
    },
};
