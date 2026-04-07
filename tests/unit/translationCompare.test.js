import { describe, expect, it } from 'vitest';

import { flattenTranslationResult } from '../../src/window/Pdf/utils/translationCompare';

describe('pdf translation compare helpers', () => {
    it('returns normalized text for string results', () => {
        expect(flattenTranslationResult('  Hello\n\nworld  ')).toBe('Hello\n\nworld');
    });

    it('flattens structured dictionary-like results into readable text', () => {
        expect(
            flattenTranslationResult({
                pronunciations: [{ region: 'US', symbol: '/riːd/' }],
                explanations: [{ trait: 'v.', explains: ['阅读', '研读'] }],
                associations: ['reader'],
                sentence: [{ target: '<b>Read</b> more carefully.' }],
            })
        ).toBe('US /riːd/\n\nv. 阅读；研读\n\nreader\n\nRead more carefully.');
    });
});
