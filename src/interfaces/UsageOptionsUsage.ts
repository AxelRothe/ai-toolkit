export default interface UsageOptionsUsage {
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  images_count?: number;
  videos_count?: number;
  documents_count?: number;
}
