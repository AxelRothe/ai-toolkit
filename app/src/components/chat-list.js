export default {
  name: "chat-list",
  template: `
	<div class="chat-bot-chat-history">
	  <div class="chat-bot-chat-history-item">
	    <a class="chat-bot-chat-history-button" :href="'/'"><icon class="icon-button" i="plus-circle-dotted"/> New</a>
	  </div>
	  <div class="chat-bot-chat-history-item" v-for="(chat, index) in chats">
	    <a class="chat-bot-chat-history-button"  :href="'/chat/' + chat">
	      <icon :i="chat === chatId ? 'chat-fill' : 'chat'"/> {{chat}}</a>
	      <icon class="icon-button" i="trash" @click="$emit('deleteChat', (chat))"/>
	  </div>
	</div>
	`,
  data() {
    return {};
  },
  props: {
    chatId: {
      type: String,
      default: null,
    },
    chats: {
      type: Array,
      default: [],
    },
  },
};
