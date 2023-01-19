export default {
    template: `<svg class="icon" :width="$props.size+'em'" :height="$props.size+'em'" fill="currentColor">
                      <use :xlink:href="'/assets/bootstrap-icons.svg#'+$props.i"/>
               </svg>`,
    props: {
        i: [String],
        size: {
            default: 1,
        },
    },
};
