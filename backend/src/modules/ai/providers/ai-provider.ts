import type { ConfigType } from '@nestjs/config';
import type aiConfig from '../../../config/ai.config.js';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiJsonRequest {
  system: string;
  prompt: string;
  temperature?: number;
}

/** Contrato comun: Gemini hoy, un modelo local (Ollama) o ninguno. */
export interface AiProvider {
  readonly name: 'gemini' | 'ollama' | 'none';
  readonly model: string | null;
  isConfigured(): boolean;
  generateJson(request: AiJsonRequest): Promise<unknown>;
}

/** Proveedor ausente, lento o con respuesta invalida: los servicios usan reglas. */
export class AiUnavailableError extends Error {}

export function parseModelJson(text: string | undefined): unknown {
  const clean = (text ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  if (!clean) throw new AiUnavailableError('Empty AI response');
  try {
    return JSON.parse(clean);
  } catch {
    throw new AiUnavailableError('AI response is not valid JSON');
  }
}

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new AiUnavailableError(
      error instanceof Error && error.name === 'TimeoutError'
        ? 'AI provider timed out'
        : 'AI provider is unreachable',
    );
  }
  // El cuerpo de error puede repetir datos de la solicitud: solo se informa el estado.
  if (!response.ok)
    throw new AiUnavailableError(`AI provider responded ${response.status}`);
  return response.json();
}

export class DisabledAiProvider implements AiProvider {
  readonly name = 'none' as const;
  readonly model = null;
  isConfigured() {
    return false;
  }
  generateJson(): Promise<unknown> {
    return Promise.reject(new AiUnavailableError('AI provider is disabled'));
  }
}

export type AiSettings = ConfigType<typeof aiConfig>;
