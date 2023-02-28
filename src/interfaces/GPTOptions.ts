export default interface GPTOptions {
    token: string;

    prompt: string;
    temperature?: number;
    max_tokens?: number;
}