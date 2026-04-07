import { describe, expect, it } from 'vitest';

import {
    normalizePdfCompareMode,
    PDF_COMPARE_MODE_DOCUMENT,
    PDF_COMPARE_MODE_NONE,
    PDF_COMPARE_MODE_TRANSLATION,
} from '../../src/window/Pdf/utils/compare';

describe('pdf compare helpers', () => {
    it('normalizes compare modes from explicit mode or legacy path state', () => {
        expect(normalizePdfCompareMode(PDF_COMPARE_MODE_TRANSLATION, '')).toBe(PDF_COMPARE_MODE_TRANSLATION);
        expect(normalizePdfCompareMode(PDF_COMPARE_MODE_DOCUMENT, '/tmp/paper.pdf')).toBe(PDF_COMPARE_MODE_DOCUMENT);
        expect(normalizePdfCompareMode('', '/tmp/paper.pdf')).toBe(PDF_COMPARE_MODE_DOCUMENT);
        expect(normalizePdfCompareMode('', '')).toBe(PDF_COMPARE_MODE_NONE);
    });
});
