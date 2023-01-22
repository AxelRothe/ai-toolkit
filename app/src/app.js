import axios from 'axios';
import utils from './utility'

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
        <div class="chat-bot-mobile-menu">
          <h2 class="chat-bot-mobile-menu-title">Your Chats</h2>
          <div class="mobile-menu-chat-history">
            <div class="mobile-menu-chat-history-item">
              <a class="chat-bot-mobile-menu-button" :href="'/'"><icon size="2" i="plus-circle-dotted"/> New</a>
            </div>
            <div class="mobile-menu-chat-history-item" v-for="chat in chats">
              <a class="chat-bot-mobile-menu-button" :href="'/chat/' + chat"><icon size="2" i="chat-fill"/> {{chat}}</a> <icon size="2" i="trash" @click="deleteChat(chat)"/>
            </div>
          </div>
        </div>
      
        <div class="chat-bot-information">
          
          <div class="chat-bot-mobile-menu-button">
            <button @click="toggleMobileMenu"><icon i="list" /></button>
          </div>
          
          <div class="chat-bot-chat-id">
            <icon i="chat-square-text"></icon> {{chatId ? chatId : "No Chat ID"}}
          </div>
        </div>

        <!-- ChatBot Body -->

        <div class="outer">
          <div class="chat-bot-sidebar">
            <h2>Your Chats</h2>
            <div class="chat-bot-chat-history">
              <div class="chat-bot-chat-history-item">
                <a class="chat-bot-chat-history-button" :href="'/'"><icon class="icon-button" i="plus-circle-dotted"/> New</a>
              </div>
              <div class="chat-bot-chat-history-item" v-for="chat in chats">
                <a class="chat-bot-chat-history-button"  :href="'/chat/' + chat"><icon i="chat-fill"/> {{chat}}</a> <icon class="icon-button" i="trash" @click="deleteChat(chat)"/>
              </div>
            </div>
          </div>
          <div class="chat-bot-body-outer">
            <div class="chat-bot-body">
              <div v-for="(prompt, index) in history" class="prompt" v-if="history.length > 0">
                <div class="prompt-text">
                  <div class="prompt-text-info">
                    You
                  </div>
                  <div class="prompt-text-content">
                    <icon class="icon-button" i="trash" v-if='index === history.length-1' @click="deleteLastItem(chatId)"/>
                    <div>{{prompt.prompt}}</div>
                  </div>
                </div>
                <div class="prompt-response">
                  <div class="prompt-text-info">
                    Bot
                    <icon class="icon-button retry" size="2" i="arrow-clockwise" v-if='index === history.length-1'  @click="retryLastItem(chatId)"/>
                  </div>
                  <div class="prompt-text-content">
                    <icon class="icon-button paperclip" i="paperclip" @click="copyToClipboard(prompt.response)"></icon>
                    {{prompt.response}}
                  </div>
                </div>
              </div>
              <div v-else>
                Enter your first prompt to start a conversation.
              </div>
            </div>

            
            <!-- ChatBot Input -->
            <div class="prompt-input">
              <div class="prompt-input-text">
                <textarea v-model="input.prompt" :disabled="!allowInput" @keyup.enter="send" placeholder="Type your prompt here..."></textarea>
              </div>
              <div class="prompt-input-action" @click="send($event)" v-if="allowInput">
                <button :disabled="!allowInput"><icon size="2" i="send" /></button>
              </div>
              <div class="prompt-input-action thinking" v-else>
                <icon size="2" i="diamond-half" />
              </div>
            </div>
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
        chats : [],
        settings: {
            typeSpeed: 50,
        }
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
        async send(event) {
            //check if shift is pressed then ignore
            if (event.shiftKey) return;

            //remove last enter from prompt
            this.input.prompt = this.input.prompt.replace(/\n$/, "");

            if (this.input.prompt.length === 0 || !this.allowInput) {
                utils.Snackbar("Please enter a prompt.");
                return;
            }
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

            this.input.prompt = "";
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
                    utils.Snackbar("Error fetching chats.");
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
        appendToHistory(prompt, response, animate = false, index = -1) {

            if (!animate) {

                if (index === -1) {
                    this.history.push({
                        prompt,
                        response
                    });
                } else {
                    this.history[index] = {
                        prompt,
                        response
                    }
                }
                this.scrollToBottom();
                return;
            }

            if (index === -1) {
                index = this.history.push({
                    prompt,
                    response: "",
                }) - 1;
            }
            //for each word in response add a delay
            const words = response.split(" ");
            let delay = 0;
            for (let i = 0; i < words.length; i++) {
                delay += this.settings.typeSpeed;
                setTimeout(() => {
                    this.history[index].response += words[i] + " ";
                    this.scrollToBottom();
                }, delay);
            }
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
                    this.appendToHistory(text, response.data.response, true);
                    resolve(response.data.id)
                }).catch((error) => {
                    reject(error);
                    utils.Snackbar("Error creating new chat.");
                })
            })
        },
        continueChat(chatId, text) {
            return new Promise((resolve, reject) => {
                const index = this.history.push({
                    prompt: text,
                    response: "Thinking...",
                }) - 1
                axios.post("/api/chat/"+ chatId, {
                    prompt: text,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + localStorage.getItem("token"),
                    }
                }).then((response) => {
                    this.history[index].response = '';
                    this.appendToHistory(text, response.data.response, true, index);
                    resolve(response.data)
                }).catch((error) => {
                    reject(error);
                    utils.Snackbar("Error continuing chat.");
                })
            })
        },
        getPreviousChat(chatId){
            return new Promise((resolve, reject) =>{
                axios.get("/api/chat/"+chatId, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + localStorage.getItem("token"),
                    }
                }).then(response=>{
                    response.data.thread.forEach(item=>{
                        this.appendToHistory(item.prompt, item.response);
                    })
                    resolve(response.data)
                }).catch(error=>{
                    reject(error);
                    utils.Snackbar("Error fetching chat.");
                })
            })
        },
        deleteChat(chatId) {
            return new Promise((resolve, reject) => {
                axios.delete("/api/chat/" + chatId, {
                    headers: {
                        "Authorization": "Bearer " + localStorage.getItem("token"),
                    }
                }).then(r => {
                    if (this.chatId === chatId) {
                        this.history = [];
                        this.chatId = null;
                        window.history.pushState({}, "", "/");
                    }
                    this.fetchChats();
                }).catch(e => {
                    utils.Snackbar("Error deleting chat.");
                    reject(e);
                })
            })
        },
        async deleteLastItem(chatId) {
            try {
                await axios.delete("/api/chat/" + chatId + "/last", {
                    headers: {
                        "Authorization": "Bearer " + localStorage.getItem("token"),
                    }
                });
                //remove last item from history
                this.history.pop();
            } catch (e) {
                utils.Snackbar("Error deleting chat.");
                throw e;
            }
        },
        async retryLastItem(chatId){
            try {
                this.allowInput = false;
                const lastItem = this.history[this.history.length - 1];
                await this.deleteLastItem(chatId);
                await this.continueChat(chatId, lastItem.prompt, true, this.history.length - 1);
                this.allowInput = true;
            } catch (e) {
                console.log(e);
                utils.Snackbar("Error retrying prompt.");
            }
        },
        toggleMobileMenu(){
            this.$el.querySelector(".chat-bot-mobile-menu").classList.toggle("active");
        },
        /**
         * Copies the text to the clipboard
         * @param text
         */
        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                utils.Snackbar("Copied to clipboard.");
            }, () => {
                utils.Snackbar("Error copying to clipboard.");
            });
        }
    },
};
