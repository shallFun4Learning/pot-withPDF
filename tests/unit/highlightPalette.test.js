import { describe, expect, it } from 'vitest';

import { normalizeHighlightColor, PDF_HIGHLIGHT_PRESETS } from '../../src/window/Pdf/utils/highlightPalette';

describe('highlight color palette', () => {
    it('falls back to the default preset when color is missing or unknown', () => {
        expect(normalizeHighlightColor()).toBe(PDF_HIGHLIGHT_PRESETS[0].value);
        expect(normalizeHighlightColor('#000000')).toBe(PDF_HIGHLIGHT_PRESETS[0].value);
    });

    it('keeps supported highlight colors', () => {
        expect(normalizeHighlightColor('#8CE99A')).toBe('#8ce99a');
    });
});
