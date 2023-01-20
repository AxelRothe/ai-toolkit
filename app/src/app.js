import axios from 'axios';

export default {
    components: {
    },
    template: `
      <div class="no-token" v-if="!token">
        <h1><icon i="key-fill"/> No Token Detected</h1>
        <input v-model="input.token" placeholder="Your Token"/><button @click="setToken"><icon i="unlock" /> Set Token</button>
        <div class="error" v-if="error.length > 0"><icon i="cone-striped" /> {{error}}</div>
      </div>
      <div v-else class="app chat-bot">
        <div class="chat-bot-information">
          {{chatId ? "#" + chatId : "No Chat ID"}}
        </div>

        <!-- ChatBot Body -->

        <div class="outer">
          <div class="chat-bot-chat-history">
            <h2>Your Chats</h2>
            <div v-for="chat in chats">
              <a :href="'/chat/' + chat"><icon i="chat-fill"/> {{chat}}</a> <icon i="trash" @click="deleteChat(chat)"/>
            </div>
          </div>
          <div class="chat-bot-body-outer">
            <div class="chat-bot-body">
              <div v-for="prompt in history" class="prompt" v-if="history.length > 0">
                <div class="prompt-text">
                  <div class="prompt-text-info">
                    You
                  </div>
                  <div class="prompt-text-content">
                    {{prompt.prompt}}
                  </div>
                </div>
                <div class="prompt-response">
                  <div class="prompt-text-info">
                    Bot
                  </div>
                  <div class="prompt-text-content">
                    {{prompt.response}}
                  </div>
                </div>
              </div>
              <div v-else>
                Enter your first prompt to start a conversation.
              </div>
            </div>
          </div>
        </div>
    
        <!-- ChatBot Input -->
        <div class="prompt-input">
            <div class="prompt-input-text">
                <textarea v-model="input.prompt" :disabled="!allowInput" @keyup.enter="send" placeholder="Type your prompt here..."></textarea>
            </div>
            <div class="prompt-input-action" @click="send" v-if="allowInput">
                <button :disabled="!allowInput"><icon i="terminal" /> Prompt</button>
            </div>
              <div class="prompt-input-action" v-else>
                Loading...
              </div>
        </div>
    </div>
    `,
    data: () => ({
        history: [],
        allowInput: true,
        chatId: null,
        token: undefined,
        input: {
            token: "",
            prompt: "",
        },
        error: "",
        chats : []
    }),
    async mounted() {
        if (!this.token && localStorage.getItem("token")){
            this.token = localStorage.getItem("token");

            if (await this.testToken(this.token)){
                this.getPageFromURL();
                this.fetchChats();
            }
        }
    },
    methods: {
        async send() {
            this.allowInput = false;
            if (this.history.length === 0) {
                this.chatId = await this.newChat(this.input.prompt);
                //set url
                window.history.pushState({}, "", "/chat/" + this.chatId);
                this.allowInput = true;
            } else {
                await this.continueChat(this.chatId, this.input.prompt)
                this.allowInput = true;
            }

            this.input = "";
        },
        fetchChats() {
            return new Promise((resolve, reject) => {
                axios.get("/api/chats", {
                    headers: {
                        "Authorization": "Bearer " + this.token
                    }
                }).then((response) => {
                    this.chats = response.data;
                    resolve();
                }).catch((error) => {
                    reject(error);
                })
            })
        },
        getPageFromURL() {
            const url = window.location.pathname;
            const chatId = url.split("/")[2];
            if (chatId) {
                this.chatId = chatId;
                 this.getPreviousChat(this.chatId).then(r => {
                    console.log("Got Chat.")
                })
            }
        },
        appendToHistory(prompt, response) {
            this.history.push({
                prompt,
                response,
            });
            this.scrollToBottom()
        },
        testToken(token = this.input.token){
            return new Promise((resolve, reject) => {
                axios.get("/api/auth", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                }).then(r => {
                    resolve(true);
                }).catch(e => {
                    token = undefined;
                    localStorage.removeItem("token");
                    reject(e);
                })
            })
        },
        setToken(){
            return new Promise((resolve, reject) => {
                this.testToken().then(r => {
                    this.token = this.input.token;
                    localStorage.setItem("token", this.token);
                    console.log("Token Set", this.token);
                    this.getPageFromURL();
                }).catch(e => {
                    this.setError("Invalid Token")
                    reject();
                })
            })
        },
        setError(error){
            this.error = error;
            setTimeout(() => {
                this.error = null;
            }, 5000)
        },
        scrollToBottom() {
            setTimeout(() => {
                //scroll to bottom
                const chatBotBody = this.$el.querySelector(".chat-bot-body");
                chatBotBody.scrollTop = chatBotBody.scrollHeight;
            },0);
        },
        newChat(text) {
            return new Promise((resolve, reject) => {
                axios.post("/api/chat/new", {
                    prompt: text,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + localStorage.getItem("token"),
                    }
                }).then((response) => {
                    this.fetchChats();
                    this.appendToHistory(text, response.data.response);
                    resolve(response.data.id)
                });
            })
        },
        continueChat(id, text) {
            return new Promise((resolve, reject) => {
                axios.post("/api/chat/"+ id, {
                    prompt: text,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + localStorage.getItem("token"),
                    }
                }).then((response) => {
                    this.appendToHistory(text, response.data.response);
                    resolve(response.data)
                });
            })
        },
        getPreviousChat(id){
            return new Promise((resolve, reject) =>{
                axios.get("/api/chat/"+id, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + localStorage.getItem("token"),
                    }
                }).then(response=>{
                    response.data.thread.forEach(item=>{
                        this.appendToHistory(item.prompt, item.response);
                    })
                    resolve(response.data)
                })
            })
        },
        deleteChat(id) {
            return new Promise((resolve, reject) => {
                axios.delete("/api/chat/" + id, {
                    headers: {
                        "Authorization": "Bearer " + localStorage.getItem("token"),
                    }
                }).then(r => {
                    if (this.chatId === id) {
                        this.history = [];
                        this.chatId = null;
                        window.history.pushState({}, "", "/");
                    }
                    this.fetchChats();
                }).catch(e => {
                    reject(e);
                })
            })
        }
    },
};
