import axios from 'axios';
import utils from './utility/index.js'

export default {
    components: {
    },
    template: `
      <div class="no-token" v-if="!token">
        <h1><icon i="key-fill"/> No Token Detected</h1>
        <input v-model="input.token" placeholder="Your Token"/><button @click="setToken"><icon i="unlock" /> Set Token</button>
        <div class="error" v-if="error && error.length > 0"><icon i="cone-striped" /> {{error}}</div>
      </div>
      <div v-else class="app chat-bot">
        <div class="chat-bot-mobile-menu">
          <h2 class="chat-bot-mobile-menu-title">Your Chats</h2>
          <div class="mobile-menu-chat-history">
            <div class="mobile-menu-chat-history-item">
              <a class="chat-bot-mobile-menu-button" :href="'/'"><icon size="2" i="plus-circle-dotted"/> New</a>
            </div>
            <div class="mobile-menu-chat-history-item" v-for="(chat, index) in chats">
              <a class="chat-bot-mobile-menu-button" :href="'/chat/' + chat"><icon size="2" :i="chat === chatId ? 'chat-fill' : 'chat'"/> {{chat}}</a> <icon size="2" i="trash" @click="deleteChat(chat)"/>
            </div>
          </div>
        </div>
      
        <div class="chat-bot-information">
          
          <div class="chat-bot-mobile-menu-button">
            <button @click="toggleMobileMenu"><icon i="list" /></button>
          </div>
          
          <div class="chat-bot-chat-id">
            <div class="chat-bot-name">
              <icon i="chat-fill"></icon> {{chatId ? chatId : "No Chat ID"}}
            </div>
            <div class="chat-bot-usage">
              <div>{{getTotalHistoryCost}}$ / Unlimited</div>
              <div class="chat-bot-usage-remaining">Token Usage</div>
            </div>
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
              <div class="chat-bot-chat-history-item" v-for="(chat, index) in chats">
                <a class="chat-bot-chat-history-button"  :href="'/chat/' + chat"><icon :i="chat === chatId ? 'chat-fill' : 'chat'"/> {{chat}}</a> <icon class="icon-button" i="trash" @click="deleteChat(chat)"/>
              </div>
            </div>
          </div>
          <div class="chat-bot-body-outer">
            <div class="chat-bot-body">
              <div v-for="(prompt, index) in history" :class="['prompt']" v-if="history.length > 0">
                <div class="prompt-text">
                  <div class="prompt-text-info">
                    You
                  </div>
                  <div class="prompt-text-content">
                    <icon class="icon-button prompt-remove-btn" i="trash" size="2" v-if='index === history.length-1' @click="deleteLastItem(chatId)"/>
                    <textarea id="textarea-prompt" ref="textarea-prompt" v-if='index === history.length-1' v-model="prompt.prompt" :rows="textareas['textarea-prompt'].rows" @change="editLastItem(chatId, prompt.prompt)" @keydown.tab.prevent="writeTab($event, prompt,'prompt')"/>
                    <div v-else>{{prompt.prompt}}</div>
                  </div>
                </div>
                <div class="prompt-response">
                  <div class="prompt-text-info">
                    Bot
                    <icon class="icon-button retry" size="2" i="arrow-clockwise" v-if='index === history.length-1'  @click="retryLastItem(chatId)"/>
                  </div>
                  <div class="prompt-text-content">
                    <icon class="icon-button paperclip" size=2 i="paperclip" @click="copyToClipboard(prompt.response)"></icon>
                    <textarea id="textarea-response" ref="textarea-response" v-if='index === history.length-1' v-model="prompt.response" :rows="textareas['textarea-response'].rows" @keydown="handleKeyDown($event, prompt,'response')" @keydown.tab.prevent="writeTab($event, prompt,'response')" @change="editLastItem(chatId, undefined, prompt.response)"/>
                    <div v-else>{{prompt.response}}</div>
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
            tokenCost: 0.00004,
        },
        textareas: {
            "textarea-prompt": {
                rows: 1,
            },
            "textarea-response": {
                rows: 1,
            }
        }
    }),
    async mounted() {
        if (!this.token && localStorage.getItem("token")){
            this.token = localStorage.getItem("token");

            if (await this.testToken(this.token)){
                await this.getPageFromURL();
                await this.fetchChats();
            }
        }
    },
    methods: {
        handleKeyDown(e, prompt, type) {
            //check if backspace
            if (e.keyCode === 8) {
                this.updateTextAreas();
            }
            //if enter and shift
            if (e.keyCode === 13 && e.shiftKey) {
                this.updateTextAreas();
            }
        },
        async updateTextAreas(nextTick = true){
            if (nextTick){
                await this.$nextTick();
                this.textareas["textarea-prompt"].rows = 1;
                this.textareas["textarea-response"].rows = 1;
                await this.$nextTick();
                this.scrollToBottom();
            }
            //get linheight from css
            const lineHeight = 20;

            const ta = this.$el.querySelector("#textarea-prompt");
            this.textareas["textarea-prompt"].rows = ta.scrollHeight / lineHeight;
            const ta2 = this.$el.querySelector("#textarea-response");
            this.textareas["textarea-response"].rows = ta2.scrollHeight / lineHeight;
        },
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
                    this.updateTextAreas();
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
                }).catch(e => {
                    console.log("Error getting chat.")
                })
            }
        },
        /**
         * Attaches a new prompt and response to the chat history.
         *
         * @param entry { {prompt : string, response: string, usage: object} }
         * @param animate Whether to animate the response.
         * @param index (overwrite) The index to set the prompt and response to. If not set, it will be appended to the end.
         */
        appendToHistory(entry , animate = false, index = -1) {

            if (!animate) {

                if (index === -1) {
                    this.history.push({
                        ...entry
                    });
                } else {
                    this.history[index] = {
                        ...entry
                    }
                }
                this.scrollToBottom();
                this.updateTextAreas();
                return;
            }

            if (index === -1) {
                index = this.history.push({
                    prompt: entry.prompt,
                    response: "",
                    usage: {
                        total_tokens:0,
                        prompt_tokens:0,
                        completion_tokens:0
                    }
                }) - 1;
            }
            //for each word or line break in response add a delay
            const words = entry.response.split(" ");
            let delay = 0;
            for (let i = 0; i < words.length; i++) {
                delay += this.settings.typeSpeed;
                setTimeout(() => {
                    this.history[index].response += words[i] + " ";
                    this.updateTextAreas();
                    this.scrollToBottom();
                }, delay);
            }
        },
        /**
         * Test if the token is valid.
         * @throws Error if token is invalid.
         * @param token
         * @returns {Promise<true>}
         */
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
        /**
         * Sets the token and saves it to local storage.
         * @param token {string} The token to set.
         * @returns {Promise<void>}
         */
        async setToken(token = this.input.token){
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
                    this.appendToHistory({
                        prompt: text,
                        response: response.data.response,
                        usage: response.data.usage
                    }, true);
                    this.updateTextAreas();
                    resolve(response.data.id)
                }).catch((error) => {
                    reject(error);
                    utils.Snackbar("Error creating new chat.");
                })
            })
        },
        /**
         * Continues a chat.
         *
         * @param chatId {string} The chat id to continue.
         * @param text {string} The text to send.
         * @returns {Promise<Chat>} The response.
         */
        continueChat(chatId, text) {
            return new Promise((resolve, reject) => {

                //Add Placeholder for response
                const index = this.history.push({
                    prompt: text,
                    response: "Thinking...",
                }) - 1
                this.updateTextAreas().then(() => {
                    this.scrollToBottom(); //scroll to bottom

                    //send request
                    axios.post("/api/chat/"+ chatId, {
                        prompt: text,
                    }, {
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + localStorage.getItem("token"),
                        }
                    }).then((response) => {
                        //clear response placeholder
                        this.history[index].response = '';
                        //set response to this index
                        this.appendToHistory({
                            prompt: text,
                            response: response.data.response,
                            usage: response.data.usage
                        }, true, index);

                        resolve(response.data)
                    }).catch((error) => {
                        reject(error);
                        utils.Snackbar("Error continuing chat.");
                    })

                });


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

                        this.appendToHistory({
                            ...item
                        });
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
        async editLastItem(chatId, prompt, response){
            try {
                this.allowInput = false;

                const r = await axios.put("/api/chat/" + chatId + "/last", {
                    prompt,
                    response
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: "Bearer " + localStorage.getItem("token"),
                    }
                })
                await this.updateTextAreas(true);
                if (prompt && !response){
                    utils.Snackbar("Saved changed prompt. Regenerate response to see changes.");
                } else {
                    utils.Snackbar("Saved changes to response. Changes will be visible on next prompt.");
                }

                this.allowInput = true;
            } catch (e) {
                this.allowInput = true;
                console.log(e);
                utils.Snackbar("Error editing prompt.");
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
        },
        writeTab($event, variable, parameter){
            const textarea = this.$el.querySelector('#textarea-'+parameter);
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = variable[parameter];

            //if shift key is pressed, remove the tab
            if ($event.shiftKey) {
                textarea.value = value.substring(0, start - 4) + value.substring(end);

                this.$nextTick().then(r =>{
                    textarea.selectionStart = textarea.selectionEnd = start - 4;
                    textarea.focus();
                });

            } else {
                variable[parameter] = value.substring(0, start) + "\t" + value.substring(end);

                this.$nextTick().then(r =>{
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                    textarea.focus();
                });
            }

        },

    },
    computed: {
        /**
         * Computes the chats history in token usage
         * @returns {Number}
         */
        getTotalUsage(){
            return this.history.reduce((total, chat) => total + (chat.usage ? chat.usage.total_tokens : 0), 0);
        },
        getTotalHistoryCost(){
            return (this.getTotalUsage * this.settings.tokenCost).toFixed(2);
        },
    }
};
