import { describe, expect, it } from 'vitest';

import { splitPrimaryTranslationServices } from '../../src/window/Pdf/utils/translationLayout';

describe('pdf translation layout helpers', () => {
    it('keeps the first service as the primary result and tucks the rest behind comparison mode', () => {
        expect(splitPrimaryTranslationServices(['deepl', 'bing', 'google'])).toEqual({
            primaryService: 'deepl',
            secondaryServices: [
                { instanceKey: 'bing', index: 1 },
                { instanceKey: 'google', index: 2 },
            ],
        });
    });

    it('handles empty or invalid service lists safely', () => {
        expect(splitPrimaryTranslationServices()).toEqual({
            primaryService: null,
            secondaryServices: [],
        });
        expect(splitPrimaryTranslationServices(null)).toEqual({
            primaryService: null,
            secondaryServices: [],
        });
    });
});
