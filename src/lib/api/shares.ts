import { ZodError } from 'zod';
import { ApiError, apiRequest } from './client';
import {
  CreateShareResponseSchema,
  GetShareResponseSchema,
  PopularSharesResponseSchema,
  ShareDocumentV3Schema,
  ShareIdSchema,
  type CreateShareResponse,
  type GetShareResponse,
  type PopularSharesResponse,
  type ShareDocumentV3,
} from './schema';

export const SHARE_API_BASE_URL = 'https://taygeta-library-production.up.railway.app';
export const SHARE_FRONTEND_ORIGIN = 'https://618lock.com';

const SHARE_PATH_PATTERN = /^\/s\/(?:.*-)?([1-9A-HJ-NP-Za-km-z]{21,44})$/;

export function normalizeShareName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function parseSharePath(pathname: string): string | null {
  return SHARE_PATH_PATTERN.exec(pathname)?.[1] ?? null;
}

export function buildPublicShareUrl(
  path: string,
  frontendOrigin = SHARE_FRONTEND_ORIGIN,
): string {
  const base = new URL(frontendOrigin);
  if (base.origin !== frontendOrigin) throw new Error('Invalid frontend origin');

  const url = new URL(path, `${frontendOrigin}/`);
  if (
    url.origin !== frontendOrigin ||
    url.pathname !== path ||
    url.search !== '' ||
    url.hash !== '' ||
    parseSharePath(path) === null
  ) {
    throw new Error('Invalid public share path');
  }
  return url.toString();
}

export function isRetryableShareError(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  if (error instanceof ApiError) return error.status === 503;
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  return error instanceof TypeError;
}

export async function createShare(
  document: ShareDocumentV3,
  signal?: AbortSignal,
): Promise<CreateShareResponse> {
  const parsedDocument = ShareDocumentV3Schema.parse(document);
  const response = await apiRequest<unknown>({
    path: '/v1/shares',
    baseUrl: SHARE_API_BASE_URL,
    init: {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsedDocument),
      signal,
    },
  });
  return CreateShareResponseSchema.parse(response);
}

export async function fetchShare(id: string, signal?: AbortSignal): Promise<GetShareResponse> {
  const parsedId = ShareIdSchema.parse(id);
  const response = GetShareResponseSchema.parse(
    await apiRequest<unknown>({
      path: `/v1/shares/${encodeURIComponent(parsedId)}`,
      baseUrl: SHARE_API_BASE_URL,
      init: { signal },
    }),
  );
  if (response.id !== parsedId) {
    throw new ZodError([
      { code: 'custom', path: ['id'], message: 'Share response ID does not match request' },
    ]);
  }
  return response;
}

export async function fetchPopularShares(
  limit = 20,
  signal?: AbortSignal,
): Promise<PopularSharesResponse> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('Popular shares limit must be a positive integer');
  }

  return PopularSharesResponseSchema.parse(
    await apiRequest<unknown>({
      path: '/v1/shares/popular',
      searchParams: { limit },
      baseUrl: SHARE_API_BASE_URL,
      init: { signal },
    }),
  );
}
