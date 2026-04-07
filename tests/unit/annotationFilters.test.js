import { describe, expect, it } from 'vitest';

import { filterHighlightAnnotations, hasActiveAnnotationFilters } from '../../src/window/Pdf/utils/annotationFilters';

const annotations = [
    {
        id: 'one',
        pageNumber: 1,
        color: '#ffe066',
        snippet: 'Apple design notes',
        comment: 'Keep it calm',
    },
    {
        id: 'two',
        pageNumber: 2,
        color: '#74c0fc',
        snippet: 'Translation flow',
        comment: 'Sidebar interaction',
    },
];

describe('pdf annotation filters', () => {
    it('detects whether any filters are active', () => {
        expect(hasActiveAnnotationFilters()).toBe(false);
        expect(hasActiveAnnotationFilters({ searchQuery: 'apple' })).toBe(true);
        expect(hasActiveAnnotationFilters({ colorFilter: '#ffe066' })).toBe(true);
    });

    it('filters highlights by search text across snippet and comment', () => {
        expect(filterHighlightAnnotations({ annotations, searchQuery: 'calm' })).toEqual([annotations[0]]);
        expect(filterHighlightAnnotations({ annotations, searchQuery: 'translation' })).toEqual([annotations[1]]);
    });

    it('filters highlights by color while preserving matching items', () => {
        expect(filterHighlightAnnotations({ annotations, colorFilter: '#74c0fc' })).toEqual([annotations[1]]);
        expect(filterHighlightAnnotations({ annotations, searchQuery: 'sidebar', colorFilter: '#74c0fc' })).toEqual([
            annotations[1],
        ]);
    });
});
