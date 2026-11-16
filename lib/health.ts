export type HealthStatus = "up" | "degraded" | "down" | "unknown";

export interface ProviderHealth {
  name: string;
  endpoint: string;
  status: HealthStatus;
  latencyMs: number;
  lastCheckedAt: Date;
  consecutiveFailures: number;
  lastError: string | null;
}

export function classifyHttpStatus(status: number): HealthStatus {
  if (status >= 200 && status < 300) return "up";
  if (status === 429 || (status >= 500 && status < 600)) return "degraded";
  if (status >= 400 && status < 500) return "down";
  return "unknown";
}

export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = parseInt(value, 10);
  return isNaN(seconds) ? null : seconds;
}

export async function checkEndpoint(url: string, timeoutMs: number = 5000): Promise<{ ok: boolean; status: number; latencyMs: number; error: string | null }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal });
    const latencyMs = Date.now() - start;
    clearTimeout(id);
    return { ok: response.ok, status: response.status, latencyMs, error: null };
  } catch (err: any) {
    clearTimeout(id);
    return { ok: false, status: 0, latencyMs: Date.now() - start, error: err.message };
  }
}

export class HealthRegistry {
  private providers: Map<string, ProviderHealth> = new Map();

  register(name: string, endpoint: string) {
    this.providers.set(name, {
      name,
      endpoint,
      status: "unknown",
      latencyMs: 0,
      lastCheckedAt: new Date(),
      consecutiveFailures: 0,
      lastError: null,
    });
  }

  recordOutcome(name: string, ok: boolean, latencyMs: number, error: string | null = null) {
    const p = this.providers.get(name);
    if (!p) return;
    p.latencyMs = latencyMs;
    p.lastCheckedAt = new Date();
    p.lastError = error;
    if (ok) {
      p.status = "up";
      p.consecutiveFailures = 0;
    } else {
      p.consecutiveFailures += 1;
      p.status = p.consecutiveFailures >= 3 ? "down" : "degraded";
    }
  }

  async probe(name: string) {
    const p = this.providers.get(name);
    if (!p) return;
    const result = await checkEndpoint(p.endpoint);
    this.recordOutcome(name, result.ok, result.latencyMs, result.error);
  }

  async probeAll() {
    for (const name of this.providers.keys()) {
      await this.probe(name);
    }
  }

  getStatus(name: string): HealthStatus | undefined {
    return this.providers.get(name)?.status;
  }

  summary() {
    let up = 0, degraded = 0, down = 0, unknown = 0, worstLatencyMs = 0;
    for (const p of this.providers.values()) {
      if (p.status === "up") up++;
      else if (p.status === "degraded") degraded++;
      else if (p.status === "down") down++;
      else unknown++;
      if (p.latencyMs > worstLatencyMs) worstLatencyMs = p.latencyMs;
    }
    return { total: this.providers.size, up, degraded, down, unknown, worstLatencyMs };
  }

  healthyCount(): number {
    let count = 0;
    for (const p of this.providers.values()) if (p.status === "up") count++;
    return count;
  }

  isHealthy(name: string): boolean {
    return this.getStatus(name) === "up";
  }

  reset(name: string) {
    const p = this.providers.get(name);
    if (p) {
      p.status = "unknown";
      p.consecutiveFailures = 0;
      p.lastError = null;
    }
  }

  formatReport(): string {
    const s = this.summary();
    return `Health Summary: Total: ${s.total}, Up: ${s.up}, Degraded: ${s.degraded}, Down: ${s.down}, Unknown: ${s.unknown}. Worst Latency: ${s.worstLatencyMs}ms`;
  }

  shouldBackoff(name: string): boolean {
    return (this.providers.get(name)?.consecutiveFailures ?? 0) >= 3;
  }

  snapshot(): ProviderHealth[] {
    return Array.from(this.providers.values()).map(p => ({ ...p }));
  }
}
