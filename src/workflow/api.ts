import type { NoticeFacts, PublicJob } from '../../shared/contracts';

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = 'ApiError'; }
}

async function responseError(response: Response): Promise<never> {
  let message = `The request could not be completed (${response.status}).`;
  try {
    const data = await response.json() as { error?: string };
    if (data.error) message = data.error;
  } catch { /* A non-JSON error is still an error. */ }
  throw new ApiError(message, response.status);
}

export async function jobRequest(path: string, options: RequestInit = {}): Promise<PublicJob> {
  const response = await fetch(path, options);
  if (!response.ok) return responseError(response);
  return response.json() as Promise<PublicJob>;
}

export async function uploadNotice(file: File, distance: 1 | 3 | 5, signal: AbortSignal) {
  const form = new FormData();
  form.set('file', file);
  form.set('distance', String(distance));
  return jobRequest('/api/jobs', { method: 'POST', body: form, signal });
}

export function updateFacts(id: string, facts: NoticeFacts, signal: AbortSignal) {
  return jobRequest(`/api/jobs/${id}/facts`, { method: 'PUT', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facts }) });
}

export function command(id: string, action: 'read' | 'design' | 'retry' | 'cancel', signal: AbortSignal, factsVersion?: number) {
  return jobRequest(`/api/jobs/${id}/${action}`, { method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(factsVersion === undefined ? {} : { factsVersion }) });
}

export async function deleteNotice(id: string, signal: AbortSignal) {
  const response = await fetch(`/api/jobs/${id}`, { method: 'DELETE', signal });
  if (!response.ok) return responseError(response);
}

export function sourceUrl(job: Pick<PublicJob, 'id'>) { return `/api/jobs/${job.id}/source`; }
export function previewUrl(job: Pick<PublicJob, 'id' | 'artifactHash'>) {
  return `/api/jobs/${job.id}/preview?hash=${encodeURIComponent(job.artifactHash ?? '')}`;
}

export async function exportNotice(job: PublicJob, format: 'pdf' | 'svg', signal: AbortSignal, draft = false) {
  const response = await fetch(`/api/jobs/${job.id}/download?format=${format}${draft ? '&draft=1' : ''}`, { signal });
  if (!response.ok) return responseError(response);
  const blob = await response.blob();
  if (!blob.size) throw new ApiError('The file was empty. Please try the download again.');
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const rawName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  let filename = rawName ?? `${job.name.replace(/\.[^.]+$/, '')}-A3${draft ? '-unchecked' : ''}.${format}`;
  if (encodedName) { try { filename = decodeURIComponent(encodedName); } catch { /* Use plain filename. */ } }
  return { blob, filename };
}

export async function validateImage(file: File) {
  if (!['image/png', 'image/jpeg'].includes(file.type) || !/\.(png|jpe?g)$/i.test(file.name)) {
    throw new ApiError('This file is not a JPG or PNG.');
  }
  if (file.size > 10 * 1024 * 1024) throw new ApiError('This photo is too large. Choose a JPG or PNG smaller than 10 MB.');
  if (!file.size) throw new ApiError('This photo is empty. Choose another JPG or PNG.');
  try {
    const image = await createImageBitmap(file);
    if (!image.width || !image.height) throw new Error('No pixels');
    image.close();
  } catch { throw new ApiError('This photo could not be opened. Choose another JPG or PNG.'); }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The connection was interrupted. Please try again.';
}
