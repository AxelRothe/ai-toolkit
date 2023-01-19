export default {
    template: `<img :width="$props.size+'px'" :height="$props.size+'px'" src="/assets/spinner.svg">`,
    props: {
        i: [String],
        size: {
            default: 32,
        },
    },
};
