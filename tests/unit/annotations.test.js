import { describe, expect, it } from 'vitest';

import { colorToHex, mergeHighlightAnnotations, normalizeAnnotationText } from '../../src/window/Pdf/utils/annotations';

describe('pdf annotation helpers', () => {
    it('normalizes highlight colors from arrays and strings', () => {
        expect(colorToHex([255, 224, 102])).toBe('#ffe066');
        expect(colorToHex('8ce99a')).toBe('#8ce99a');
    });

    it('normalizes annotation text into a single line', () => {
        expect(normalizeAnnotationText(' Hello\nPDF\tannotation ')).toBe('Hello PDF annotation');
    });

    it('merges saved and live annotations while filtering deleted ids', () => {
        const merged = mergeHighlightAnnotations({
            savedAnnotations: [
                {
                    id: 'saved-1',
                    annotationElementId: 'saved-1',
                    pageIndex: 0,
                    pageNumber: 1,
                    color: '#ffe066',
                    snippet: 'Saved highlight',
                    sortTop: 100,
                },
                {
                    id: 'saved-2',
                    annotationElementId: 'saved-2',
                    pageIndex: 1,
                    pageNumber: 2,
                    color: '#8ce99a',
                    snippet: 'To be deleted',
                    sortTop: 100,
                },
            ],
            liveAnnotations: [
                {
                    id: 'saved-1',
                    annotationElementId: 'saved-1',
                    pageIndex: 0,
                    pageNumber: 1,
                    color: '#74c0fc',
                    snippet: 'Updated live highlight',
                    sortTop: 120,
                },
                {
                    id: 'draft-1',
                    annotationElementId: null,
                    pageIndex: 0,
                    pageNumber: 1,
                    color: '#faa2c1',
                    snippet: 'Unsaved draft',
                    sortTop: 80,
                },
            ],
            deletedAnnotationIds: ['saved-2'],
        });

        expect(merged).toEqual([
            expect.objectContaining({
                id: 'saved-1',
                annotationElementId: 'saved-1',
                color: '#74c0fc',
                snippet: 'Updated live highlight',
            }),
            expect.objectContaining({
                id: 'draft-1',
                annotationElementId: null,
                color: '#faa2c1',
                snippet: 'Unsaved draft',
            }),
        ]);
    });
});
