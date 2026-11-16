export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const stats: Record<string, { failures: number; lastFailure: number }> = {};
const cooldowns: Record<string, number> = {};

export function isCool(id: string): boolean {
  const now = Date.now();
  const until = cooldowns[id] || 0;
  return now < until;
}

export function recordSuccess(id: string): void {
  if (stats[id]) stats[id].failures = 0;
}

export function recordFailure(id: string, cooldownMs: number, cooldownAfter: number): void {
  const s = stats[id] || { failures: 0, lastFailure: 0 };
  s.failures += 1;
  s.lastFailure = Date.now();
  stats[id] = s;

  if (s.failures >= cooldownAfter) {
    cooldowns[id] = Date.now() + cooldownMs;
  }
}

interface Attempt {
  id: string;
  dial: () => Promise<unknown>;
}

interface RunOpts {
  timeoutMs: number;
  cooldownAfter: number;
  cooldownMs: number;
}

export async function runWithFailover(attempts: Attempt[], opts: RunOpts): Promise<{ id: string; value: unknown }> {
  const errors: Record<string, unknown> = {};

  for (const attempt of attempts) {
    if (isCool(attempt.id)) continue;

    try {
      const result = await Promise.race([
        attempt.dial(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), opts.timeoutMs)),
      ]);
      recordSuccess(attempt.id);
      return { id: attempt.id, value: result };
    } catch (e) {
      recordFailure(attempt.id, opts.cooldownMs, opts.cooldownAfter);
      errors[attempt.id] = e;
    }
  }

  throw new Error(`All attempts failed: ${JSON.stringify(errors)}`);
}

export function summary(): Record<string, { failures: number; cooled: boolean }> {
  const result: Record<string, { failures: number; cooled: boolean }> = {};
  for (const id in stats) {
    result[id] = {
      failures: stats[id].failures,
      cooled: isCool(id),
    };
  }
  return result;
}


