/**
 * Entry Point for Vue
 */
import { createApp } from "vue";
import appContainer from "./src";
import components from "./utility";

const UI = {
    /**
     * Starts the Vue Renderer
     *
     * @param {{APP_NAME:string}}config
     * @returns {Vue}
     */
    render(config) {
        const app = createApp({
            template: `<app></app>`,
            data: () => {
                return {
                    config: config,
                };
            },
            mounted() {
                //Sets Window Title to App Name
                document.title = config.APP_NAME;
            },
            /* define all main components here, sub components of components should be nested */
            components: {
                app: appContainer,
            },
        });
        for (let key in components) {
            app.component(key, components[key]);
        }
        app.mount("#app");
    },
};
UI.render({
    APP_NAME: "OpenAI",
});
