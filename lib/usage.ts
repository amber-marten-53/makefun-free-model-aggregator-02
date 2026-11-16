export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requests: number;
}

export class UsageLedger {
  private ledger: Map<string, UsageStats> = new Map();

  record(modelId: string, promptTokens: number, completionTokens: number): void {
    const current = this.ledger.get(modelId) || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requests: 0,
    };

    current.promptTokens += promptTokens;
    current.completionTokens += completionTokens;
    current.totalTokens += promptTokens + completionTokens;
    current.requests += 1;

    this.ledger.set(modelId, current);
  }

  totals(): Record<string, UsageStats> {
    return Object.fromEntries(this.ledger);
  }

  grandTotals(): UsageStats {
    const total = { promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0 };
    for (const stats of this.ledger.values()) {
      total.promptTokens += stats.promptTokens;
      total.completionTokens += stats.completionTokens;
      total.totalTokens += stats.totalTokens;
      total.requests += stats.requests;
    }
    return total;
  }

  reset(): void {
    this.ledger.clear();
  }
}

export function openAIUsage(promptTokens: number, completionTokens: number) {
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  };
}

export function anthropicUsage(promptTokens: number, completionTokens: number, cacheReadTokens?: number) {
  const result: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number } = {
    input_tokens: promptTokens,
    output_tokens: completionTokens,
  };
  if (cacheReadTokens !== undefined) {
    result.cache_read_input_tokens = cacheReadTokens;
  }
  return result;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function validateJsonMode(text: string): { ok: boolean; value?: any; error?: string } {
  try {
    const value = JSON.parse(text);
    return { ok: true, value };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function mergeUsage(a: UsageStats, b: UsageStats): UsageStats {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    requests: a.requests + b.requests,
  };
}
