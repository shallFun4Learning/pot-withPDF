import { describe, expect, it } from 'vitest';

import { shouldAutoTranslateSelection, shouldTrackSelection } from '../../src/window/Pdf/utils/selectionMode';

describe('pdf selection modes', () => {
    it('tracks selection only outside highlight mode', () => {
        expect(shouldTrackSelection('translate')).toBe(true);
        expect(shouldTrackSelection('highlight')).toBe(false);
    });

    it('auto-translates selection only in translate mode', () => {
        expect(shouldAutoTranslateSelection({ interactionMode: 'translate', autoTranslateSelection: true })).toBe(true);
        expect(shouldAutoTranslateSelection({ interactionMode: 'translate', autoTranslateSelection: false })).toBe(false);
        expect(shouldAutoTranslateSelection({ interactionMode: 'highlight', autoTranslateSelection: true })).toBe(false);
    });
});
