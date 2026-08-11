import { throttle } from './rate-limit';

/** Aldebaran proxy — preferred base for allowlisted Deadlock API routes. */
const DEFAULT_PROXY_BASE_URL = 'https://aldebaran-production.up.railway.app';

/**
 * Official upstream Deadlock API.
 * Used for routes the proxy does not cover (tight rate limits / multi-tenant risk)
 * and for any path not on the proxy allowlist.
 */
const DEFAULT_UPSTREAM_BASE_URL = 'https://api.deadlock-api.com';

/**
 * Paths the Aldebaran proxy is known to serve. Anything else stays on upstream
 * so unproxied endpoints (match metadata, Deadlock steam helpers, rank, …)
 * never silently hit a missing proxy route.
 */
const PROXY_PATH_PATTERNS: readonly RegExp[] = [
  /^\/v1\/leaderboard\/[^/?#]+$/,
  /^\/v1\/analytics\/scoreboards\/heroes$/,
  /^\/v1\/analytics\/game-stats$/,
  /^\/v1\/analytics\/hero-stats$/,
  /^\/v1\/analytics\/hero-comb-stats$/,
  /^\/v1\/analytics\/hero-counter-stats$/,
  /^\/v1\/analytics\/item-stats$/,
  /^\/v1\/analytics\/badge-distribution$/,
  /^\/v1\/players\/hero-stats$/,
  /^\/v1\/players\/[^/?#]+\/match-history$/,
];

export type ApiSearchParamValue =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[]
  | null
  | undefined;

export type ApiRequestOptions = {
  readonly path: string;
  readonly searchParams?: Record<string, ApiSearchParamValue>;
  readonly init?: RequestInit;
  /**
   * Overrides automatic base selection. Used by the Steam identity service and
   * any caller that must pin a specific host.
   */
  readonly baseUrl?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Proxy base for allowlisted Deadlock routes. */
export const deadlockApiBaseUrl =
  import.meta.env.VITE_DEADLOCK_API_BASE ?? DEFAULT_PROXY_BASE_URL;

/** Upstream Deadlock API — match metadata, steam helpers, and non-allowlisted paths. */
export const deadlockApiUpstreamBaseUrl =
  import.meta.env.VITE_DEADLOCK_API_UPSTREAM ?? DEFAULT_UPSTREAM_BASE_URL;

export function isProxiedDeadlockPath(path: string): boolean {
  const pathname = path.startsWith('http') ? new URL(path).pathname : path.split(/[?#]/, 1)[0] ?? path;
  return PROXY_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function resolveBaseUrl(path: string, override?: string): string {
  if (override) return override;
  return isProxiedDeadlockPath(path) ? deadlockApiBaseUrl : deadlockApiUpstreamBaseUrl;
}

function buildUrl(
  path: string,
  searchParams?: ApiRequestOptions['searchParams'],
  base: string,
) {
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
        return;
      }
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

async function executeRequest(options: ApiRequestOptions) {
  const { init } = options;
  const base = resolveBaseUrl(options.path, options.baseUrl);
  const response = await fetch(buildUrl(options.path, options.searchParams, base), {
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  return throttle(() => executeRequest(options) as Promise<T>);
}
