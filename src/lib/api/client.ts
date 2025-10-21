import { throttle } from './rate-limit';

const DEFAULT_BASE_URL = 'https://api.deadlock-api.com';

export type ApiRequestOptions = {
  readonly path: string;
  readonly searchParams?: Record<string, string | number | boolean | undefined | null>;
  readonly init?: RequestInit;
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

const baseUrl = process.env.NEXT_PUBLIC_DEADLOCK_API_BASE ?? DEFAULT_BASE_URL;

function buildUrl(path: string, searchParams?: ApiRequestOptions['searchParams']) {
  const url = new URL(path, baseUrl);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

async function executeRequest(options: ApiRequestOptions) {
  const response = await fetch(buildUrl(options.path, options.searchParams), {
    headers: {
      Accept: 'application/json',
      ...options.init?.headers,
    },
    ...options.init,
    next: {
      revalidate: 60,
      ...(options.init as any)?.next,
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(
      `Deadlock API request failed: ${response.status} ${response.statusText}`,
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
