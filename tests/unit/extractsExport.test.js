import { describe, expect, it } from 'vitest';

import { createExtractsExportFileName, createExtractsMarkdown } from '../../src/window/Pdf/utils/extractsExport';

describe('pdf extracts export helpers', () => {
    it('creates a stable markdown export file name from a pdf document', () => {
        expect(createExtractsExportFileName('Paper.pdf')).toBe('Paper-extracts.md');
        expect(createExtractsExportFileName('')).toBe('document-extracts.md');
    });

    it('renders highlights, reader notes, and embedded comments into markdown', () => {
        const markdown = createExtractsMarkdown({
            documentName: 'Paper.pdf',
            documentPath: '/tmp/Paper.pdf',
            exportedAt: new Date('2026-04-07T00:00:00.000Z'),
            annotations: [
                {
                    pageNumber: 3,
                    snippet: 'A calm UI reduces cognitive load.',
                    readerNote: 'Use this as a north star for the sidebar.',
                    comment: 'Original PDF note',
                    color: '#ffe066',
                },
            ],
        });

        expect(markdown).toContain('# Paper — Extracts');
        expect(markdown).toContain('Source path: /tmp/Paper.pdf');
        expect(markdown).toContain('## 1. Page 3');
        expect(markdown).toContain('> A calm UI reduces cognitive load.');
        expect(markdown).toContain('**Reader note**');
        expect(markdown).toContain('Use this as a north star for the sidebar.');
        expect(markdown).toContain('**PDF comment**');
        expect(markdown).toContain('- Highlight color: #ffe066');
    });
});
