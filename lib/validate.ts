import { type Json, isRecord } from './providers.ts';

export function validateRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  body: Json
): { status: number; error: Json } | null {
  // 1. Validate content type (basic check for POST)
  if (method === 'POST') {
    const contentType = headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return { status: 415, error: { message: 'Content-Type must be application/json', type: 'invalid_request_error', code: 'invalid_content_type' } };
    }
  }

  // 2. Validate body structure for completions/messages
  if (path === '/v1/chat/completions') {
    if (!isRecord(body) || !Array.isArray(body.messages)) {
      return { status: 400, error: { message: 'Missing or malformed messages', type: 'invalid_request_error', code: 'invalid_request_body' } };
    }
  } else if (path === '/v1/messages') {
    if (!isRecord(body) || !Array.isArray(body.messages)) {
      return { status: 400, error: { message: 'Missing or malformed messages', type: 'invalid_request_error', code: 'invalid_request_body' } };
    }
  }

  // 3. Max tokens check (basic rule: max_tokens must be within some reasonable bounds if present)
  // Assuming 4096 based on common constraints if unspecified
  if (isRecord(body) && typeof body.max_tokens !== 'undefined') {
    if (typeof body.max_tokens !== 'number' || body.max_tokens <= 0 || body.max_tokens > 128000) {
      return { status: 400, error: { message: 'max_tokens out of bounds', type: 'invalid_request_error', code: 'invalid_max_tokens' } };
    }
  }

  return null;
}
