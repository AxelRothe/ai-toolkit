export default {
    name: "asset",
    template: `
        <img v-if="as==='img' || as==='image'" :class="c" :src="'/assets/images/'+src" alt=""/>
        <div v-else-if="as==='video'" class="video-responsive">
            <div class="preview-thumb" v-if="!showVideo" @click="showVideo=true" ><img  :src="'/assets/videos/thumbnails/'+src+'.png'" alt=""/></div>
            <video v-else controls :class="c" :src="'/assets/videos/'+src"></video>
        </div>`,
    props: {
        src: String,
        as: String,
        c: String,
    },
    data: () => ({
        showVideo: false,
    }),
};
