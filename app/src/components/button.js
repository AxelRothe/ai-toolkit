export default {
	name: "btn",
	template: `
	<div class="btn__container">
		<button v-if="!action" :class="['btn', {'has-icon': i}, {'danger': danger},{'warning': warning},{'action': primary}, {'disabled':disabled}]">
			<icon v-if="i" :size="1.5 * size" :i="i"></icon>
			<div class="content"><slot></slot></div>
		</button>
		<button v-if="action" :class="['btn', {'has-icon': i}, {'danger': danger},{'warning': warning},{'action': primary}, {'disabled':disabled}]" @click.stop="openConfirmationDialog()">
			<icon v-if="i" :size="1.5 * size" :i="i"></icon>
			<div class="content"><slot></slot></div>
		</button>
		<div v-if="confirming && action" class="btn__confirmation__dialog" :style="confirmationDialogStyle">
			<button :class="['btn', 'action']" @click.stop="doIt">Confirm</button>
			<button :class="['btn', 'danger']" @click.stop="cancel">Cancel</button>
		</div>
	</div>
	`,
	props: {
		i: {
			type: String,
			default: undefined
		},
		action: {
			type: Function,
			default: null
		},
		actionArgs: {
			type: Array,
			default: () => []
		},
		size: {
			type: Number,
			default: 1
		},
		primary: { //change this to action
			type: Boolean,
			default: false
		},
		danger: {
			type: Boolean,
			default: false
		},
		warning: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	data: () => ({
		confirming: false,
		confirmationDialogStyle: {
			top: 0,
			right: 0
		}
	}),
	mounted () {
	},
	methods: {
		cancel() {
			this.confirming = false;
		},
		doIt(){
			if (!this.disabled){
				this.confirming = false;
				this.action(...this.actionArgs);
			}
		},
		openConfirmationDialog(){
			this.confirming = true;
			setTimeout(() => {
				this.setConfirmationDialogStyle()
			},1)
		},
		setConfirmationDialogStyle() {

		}
	}
}