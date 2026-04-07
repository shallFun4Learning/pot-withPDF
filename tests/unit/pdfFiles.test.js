import { describe, expect, it } from 'vitest';

import { createPdfDocumentFromFile, findFirstPdfFile, findFirstPdfPath, isPdfPath } from '../../src/window/Pdf/utils/pdfFiles';

describe('pdf file helpers', () => {
    it('detects PDF paths and picks the first valid one', () => {
        expect(isPdfPath('/tmp/example.pdf')).toBe(true);
        expect(isPdfPath('/tmp/example.txt')).toBe(false);
        expect(findFirstPdfPath(['/tmp/a.txt', '/tmp/b.pdf', '/tmp/c.pdf'])).toBe('/tmp/b.pdf');
    });

    it('picks the first dropped pdf file and converts it to viewer data', async () => {
        const textFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
        const pdfFile = {
            name: 'sample.pdf',
            type: 'application/pdf',
            async arrayBuffer() {
                return new Uint8Array([1, 2, 3]).buffer;
            },
        };

        expect(findFirstPdfFile([textFile, pdfFile])).toBe(pdfFile);

        const document = await createPdfDocumentFromFile(pdfFile);
        expect(document).toEqual({
            path: '',
            name: 'sample.pdf',
            data: new Uint8Array([1, 2, 3]),
        });
    });
});
