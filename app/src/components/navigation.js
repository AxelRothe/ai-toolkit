export default {
  name: "navigation",
  props: {
    // The current page
    page: {
      type: String,
      required: true,
    },
    pages: {
      type: Array,
      required: true,
    },
  },
  template: `
		<nav class="navigation">
			<div class="navigation-item" v-for="page in pages">
				<a :href="'/'+page.component" :class="{'active': page.component === page}"><icon :i="page.icon" /> {{page.title}}</a>
			</div>
		</nav>
	`,
  data() {
    return {};
  },
};
