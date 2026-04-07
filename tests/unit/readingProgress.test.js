import { describe, expect, it } from 'vitest';

import {
    PDF_READING_PROGRESS_LIMIT,
    getPdfReadingProgress,
    normalizePdfReadingProgressMap,
    setPdfReadingProgress,
} from '../../src/window/Pdf/utils/readingProgress';

describe('pdf reading progress helpers', () => {
    it('stores and retrieves the latest reading progress for a path', () => {
        const next = setPdfReadingProgress({}, '/tmp/reader.pdf', {
            pageNumber: 5,
            scaleValue: 'page-width',
        });

        expect(getPdfReadingProgress(next, '/tmp/reader.pdf')).toEqual(
            expect.objectContaining({
                pageNumber: 5,
                scaleValue: 'page-width',
            })
        );
    });

    it('normalizes malformed progress maps and respects the storage limit', () => {
        const rawMap = Object.fromEntries(
            Array.from({ length: PDF_READING_PROGRESS_LIMIT + 3 }, (_, index) => [
                `/tmp/${index}.pdf`,
                {
                    pageNumber: index + 1,
                    scaleValue: '',
                    updatedAt: index,
                },
            ])
        );

        const normalized = normalizePdfReadingProgressMap({
            ...rawMap,
            '/tmp/invalid.pdf': null,
        });

        expect(Object.keys(normalized)).toHaveLength(PDF_READING_PROGRESS_LIMIT);
        expect(normalized['/tmp/34.pdf']?.scaleValue || normalized['/tmp/33.pdf']?.scaleValue).toBe('page-width');
    });
});
