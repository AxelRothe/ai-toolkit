import axios from "axios";

export default {
  components: {},
  template: `
    <div class="no-token" v-if="!token">
      <h1><icon i="key-fill"/> No Token Detected</h1>
      <input v-model="input.token" placeholder="Your Token"/><button @click="setToken()"><icon i="unlock" /> Set Token</button>
      <div class="error" v-if="error && error.length > 0"><icon i="cone-striped" /> {{error}}</div>
    </div>
    <div class="app" v-else-if="currentPage">
      <div class="app-navigation">
        <navigation :page="currentPage" :pages="pages" />
      </div>
      <div class="app-content">
        <component :is="currentPage.component" :token="token" :query="http.query"/>
      </div>
    </div>  
    
    `,
  data: () => ({
    token: undefined,
    input: {
      token: "",
    },
    error: "",
    currentPage: undefined,
    http: {
      pathname: "",
      query: {},
    },
    pages: {
      chat: {
        title: "Chat",
        component: "chat",
        icon: "chat",
        description:
          "WrangleBot is a free and open source app for managing your media archive.",
      },
      brushes: {
        title: "Brushes",
        component: "brushes",
        icon: "brush",
        description:
          "WrangleBot is a free and open source app for managing your media archive.",
      },
    },
  }),
  async mounted() {
    if (!this.token && localStorage.getItem("token")) {
      this.token = localStorage.getItem("token");

      if (await this.testToken(this.token)) {
        await this.getPageFromURL();
      }
    }
  },
  methods: {
    /**
     * Test if the token is valid.
     * @throws Error if token is invalid.
     * @param token
     * @returns {Promise<true>}
     */
    testToken(token = this.input.token) {
      return new Promise((resolve, reject) => {
        axios
          .get("/api/auth", {
            headers: {
              Authorization: "Bearer " + token,
            },
          })
          .then((r) => {
            resolve(true);
          })
          .catch((e) => {
            token = undefined;
            localStorage.removeItem("token");
            reject(e);
          });
      });
    },
    /**
     * Sets the token and saves it to local storage.
     * @param token {string} The token to set.
     * @returns {Promise<void>}
     */
    async setToken(token = this.input.token) {
      try {
        await this.testToken();
        this.token = token;
        localStorage.setItem("token", this.token);
        await this.getPageFromURL();
        await this.fetchChats();
      } catch (e) {
        this.setError("Invalid Token");
      }
    },
    getPageFromURL() {
      const url = window.location.pathname;
      //get page from url with regex
      //example /home/1234 -> home, 1234
      const page = url.match(/\/([a-z]+)\/?([a-z0-9]+)?/i);
      if (page && page.length > 1) {
        const pageName = page[1];
        this.http.query = page[2] || "";
        if (page && this.pages[pageName]) {
          this.currentPage = this.pages[pageName];
        }
      } else {
        this.currentPage = this.pages.chat;
      }
    },
  },
};
