export default {
    template: `<div class="kreis"><slot></slot></div>`,
    props: {
        i: [String],
        size: {
            default: 1,
        },
    },
};
