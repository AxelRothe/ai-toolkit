export default {
    template: `<div class="logo"><slot></slot></div>`,
    props: {
        i: [String],
        size: {
            default: 1,
        },
    },
};
