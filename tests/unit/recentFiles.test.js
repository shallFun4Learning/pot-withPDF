import { describe, expect, it } from 'vitest';

import {
    PDF_RECENT_FILES_LIMIT,
    addRecentPdfFile,
    normalizeRecentPdfFile,
    normalizeRecentPdfFiles,
    removeRecentPdfFile,
} from '../../src/window/Pdf/utils/recentFiles';

describe('pdf recent files helpers', () => {
    it('normalizes a recent file entry and derives a file name from its path', () => {
        const normalized = normalizeRecentPdfFile('/tmp/reader/sample.pdf');
        expect(normalized).toEqual(
            expect.objectContaining({
                path: '/tmp/reader/sample.pdf',
                name: 'sample.pdf',
            })
        );
        expect(normalized.lastOpenedAt).toEqual(expect.any(Number));
    });

    it('deduplicates and prepends the latest recent file', () => {
        const next = addRecentPdfFile(
            [
                { path: '/tmp/first.pdf', name: 'first.pdf', lastOpenedAt: 1 },
                { path: '/tmp/second.pdf', name: 'second.pdf', lastOpenedAt: 2 },
            ],
            { path: '/tmp/first.pdf', name: 'first.pdf' }
        );

        expect(next[0]).toEqual(
            expect.objectContaining({
                path: '/tmp/first.pdf',
                name: 'first.pdf',
            })
        );
        expect(next).toHaveLength(2);
    });

    it('normalizes invalid recent-file collections and removes unreadable paths', () => {
        const normalized = normalizeRecentPdfFiles([
            null,
            { path: '' },
            { path: '/tmp/one.pdf', name: '', lastOpenedAt: 1 },
            { path: '/tmp/one.pdf', name: 'duplicate.pdf', lastOpenedAt: 2 },
        ]);

        expect(normalized).toEqual([
            {
                path: '/tmp/one.pdf',
                name: 'one.pdf',
                lastOpenedAt: 1,
            },
        ]);

        expect(removeRecentPdfFile(normalized, '/tmp/one.pdf')).toEqual([]);
    });

    it('caps recent files to the configured limit', () => {
        const list = Array.from({ length: PDF_RECENT_FILES_LIMIT + 2 }, (_, index) => ({
            path: `/tmp/${index}.pdf`,
            name: `${index}.pdf`,
            lastOpenedAt: index,
        }));

        expect(normalizeRecentPdfFiles(list)).toHaveLength(PDF_RECENT_FILES_LIMIT);
    });
});
