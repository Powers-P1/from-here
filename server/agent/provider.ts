import { createHash } from 'node:crypto';
import Ajv from 'ajv';
import type { ModelReceipt } from '../../shared/contracts.js';

const ajv = new Ajv({ allErrors: true, strict: false });
export class ModelError extends Error {
  constructor(message: string, public readonly details?: string) { super(message); this.name = 'ModelError'; }
}
export interface ModelRequest {
  operation: string;
  system: string;
  prompt: string;
  schema: object;
  image?: Buffer;
  signal?: AbortSignal;
  maxTokens?: number;
  mode?: 'vision' | 'text';
}

export function providerInfo(mode: 'vision' | 'text' = 'vision') {
  const prefix = mode === 'text' ? 'AI_TEXT_' : 'AI_';
  const provider = (process.env[prefix+'PROVIDER'] || (mode === 'text' ? 'vllm' : 'ollama')) === 'vllm' ? 'vllm' : 'ollama';
  const baseURL = (process.env[prefix+'BASE_URL'] || (provider === 'ollama' ? 'http://127.0.0.1:11434' : 'http://127.0.0.1:8000/v1')).replace(/\/$/, '');
  const model = process.env[prefix+'MODEL'] || (provider === 'ollama' ? (mode === 'vision' ? 'qwen3-vl:2b-instruct' : 'qwen3:4b') : 'gemma-4-31b-it-qat-w4a16-ct');
  return { provider, baseURL, model };
}

function parseJson(content: string): unknown {
  const clean = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); }
  catch { throw new ModelError('The AI returned an incomplete answer. Please try this step again.', clean.slice(0, 300)); }
}

export async function modelJson<T>(request: ModelRequest): Promise<{ value: T; receipt: ModelReceipt }> {
  const { provider, baseURL, model } = providerInfo(request.mode || (request.image ? 'vision' : 'text'));
  const image = request.image?.toString('base64');
  const messages = [ { role: 'system', content: request.system }, { role: 'user', content: request.prompt } ];
  let body: object;
  let url: string;
  if (provider === 'ollama') {
    url = `${baseURL}/api/chat`;
    body = { model, messages: [messages[0], { ...messages[1], ...(image ? { images: [image] } : {}) }],
      format: request.schema, stream: false, keep_alive: '5m',
      options: { temperature: 0, num_ctx: 8192, num_predict: request.maxTokens || 1500,
        num_thread: Number(process.env.AI_CPU_THREADS || 6), ...(process.env.AI_CPU_ONLY !== '0' ? { num_gpu: 0 } : {}) } };
  } else {
    url = `${baseURL}/chat/completions`;
    body = { model, messages: [messages[0], { role: 'user', content: image ?
      [{ type: 'text', text: request.prompt }, { type: 'image_url', image_url: { url: `data:image/png;base64,${image}` } }] : request.prompt }],
      temperature: 0, max_tokens: request.maxTokens || 1500,
      response_format: { type: 'json_schema', json_schema: { name: request.operation.replace(/[^a-z0-9_]/gi, '_'), schema: request.schema } },
      chat_template_kwargs: { enable_thinking: false } };
  }
  const requestBody = JSON.stringify(body);
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody,
      signal: AbortSignal.any([AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 180000)), ...(request.signal ? [request.signal] : [])]) });
  } catch (error) {
    if (request.signal?.aborted) throw error;
    throw new ModelError('The AI service did not respond. Your notice and details are kept.', String(error));
  }
  if (!response.ok) {
    const details = (await response.text()).slice(0, 800);
    throw new ModelError('The AI service could not finish this step. Your details are kept.', `HTTP ${response.status}: ${details}`);
  }
  const result = await response.json() as any;
  const content: string = provider === 'ollama' ? result.message?.content : result.choices?.[0]?.message?.content;
  const finishReason=provider==='ollama'?result.done_reason:result.choices?.[0]?.finish_reason;
  if (!content) throw new ModelError('The AI answer was incomplete. Please try this step again.',JSON.stringify({provider,operation:request.operation,finishReason,outputTokens:result.usage?.completion_tokens,reasoningChars:result.choices?.[0]?.message?.reasoning_content?.length||0}));
  const value = parseJson(content);
  const validate = ajv.compile(request.schema);
  if (!validate(value)) throw new ModelError('The AI returned details in an unexpected format. Please retry this step.', ajv.errorsText(validate.errors));
  const receipt: ModelReceipt = { provider, model, operation: request.operation, durationMs: Date.now()-started,
    inputTokens: provider === 'ollama' ? result.prompt_eval_count ?? null : result.usage?.prompt_tokens ?? null,
    outputTokens: provider === 'ollama' ? result.eval_count ?? null : result.usage?.completion_tokens ?? null,
    requestHash: createHash('sha256').update(requestBody).digest('hex'),finishReason };
  if (request.operation === 'read_sign' || request.operation === 'parse_readback') receipt.isolation = { input: request.image ? 'rendered_image' : 'rendered_image_transcript', sourceIncluded: false, answerKeyIncluded: false, priorHistoryIncluded: false };
  return { value: value as T, receipt };
}
