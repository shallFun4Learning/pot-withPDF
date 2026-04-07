import { describe, expect, it, vi } from 'vitest';

import { flattenOutlineItems, normalizeOutlineTitle, resolveOutlineItems } from '../../src/window/Pdf/utils/outline';

describe('pdf outline helpers', () => {
    it('normalizes titles and resolves outline destinations into page numbers', async () => {
        const introRef = { num: 1, gen: 0 };
        const appendixRef = { num: 4, gen: 0 };
        const pdfDocument = {
            getDestination: vi.fn(async (name) => {
                if (name === 'intro') {
                    return [introRef];
                }
                return null;
            }),
            getPageIndex: vi.fn(async (ref) => {
                if (ref === introRef) {
                    return 0;
                }
                if (ref === appendixRef) {
                    return 3;
                }
                throw new Error('unknown ref');
            }),
        };

        const resolved = await resolveOutlineItems(pdfDocument, [
            {
                title: '  Introduction  ',
                dest: 'intro',
                items: [
                    {
                        title: 'Overview',
                        dest: [1],
                        items: [],
                    },
                ],
            },
            {
                title: '',
                dest: [appendixRef],
                items: [],
            },
        ]);

        expect(resolved).toEqual([
            expect.objectContaining({
                title: 'Introduction',
                pageNumber: 1,
                items: [expect.objectContaining({ title: 'Overview', pageNumber: 2 })],
            }),
            expect.objectContaining({
                title: '',
                pageNumber: 4,
            }),
        ]);
    });

    it('flattens nested outline items while preserving depth', () => {
        const flattened = flattenOutlineItems([
            {
                id: 'root',
                title: 'Root',
                items: [
                    {
                        id: 'child',
                        title: 'Child',
                        items: [],
                    },
                ],
            },
        ]);

        expect(flattened).toEqual([
            expect.objectContaining({ id: 'root', depth: 0 }),
            expect.objectContaining({ id: 'child', depth: 1 }),
        ]);
        expect(normalizeOutlineTitle('  A   B  ')).toBe('A B');
    });
});
