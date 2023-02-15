/**
 * Entry Point for Vue
 */
import { createApp } from "vue";
import appContainer from "./src/app.js";
import components from "./src/components/index.js";
import pages from "./src/pages/index.js";

const UI = {
  /**
   * Starts the Vue Renderer
   *
   * @returns {Vue}
   */
  render(config = {}) {
    const app = createApp({
      template: `<app></app>`,
      data: () => {
        return {
          config: config,
        };
      },
      /* define all main components here, sub components of components should be nested */
      components: {
        app: appContainer,
      },
    });
    for (let key in components) {
      app.component(key, components[key]);
    }
    for (let key in pages) {
      app.component(key, pages[key]);
    }
    app.mount("#app");
  },
};
UI.render();
