import {VisualMiningModule} from "deepvajs/build/VisualMiningModule";

export default interface DeepVAOptions {
    token: string;

    sources: string[];
    visionModules: VisualMiningModule[];
}
