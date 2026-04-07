import { describe, expect, it } from 'vitest';

import {
    createPdfCitationCopyText,
    createPdfExtractCopyText,
} from '../../src/window/Pdf/utils/quotes';

describe('pdf quote helpers', () => {
    const annotation = {
        pageNumber: 12,
        snippet: 'A calm reader should not force people to manage tools while they read.',
        readerNote: 'Important product principle.',
    };

    it('formats extract copy text with page metadata', () => {
        expect(
            createPdfExtractCopyText(annotation, {
                documentName: 'Design Notes.pdf',
            })
        ).toBe(
            'A calm reader should not force people to manage tools while they read.\n\nNote: Important product principle.\n\nDesign Notes.pdf — p. 12'
        );
    });

    it('formats citation copy text with the document label and page', () => {
        expect(
            createPdfCitationCopyText(annotation, {
                documentName: 'Design Notes.pdf',
            })
        ).toBe(
            '“A calm reader should not force people to manage tools while they read.”\n— Design Notes.pdf, p. 12'
        );
    });
});
