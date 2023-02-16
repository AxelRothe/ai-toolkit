import axios from "axios";
import utils from "../utils/index.js";

export default {
  name: "brushes",
  template: `
    <div class="brushes__container">
      <div class="brushes__row">
        <div class="brushes__column ">
          <div class="brushes__column__row max-height input">
            <label>Input</label>
            <textarea v-model="input.text" class="form-control" placeholder="..."></textarea>
          </div>
        </div>
        <div class="brushes__column" v-if="state.allowSend">

          <div class="brushes__column__row ">
            <h1>{{state.brushId || "Unsaved Brush"}} <btn i="plus-circle" to="/brushes/">New</btn></h1> 
            <small>Brushes are a way to transform your input text into something else.</small>
          </div>
          <div class="brushes__column__row">
            <div class="form-group">
              <input type="text" v-model="input.title" placeholder="Title"/>
              <btn i="save" @click="saveBrush">Save</btn>
              <btn i="trash" :action="deleteBrush" v-if="state.brushId">Delete</btn>
            </div>
          </div>
          <div class="brushes__column__row instructions">
            <label>Instruction</label>
            <textarea v-model="input.instruction" class="form-control" rows=10 placeholder="..."></textarea>
            <small>What should the AI do?</small>
          </div>
          <div class="brushes__column__row">
            <label>Model</label>
            <select v-model="input.model" class="form-control">
                <option v-for="model in state.models" :value="model">{{model.name}}</option>
            </select> 
            <small>{{input.model.description}}</small>
          </div>
          <div :class="['brushes__column__row center apply-btn', {'thinking': !state.allowSend}]">
            <btn primary @click="applyBrush(input.text, input.instruction)" i="brush" v-if="state.allowSend">Apply Brush</btn>
          </div>
          <div class="brushes__column__row ">
            <h2>Tools</h2>
            <div class="brushes__quick-access">
              <btn i="stars" @click="clearInput">Clear In</btn>
              <btn i="arrow-left-square-fill" @click="copyOutputToInput">Copy & Paste</btn>
              <btn i="stars" @click="clearOutput">Clear Out</btn>
            </div>
            <div class="brushes__quick-access">
            </div>
          </div>
          <div class="brushes__column__row brushes__saved">
            <h2>Saved Brushes</h2>
            <div class="brushes__saved__list">
                <a v-for="brush in state.brushes" class="brushes__saved__list__brush" :href="'/brushes/'+brush.id">
                  <icon i="brush"/>{{brush.title}}
                </a>
            </div>
          </div>
        </div>
        <div v-else class="brushes__column ">
          <div class="full__flex__center icon__spinning">
            <icon size="4" i="diamond-half"/>
            <label>{{utils.prettyMs(this.state.timeRequested)}}</label>
          </div>
        </div>
        <div class="brushes__column output" >
          <div class="brushes__column__row max-height">
            <label>Output</label>
            <textarea v-model="input.output" class="form-control " placeholder="..." @change="saveOutputToCache"></textarea>
            <icon class="icon-button paperclip" size=2 i="paperclip" @click="copyToClipboard(input.output)"></icon>
          </div>
        </div>
      </div>
    </div>
  `,
  props: {
    token: {
      type: String,
      required: true,
    },
    query: {
      type: String,
      required: false,
    },
  },
  watch: {
    "input.text": function (val) {
      this.saveInputToCache();
    },
    "input.output": function (val) {
      this.saveOutputToCache();
    },
  },
  data() {
    return {
      utils,
      input: {
        text: "",
        instruction: "",
        model: "",
        output: "",
      },
      state: {
        timeRequested: 0,
        allowSend: true,
        brushId: undefined,
        brushes: [],
        models: [
          {
            name: "Transmogrify",
            value: "text-davinci-003",
            description:
              "Use this model to generate, translate or modify text within a given context or to explain code.",
          },
          {
            name: "Edit & Replace",
            value: "text-davinci-edit-001",
            description:
              "Use this model to edit text, e.g. to fix typos, replace words etc.",
          },
          {
            name: "Coding",
            value: "code-davinci-002",
            description: "Use this model to generate, edit or document code.",
          },
        ],
      },
    };
  },
  computed: {},
  mounted() {
    this.input.model = this.state.models[0];
    this.fetchBrushes().then(() => {
      if (this.query) {
        this.setBrush(this.query);
      }
      this.loadInputOutputFromCache();
    });
  },
  methods: {
    fetchBrushes() {
      return new Promise((resolve, reject) => {
        axios
          .get("/api/brush", {
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          })
          .then((res) => {
            this.state.brushes = res.data;
            resolve();
          })
          .catch((err) => {
            utils.Snackbar(err.response.data.message);
            reject();
          });
      });
    },
    setBrush(id) {
      const brush = this.state.brushes.find((brush) => brush.id === id);
      if (brush) {
        this.input.title = brush.title;
        this.input.instruction = brush.instruction;
        this.input.model = this.state.models.find(
          (model) => model.value === brush.model
        );
        this.state.brushId = brush.id;
      } else {
        utils.Snackbar("Brush not found");
      }
    },
    /**
     * Applies a brush to a given text with a prefix and postfix. This is done by sending a POST request to the '/api/prompt' endpoint.
     *
     * @param {string} text - The text of the prompt.
     * @param {string} instruction - The prefix of the brush.
     * @returns {void}
     */
    async applyBrush(text, instruction) {
      this.state.allowSend = false;
      this.state.timeRequested = 0;
      const interval = setInterval(() => {
        this.state.timeRequested += 100;
      }, 100);

      let options = {
        model: this.input.model.value,
        input: `${text}`,
        instruction: `${instruction}`,
      };
      if (this.input.model.value !== "text-davinci-edit-001") {
        options = {
          model: this.input.model.value,
          prompt: `Data: ${text} Instructions: ${instruction} Result:`,
        };
      }

      axios
        .post("/api/prompt", options, {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        })
        .then((r) => {
          clearInterval(interval);
          this.input.output = r.data.response;
          this.state.allowSend = true;
        })
        .catch((e) => {
          clearInterval(interval);
          this.state.allowSend = true;
          utils.Snackbar(e.response.data.error);
        });
    },
    saveBrush() {
      this.state.allowSend = false;
      axios
        .post(
          "/api/brush" + (this.state.brushId ? "/" + this.state.brushId : ""),
          {
            title: this.input.title,
            instruction: this.input.instruction,
            model: this.input.model.value,
          },
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("token"),
            },
          }
        )
        .then((r) => {
          this.state.allowSend = true;
          if (!this.state.brushId) {
            this.state.brushId = r.data.brush.id;
            window.history.pushState({}, "", "/brushes/" + r.data.brush.id);
          }
          this.fetchBrushes();
        })
        .catch((e) => {
          this.state.allowSend = true;
          utils.Snackbar(e.response.data.error);
        });
    },
    deleteBrush() {
      if (!this.state.brushId) return;

      this.state.allowSend = false;

      axios
        .delete("/api/brush/" + this.state.brushId, {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        })
        .then((r) => {
          this.state.allowSend = true;
          this.state.brushId = undefined;
          this.fetchBrushes();
          utils.Snackbar("Brush deleted");
          window.history.pushState({}, "", "/brushes");
        })
        .catch((e) => {
          this.state.allowSend = true;
          utils.Snackbar(e.response.data.error);
        });
    },
    /**
     * Copies the text to the clipboard
     * @param text
     */
    copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(
        () => {
          utils.Snackbar("Copied to clipboard.");
        },
        () => {
          utils.Snackbar("Error copying to clipboard.");
        }
      );
    },
    /**
     * copyOutputToInput
     */
    copyOutputToInput() {
      this.input.text = this.input.output;
      this.input.output = "";
    },
    /**
     * clearInput
     */
    clearInput() {
      this.input.text = "";
    },
    /**
     * clearOutput
     */
    clearOutput() {
      this.input.output = "";
    },
    saveInputToCache() {
      localStorage.setItem("input", this.input.text);
    },
    saveOutputToCache() {
      localStorage.setItem("output", this.input.output);
    },
    loadInputOutputFromCache() {
      this.input.text = localStorage.getItem("input") || "";
      this.input.output = localStorage.getItem("output") || "";
    },
  },
};
