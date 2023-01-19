import axios from 'axios';

export default {
    components: {
    },
    template: `
    <div class="app chat-bot">
        <div class="chat-bot-information">
          {{chatId ? "Chat ID: " + chatId : "No Chat ID"}}
        </div>
        <!-- ChatBot Body -->
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
          Nothing to show
        </div>
    
        <!-- ChatBot Input -->
        <div class="prompt">
            <div class="prompt-text">
                <textarea v-model="input" :disabled="!allowInput" @keyup.enter="send" type="text" placeholder="Type your message here..."></textarea>
            </div>
            <div class="prompt-response">
                <button @click="send" :disabled="!allowInput">Send</button>
            </div>
        </div>
    </div>
    `,
    data: () => ({
        history: [],
        input: "",
        allowInput: true,
        chatId: null,
    }),
    mounted() {
        this.getPageFromURL();
        if (this.chatId){
            this.getPreviousChat(this.chatId).then(r => {
                console.log("Got Chat.")
            })
        }
    },
    methods: {
        async send() {
            this.allowInput = false;
            if (this.history.length === 0) {
                this.chatId = await this.newChat(this.input);
                //set url
                window.history.pushState({}, "", "/chat/" + this.chatId);
                this.allowInput = true;
            } else {
                await this.continueChat(this.chatId, this.input)
                this.allowInput = true;
            }

            this.input = "";
        },
        getPageFromURL() {
            const url = window.location.pathname;
            const chatId = url.split("/")[2];
            if (chatId) {
                this.chatId = chatId;
            }
        },
        appendToHistory(prompt, response) {
            this.history.push({
                prompt,
                response,
            });
        },
        newChat(text) {
            return new Promise((resolve, reject) => {
                axios.post("/api/chat/new", {
                    prompt: text,
                }).then((response) => {
                    this.appendToHistory(text, response.data.response);
                    resolve(response.data.id)
                });
            })
        },
        continueChat(id, text) {
            return new Promise((resolve, reject) => {
                axios.post("/api/chat/"+ id, {
                    prompt: text,
                }).then((response) => {
                    this.appendToHistory(text, response.data.response);
                    resolve(response.data)
                });
            })
        },
        getPreviousChat(id){
            return new Promise((resolve, reject) =>{
                axios.get("/api/chat/"+id).then(response=>{
                    response.data.thread.forEach(item=>{
                        this.appendToHistory(item.prompt, item.response);
                    })
                    resolve(response.data)
                })
            })
        }
    },
};
