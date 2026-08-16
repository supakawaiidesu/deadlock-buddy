import { describe, expect, it } from 'vitest';
import {
  decodeCustomPageHash,
  encodeCustomPageHash,
} from '@/features/custom-pages/custom-page-state';
import type { SharedCustomPageV1 } from '@/features/custom-pages/custom-page-state';

function encodeRawJson(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `v1.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')}`;
}

function encodeRawBytes(bytes: readonly number[]): string {
  const binary = String.fromCharCode(...bytes);
  return `v1.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')}`;
}

function expectRejected(hash: string) {
  expect(decodeCustomPageHash(hash)).toEqual({ ok: false });
}

const layout: SharedCustomPageV1 = {
  version: 1,
  title: 'Tab 1',
  widgets: [
    { id: 'hero', type: 'hero-popularity', x: 2, y: 0, w: 1, h: 13 },
    { id: 'rank', type: 'rank-distribution', x: 0, y: 0, w: 2, h: 10 },
  ],
};

describe('custom page hash codec', () => {
  it('round-trips an explicit empty Tab 1 layout', () => {
    const hash = encodeCustomPageHash({ version: 1, title: 'Tab 1', widgets: [] });
    const decoded = decodeCustomPageHash(hash);

    expect(decoded).toEqual({
      ok: true,
      value: { version: 1, title: 'Tab 1', widgets: [] },
    });
  });

  it('round-trips Unicode titles through unpadded base64url', () => {
    const hash = encodeCustomPageHash({ version: 1, title: '戦績 😀', widgets: [] });

    expect(hash.startsWith('v1.')).toBe(true);
    expect(hash).not.toMatch(/[+/=]/);
    expect(decodeCustomPageHash(hash)).toMatchObject({
      ok: true,
      value: { title: '戦績 😀' },
    });
  });

  it('preserves supported widget IDs, order, and canonical geometry', () => {
    const decoded = decodeCustomPageHash(encodeCustomPageHash(layout));

    expect(decoded).toMatchObject({ ok: true, value: layout });
  });

  it('canonicalizes duplicate and unknown entries through the dashboard manifest', () => {
    const hash = encodeRawJson({
      version: 1,
      title: 'Canonical',
      widgets: [
        { id: 'same', type: 'telemetry-snapshot', x: 9.9, y: -2, w: 1.8, h: 1 },
        { id: 'same', type: 'hero-popularity', x: 0, y: 0, w: 1, h: 13 },
        { id: 'unknown', type: 'unknown', x: 0, y: 0, w: 1, h: 1 },
        { id: 'rank', type: 'rank-distribution', x: 0, y: 10, w: 1, h: 4 },
      ],
    });
    const decoded = decodeCustomPageHash(hash);

    expect(decoded).toMatchObject({
      ok: true,
      value: {
        title: 'Canonical',
        widgets: [
          { id: 'same', type: 'telemetry-snapshot', x: 2, y: 0, w: 1, h: 9 },
          { id: 'rank', type: 'rank-distribution', x: 0, y: 0, w: 2, h: 10 },
        ],
      },
    });
    if (decoded.ok) expect(encodeCustomPageHash(decoded.value)).not.toBe(hash);
  });

  it('rejects empty, wrong-version, malformed encoding, UTF-8, JSON, and nonobjects', () => {
    expectRejected('');
    expectRejected('v2.abc');
    expectRejected('v1.***');
    expectRejected(encodeRawBytes([0xc3, 0x28]));
    expectRejected(encodeRawBytes(Array.from(new TextEncoder().encode('{bad'))));
    expectRejected(encodeRawJson([]));
    expectRejected(encodeRawJson(null));
  });

  it('rejects oversized envelopes and over-64-widget payloads', () => {
    expectRejected(`v1.${'a'.repeat(43_692)}`);
    expectRejected(
      encodeRawJson({
        version: 1,
        title: 'Too many',
        widgets: Array.from({ length: 65 }, (_, index) => ({
          id: `widget-${index}`,
          type: 'hero-popularity',
          x: 0,
          y: index * 13,
          w: 1,
          h: 13,
        })),
      }),
    );
  });

  it('rejects overlong IDs or titles and nonempty all-invalid layouts', () => {
    expectRejected(
      encodeRawJson({
        version: 1,
        title: '😀'.repeat(41),
        widgets: [],
      }),
    );
    expectRejected(
      encodeRawJson({
        version: 1,
        title: 'Long ID',
        widgets: [
          { id: 'x'.repeat(129), type: 'hero-popularity', x: 0, y: 0, w: 1, h: 13 },
        ],
      }),
    );
    expectRejected(
      encodeRawJson({
        version: 1,
        title: 'Too tall',
        widgets: [
          { id: 'tall', type: 'hero-popularity', x: 0, y: 0, w: 1, h: 1001 },
        ],
      }),
    );
    expectRejected(
      encodeRawJson({
        version: 1,
        title: 'Invalid widgets',
        widgets: [{ id: 'x', type: 'unknown', x: 0, y: 0, w: 1, h: 1 }],
      }),
    );
  });
});
