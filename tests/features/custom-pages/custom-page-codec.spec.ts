import { describe, expect, it } from 'vitest';
import {
  decodeCustomPageHash,
  encodeCustomPageHash,
  type SharedCustomPagesV1,
} from '@/features/custom-pages/custom-page-state';

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

const shared: SharedCustomPagesV1 = {
  version: 1,
  pages: [
    {
      title: 'First',
      widgets: [
        { id: 'hero', type: 'hero-popularity', x: 2, y: 0, w: 1, h: 13 },
        { id: 'rank', type: 'rank-distribution', x: 0, y: 0, w: 2, h: 10 },
      ],
    },
    { title: '戦績 😀', widgets: [] },
  ],
};

describe('custom page hash codec', () => {
  it('round-trips ordered pages, Unicode titles, and empty layouts', () => {
    const hash = encodeCustomPageHash(shared);

    expect(hash.startsWith('v1.')).toBe(true);
    expect(hash).not.toMatch(/[+/=]/);
    expect(decodeCustomPageHash(hash)).toEqual({ ok: true, value: shared });
  });

  it('canonicalizes every page through the dashboard manifest', () => {
    const hash = encodeRawJson({
      version: 1,
      pages: [
        {
          title: 'Canonical',
          widgets: [
            { id: 'same', type: 'telemetry-snapshot', x: 9.9, y: -2, w: 1.8, h: 1 },
            { id: 'same', type: 'hero-popularity', x: 0, y: 0, w: 1, h: 13 },
            { id: 'unknown', type: 'unknown', x: 0, y: 0, w: 1, h: 1 },
            { id: 'rank', type: 'rank-distribution', x: 0, y: 10, w: 1, h: 4 },
          ],
        },
        { title: 'Empty', widgets: [] },
      ],
    });

    expect(decodeCustomPageHash(hash)).toEqual({
      ok: true,
      value: {
        version: 1,
        pages: [
          {
            title: 'Canonical',
            widgets: [
              { id: 'same', type: 'telemetry-snapshot', x: 2, y: 0, w: 1, h: 9 },
              { id: 'rank', type: 'rank-distribution', x: 0, y: 0, w: 2, h: 10 },
            ],
          },
          { title: 'Empty', widgets: [] },
        ],
      },
    });
  });

  it('rejects empty and over-64-page envelopes and the old single-page shape', () => {
    expectRejected(encodeRawJson({ version: 1, pages: [] }));
    expectRejected(encodeRawJson({
      version: 1,
      pages: Array.from({ length: 65 }, (_, index) => ({ title: `Page ${index}`, widgets: [] })),
    }));
    expectRejected(encodeRawJson({ version: 1, title: 'Old', widgets: [] }));
  });

  it('rejects the entire envelope when any page is invalid', () => {
    const valid = { title: 'Valid', widgets: [] };
    expectRejected(encodeRawJson({ version: 1, pages: [valid, { title: '', widgets: [] }] }));
    expectRejected(encodeRawJson({ version: 1, pages: [valid, { title: 'Bad', widgets: {} }] }));
    expectRejected(encodeRawJson({
      version: 1,
      pages: [valid, { title: 'Bad', widgets: [{ id: 'x', type: 'unknown', x: 0, y: 0, w: 1, h: 1 }] }],
    }));
    expectRejected(encodeRawJson({ version: 1, pages: [valid, { title: '😀'.repeat(41), widgets: [] }] }));
  });

  it('rejects malformed encoding, UTF-8, JSON, nonobjects, and aggregate limits', () => {
    expectRejected('');
    expectRejected('v2.abc');
    expectRejected('v1.***');
    expectRejected(encodeRawBytes([0xc3, 0x28]));
    expectRejected(encodeRawBytes(Array.from(new TextEncoder().encode('{bad'))));
    expectRejected(encodeRawJson([]));
    expectRejected(encodeRawJson(null));
    expectRejected(`v1.${'a'.repeat(43_692)}`);
    const oversized = encodeRawJson({
      version: 1,
      pages: Array.from({ length: 64 }, (_, page) => ({
        title: `Page ${page}`,
        widgets: Array.from({ length: 64 }, (_, widget) => ({
          id: `p${page}-w${widget}-${'x'.repeat(110)}`,
          type: 'hero-popularity', x: 0, y: widget * 13, w: 1, h: 13,
        })),
      })),
    });
    expectRejected(oversized);
  });

  it('rejects over-64-widget pages and invalid widget bounds', () => {
    expectRejected(encodeRawJson({
      version: 1,
      pages: [{
        title: 'Too many',
        widgets: Array.from({ length: 65 }, (_, index) => ({
          id: `widget-${index}`, type: 'hero-popularity', x: 0, y: index * 13, w: 1, h: 13,
        })),
      }],
    }));
    expectRejected(encodeRawJson({
      version: 1,
      pages: [{ title: 'Long ID', widgets: [{ id: 'x'.repeat(129), type: 'hero-popularity', x: 0, y: 0, w: 1, h: 13 }] }],
    }));
    expectRejected(encodeRawJson({
      version: 1,
      pages: [{ title: 'Too tall', widgets: [{ id: 'tall', type: 'hero-popularity', x: 0, y: 0, w: 1, h: 1001 }] }],
    }));
  });
});
