import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ZodError } from 'zod';
import { ApiError } from '@/lib/api/client';
import {
  CreateShareResponseSchema,
  GetShareResponseSchema,
  PopularSharesResponseSchema,
  ShareDocumentV2Schema,
  ShareDocumentV3Schema,
  ShareProfileV2Schema,
  ShareProfileV3Schema,
  type ShareDocumentV2,
  type ShareDocumentV3,
} from '@/lib/api/schema';
import {
  SHARE_API_BASE_URL,
  buildPublicShareUrl,
  createShare,
  fetchShare,
  fetchPopularShares,
  isRetryableShareError,
  normalizeShareName,
  parseSharePath,
} from '@/lib/api/shares';

const SHARE_ID = 'QWNBmuNQapTS8ByTy82kJq';
const OTHER_SHARE_ID = 'QWNBmuNQapTS8ByTy82kJr';
const SHARE_PATH = `/s/hero-stats-${SHARE_ID}`;
const validWidget = {
  id: 'hero-widget',
  type: 'hero-popularity' as const,
  x: 0,
  y: 0,
  w: 1,
  h: 13,
};
const validDocument: ShareDocumentV3 = {
  name: 'Hero Stats',
  profile: {
    version: 3,
    pages: [{ title: 'NA Picks', widgets: [validWidget] }],
  },
};
const validV2Document: ShareDocumentV2 = {
  name: validDocument.name,
  profile: { version: 2, pages: [{ title: 'NA Picks', widgets: [validWidget] }] },
};
const validChartWidget = {
  id: 'hero-history',
  type: 'hero-winrate-over-time' as const,
  x: 0,
  y: 0,
  w: 3,
  h: 18,
  settings: {
    heroIds: [1, 2],
    minUnixTimestamp: 1_700_000_000,
    minAverageBadge: 91,
    maxAverageBadge: 116,
  },
};
const validTotalMatchesWidget = {
  id: 'total-matches-history',
  type: 'total-matches-over-time' as const,
  x: 0,
  y: 0,
  w: 3,
  h: 18,
  settings: {
    minUnixTimestamp: 1_785_430_800,
    minAverageBadge: 0,
    maxAverageBadge: 116,
  },
};
const validCreateResponse = {
  id: SHARE_ID,
  name: 'Hero Stats',
  slug: 'hero-stats',
  path: SHARE_PATH,
  created: true,
  bytes: { raw: 182, compressed: 143 },
};
const validGetResponse = {
  id: SHARE_ID,
  name: 'Hero Stats',
  slug: 'hero-stats',
  path: SHARE_PATH,
  profile: validDocument.profile,
  bytes: { raw: 182, compressed: 143 },
  createdAt: '2026-08-17T04:01:43.007Z',
  views: 5,
};
const validPopularResponse = {
  shares: [{
    id: SHARE_ID,
    name: 'Hero Stats',
    slug: 'hero-stats',
    path: SHARE_PATH,
    views: 12,
    createdAt: '2026-08-16T12:00:00.000Z',
    bytes: { raw: 108, compressed: 95 },
  }],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Request failed',
    headers: { 'Content-Type': 'application/json' },
  });
}

