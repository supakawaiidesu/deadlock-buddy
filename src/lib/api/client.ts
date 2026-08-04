import { throttle } from './rate-limit';

const DEFAULT_BASE_URL = 'https://api.deadlock-api.com';

export type ApiRequestOptions = {
  readonly path: string;
  readonly searchParams?: Record<string, string | number | boolean | undefined | null>;
  readonly init?: RequestInit;
  /** Overrides the Deadlock API base. Used by the Steam identity service. */
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

export const deadlockApiBaseUrl = import.meta.env.VITE_DEADLOCK_API_BASE ?? DEFAULT_BASE_URL;

function buildUrl(
  path: string,
  searchParams?: ApiRequestOptions['searchParams'],
  base: string = deadlockApiBaseUrl,
) {
  const url = new URL(path, base);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

async function executeRequest(options: ApiRequestOptions) {
  const { init } = options;
  const response = await fetch(buildUrl(options.path, options.searchParams, options.baseUrl), {
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
