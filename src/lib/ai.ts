export type AIAgentConfig = {
  provider: string;
  model: string;
  systemPrompt: string;
  enabled: boolean;
};

export function validateAgentConfig(config: AIAgentConfig) {
  return Boolean(config.provider && config.model && config.systemPrompt.length <= 20000);
}

export function estimateUsageCost(inputTokens: number, outputTokens: number, inputRatePerMillion: number, outputRatePerMillion: number) {
  if ([inputTokens, outputTokens, inputRatePerMillion, outputRatePerMillion].some(v => !Number.isFinite(v) || v < 0)) throw new Error('Invalid usage');
  return (inputTokens * inputRatePerMillion + outputTokens * outputRatePerMillion) / 1_000_000;
}