function documentWithWidget(widget: Record<string, unknown>): unknown {
  return {
    name: 'Hero Stats',
    profile: { version: 3, pages: [{ title: 'NA Picks', widgets: [widget] }] },
  };
}
let fetchMock: Mock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Share path transport', () => {
  it('extracts only the Base58 ID from canonical and altered decorative paths', () => {
    expect(parseSharePath(SHARE_PATH)).toBe(SHARE_ID);
    expect(parseSharePath(`/s/wrong-label-${SHARE_ID}`)).toBe(SHARE_ID);
    expect(parseSharePath(`/s/${SHARE_ID}`)).toBe(SHARE_ID);
  });

  it.each([
    `/s/hero-stats-${'Q'.repeat(20)}`,
    '/s/hero-stats-000000000000000000000',
    `/s/hero-stats-${SHARE_ID}/`,
    `/s/hero-stats-${SHARE_ID}?preview=1`,
    `/s/hero-stats-${SHARE_ID}#preview`,
  ])('rejects invalid share pathname %s without issuing GET', async (pathname) => {
    const id = parseSharePath(pathname);
    expect(id).toBeNull();
    if (id !== null) await fetchShare(id);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the exact normalized v3 document and accepts duplicate success', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(validCreateResponse))
      .mockResolvedValueOnce(jsonResponse({ ...validCreateResponse, created: false }));
    const normalizedDocument: ShareDocumentV3 = {
      ...validDocument,
      name: normalizeShareName('  Hero   Stats  '),
    };

    await expect(createShare(normalizedDocument)).resolves.toEqual(validCreateResponse);
    await expect(createShare(normalizedDocument)).resolves.toEqual({
      ...validCreateResponse,
      created: false,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SHARE_API_BASE_URL}/v1/shares`);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers)).toEqual(
      new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' }),
    );
    expect(JSON.parse(init.body as string)).toEqual(normalizedDocument);
    expect(buildPublicShareUrl(validCreateResponse.path)).toBe(
      `https://618lock.com${validCreateResponse.path}`,
    );
    expect(() => buildPublicShareUrl(`https://example.test${SHARE_PATH}`)).toThrow();
  });

  it('builds local Share links from the supplied frontend origin', () => {
    expect(buildPublicShareUrl(SHARE_PATH, 'http://localhost:5173')).toBe(
      `http://localhost:5173${SHARE_PATH}`,
    );
  });

  it('gets the current share resource contract and forwards cancellation', async () => {
    fetchMock.mockResolvedValue(jsonResponse(validGetResponse));
    const controller = new AbortController();

    await expect(fetchShare(SHARE_ID, controller.signal)).resolves.toEqual(validGetResponse);
    expect(GetShareResponseSchema.safeParse({ ...validGetResponse, views: -1 }).success).toBe(false);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SHARE_API_BASE_URL}/v1/shares/${SHARE_ID}`);
    expect(init.signal).toBe(controller.signal);
  });

  it('gets the popular leaderboard with a positive limit and forwards cancellation', async () => {
    fetchMock.mockResolvedValue(jsonResponse(validPopularResponse));
    const controller = new AbortController();

    await expect(fetchPopularShares(20, controller.signal)).resolves.toEqual(validPopularResponse);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SHARE_API_BASE_URL}/v1/shares/popular?limit=20`);
    expect(init.signal).toBe(controller.signal);
    await expect(fetchPopularShares(0)).rejects.toBeInstanceOf(RangeError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed popular leaderboard entries', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      shares: [{ ...validPopularResponse.shares[0], views: -1 }],
    }));

    await expect(fetchPopularShares()).rejects.toBeInstanceOf(ZodError);
    expect(PopularSharesResponseSchema.safeParse({
      ...validPopularResponse,
      extra: true,
    }).success).toBe(false);
  });

  it('rejects mismatched response IDs and canonical paths', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        ...validGetResponse,
        id: OTHER_SHARE_ID,
        path: `/s/hero-stats-${OTHER_SHARE_ID}`,
      }))
      .mockResolvedValueOnce(jsonResponse({ ...validGetResponse, path: `/s/wrong-${SHARE_ID}` }));

    await expect(fetchShare(SHARE_ID)).rejects.toBeInstanceOf(ZodError);
    await expect(fetchShare(SHARE_ID)).rejects.toBeInstanceOf(ZodError);
  });

  it('preserves HTTP status and parsed error details', async () => {
    const body = { error: 'NOT_FOUND', details: { id: SHARE_ID } };
    fetchMock.mockResolvedValue(jsonResponse(body, 404));

    const rejection = fetchShare(SHARE_ID).catch((error: unknown) => error);
    await expect(rejection).resolves.toMatchObject({ status: 404, response: body });
    await expect(rejection).resolves.toBeInstanceOf(ApiError);
  });
});

