import { describe, expect, it } from 'vitest';

import {
    applyPdfSearchMatches,
    createPdfSearchState,
    mapPdfFindControlState,
} from '../../src/window/Pdf/utils/search';

describe('pdf search helpers', () => {
    it('creates a default idle search state', () => {
        expect(createPdfSearchState()).toEqual({
            query: '',
            current: 0,
            total: 0,
            status: 'idle',
            pending: false,
            previous: false,
        });
    });

    it('maps pdf.js find controller updates into UI-friendly state', () => {
        const pending = mapPdfFindControlState(
            {
                state: 3,
                rawQuery: 'apple',
                matchesCount: { current: 0, total: 0 },
                previous: false,
            },
            createPdfSearchState()
        );
        expect(pending).toEqual(expect.objectContaining({ query: 'apple', status: 'pending', pending: true }));

        const found = mapPdfFindControlState(
            {
                state: 0,
                rawQuery: 'apple',
                matchesCount: { current: 2, total: 5 },
                previous: true,
            },
            pending
        );
        expect(found).toEqual(expect.objectContaining({ current: 2, total: 5, status: 'found', previous: true }));
        expect(applyPdfSearchMatches(found, { current: 3, total: 5 })).toEqual(
            expect.objectContaining({ current: 3, total: 5 })
        );
    });
});
