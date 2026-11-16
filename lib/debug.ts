/**
 * Advanced debug utilities for tracing requests, errors, and system status.
 */
export function logDiagnostic(category: string, reqId: string, message: string): void {
  const ts = new Date().toISOString();
  process.stderr.write(`[${ts}] [${category}] [${reqId}] ${message}\n`);
}

export function logSystemEvent(event: string, details: string): void {
  process.stderr.write(`[SYSTEM_EVENT] [${new Date().toISOString()}] ${event}: ${details}\n`);
}
