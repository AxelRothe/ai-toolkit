import AAMultiModalOption from "alephalphajs/src/AAMultiModalOption";

export default interface AlephAlphaOptions {
  token: string;
  prompt: string | AAMultiModalOption[];
  model: string;
  maximum_tokens: number;
  end_sequence?: string;
}