describe('Share wire schemas', () => {
  it('uses strict objects at every request and response level', () => {
    const requestUnknownKeys = [
      { ...validDocument, extra: true },
      { ...validDocument, profile: { ...validDocument.profile, extra: true } },
      {
        ...validDocument,
        profile: {
          ...validDocument.profile,
          pages: [{ ...validDocument.profile.pages[0], extra: true }],
        },
      },
      documentWithWidget({ ...validWidget, extra: true }),
    ];
    for (const candidate of requestUnknownKeys) {
      expect(ShareDocumentV3Schema.safeParse(candidate).success).toBe(false);
    }
    expect(CreateShareResponseSchema.safeParse({ ...validCreateResponse, extra: true }).success)
      .toBe(false);
    expect(GetShareResponseSchema.safeParse({ ...validGetResponse, extra: true }).success)
      .toBe(false);
  });

  it('enforces v2/v3 pages and Unicode code-point name and title limits', () => {
    expect(ShareDocumentV3Schema.safeParse({ ...validDocument, name: '😀'.repeat(80) }).success)
      .toBe(true);
    expect(ShareDocumentV3Schema.safeParse({ ...validDocument, name: '😀'.repeat(81) }).success)
      .toBe(false);
    expect(ShareDocumentV3Schema.safeParse({ ...validDocument, name: ' Hero Stats ' }).success)
      .toBe(false);
    expect(ShareDocumentV3Schema.safeParse({ ...validDocument, name: 'Hero\tStats' }).success)
      .toBe(false);
    expect(ShareDocumentV3Schema.safeParse({ ...validDocument, name: '' }).success).toBe(false);
    expect(ShareProfileV2Schema.safeParse({ ...validV2Document.profile, version: 1 }).success)
      .toBe(false);
    expect(ShareProfileV3Schema.safeParse({ version: 3, pages: [] }).success).toBe(false);
    expect(ShareProfileV3Schema.safeParse({
      version: 3,
      pages: [{ title: '😀'.repeat(40), widgets: [] }],
    }).success).toBe(true);
    expect(ShareProfileV3Schema.safeParse({
      version: 3,
      pages: [{ title: '😀'.repeat(41), widgets: [] }],
    }).success).toBe(false);
    expect(ShareProfileV3Schema.safeParse({
      version: 3,
      pages: [{ title: ' Trimmed ', widgets: [] }],
    }).success).toBe(false);
  });

  it('rejects duplicate, malformed, and unsupported widgets', () => {
    expect(ShareDocumentV3Schema.safeParse({
      ...validDocument,
      profile: {
        version: 3,
        pages: [{ title: 'Duplicate', widgets: [validWidget, validWidget] }],
      },
    }).success).toBe(false);
    expect(ShareDocumentV3Schema.safeParse(documentWithWidget({
      ...validWidget,
      id: 'bad id',
    })).success).toBe(false);
    expect(ShareDocumentV3Schema.safeParse(documentWithWidget({
      ...validWidget,
      type: 'unknown-widget',
    })).success).toBe(false);
  });

  it.each([
    ['x', -1],
    ['x', 10_001],
    ['y', 1.5],
    ['w', 0],
    ['w', 13],
    ['h', 0],
    ['h', 1_001],
    ['h', '13'],
  ])('rejects invalid %s geometry %s', (field, value) => {
    expect(ShareDocumentV3Schema.safeParse(documentWithWidget({
      ...validWidget,
      [field]: value,
    })).success).toBe(false);
  });

  it('accepts strict chart settings and rejects malformed configuration', () => {
    expect(ShareDocumentV3Schema.safeParse(documentWithWidget(validChartWidget)).success).toBe(true);
    const invalidSettings = [
      undefined,
      { ...validChartWidget.settings, unknown: true },
      { ...validChartWidget.settings, heroIds: [] },
      { ...validChartWidget.settings, heroIds: [1, 1] },
      { ...validChartWidget.settings, heroIds: [999_999] },
      { ...validChartWidget.settings, heroIds: Array.from({ length: 9 }, (_, i) => i + 1) },
      { ...validChartWidget.settings, minUnixTimestamp: 0 },
      { ...validChartWidget.settings, minUnixTimestamp: 1.5 },
      { ...validChartWidget.settings, minAverageBadge: -1 },
      { ...validChartWidget.settings, maxAverageBadge: 117 },
      { ...validChartWidget.settings, minAverageBadge: 100, maxAverageBadge: 90 },
    ];

    for (const settings of invalidSettings) {
      const widget = settings === undefined
        ? Object.fromEntries(Object.entries(validChartWidget).filter(([key]) => key !== 'settings'))
        : { ...validChartWidget, settings };
      expect(ShareDocumentV3Schema.safeParse(documentWithWidget(widget)).success).toBe(false);
    }
  });

  it('round-trips strict total-matches settings in V3', () => {
    const document = documentWithWidget(validTotalMatchesWidget);
    expect(ShareDocumentV3Schema.parse(document)).toEqual(document);
    expect(ShareDocumentV3Schema.safeParse(documentWithWidget({
      ...validTotalMatchesWidget,
      settings: { ...validTotalMatchesWidget.settings, maxAverageBadge: 117 },
    })).success).toBe(false);
    expect(ShareDocumentV3Schema.safeParse(documentWithWidget({
      ...validTotalMatchesWidget,
      settings: { ...validTotalMatchesWidget.settings, unknown: true },
    })).success).toBe(false);
    expect(ShareDocumentV2Schema.safeParse(document).success).toBe(false);
  });

  it('rejects unsafe slugs, paths, byte metadata, and timestamps', () => {
    expect(CreateShareResponseSchema.safeParse({
      ...validCreateResponse,
      slug: 'hero/stats',
      path: SHARE_PATH,
    }).success).toBe(false);
    expect(CreateShareResponseSchema.safeParse({
      ...validCreateResponse,
      path: `/s/other-${SHARE_ID}`,
    }).success).toBe(false);
    expect(CreateShareResponseSchema.safeParse({
      ...validCreateResponse,
      bytes: { raw: -1, compressed: 2.5 },
    }).success).toBe(false);
    expect(GetShareResponseSchema.safeParse({
      ...validGetResponse,
      createdAt: 'yesterday',
    }).success).toBe(false);
  });
});

describe('Share retry policy', () => {
  it('retries only network and 503 failures within the standard budget', () => {
    expect(isRetryableShareError(0, new TypeError('network unavailable'))).toBe(true);
    expect(isRetryableShareError(2, new ApiError('unavailable', 503))).toBe(true);
    expect(isRetryableShareError(3, new TypeError('network unavailable'))).toBe(false);
    expect(isRetryableShareError(0, new DOMException('aborted', 'AbortError'))).toBe(false);
    expect(isRetryableShareError(0, new ApiError('bad request', 400))).toBe(false);
    expect(isRetryableShareError(0, new ApiError('missing', 404))).toBe(false);
    expect(isRetryableShareError(0, new ApiError('rate limited', 429))).toBe(false);
    expect(isRetryableShareError(0, new ZodError([]))).toBe(false);
  });
});
