import { describe, expect, it } from 'vitest';

import {
    addPdfDocumentTerm,
    copyPdfDocumentTerms,
    findPdfTermByText,
    getPdfDocumentTerms,
    normalizePdfTermBankMap,
    updatePdfDocumentTerm,
} from '../../src/window/Pdf/utils/terms';

describe('pdf term bank helpers', () => {
    it('adds document terms and deduplicates repeated selections', () => {
        const first = addPdfDocumentTerm(
            {},
            {
                path: '/tmp/paper.pdf',
                sourceText: 'Latent   Variable',
                now: 100,
            }
        );

        const second = addPdfDocumentTerm(first.termBankMap, {
            path: '/tmp/paper.pdf',
            sourceText: ' latent variable ',
            preferredTranslation: '潜变量',
            now: 200,
        });

        const terms = getPdfDocumentTerms(second.termBankMap, '/tmp/paper.pdf');
        expect(terms).toHaveLength(1);
        expect(terms[0]).toEqual(
            expect.objectContaining({
                sourceText: 'Latent Variable',
                preferredTranslation: '潜变量',
                createdAt: 100,
                updatedAt: 200,
            })
        );
        expect(second.existed).toBe(true);
    });

    it('normalizes malformed maps and supports document-name fallback keys', () => {
        const map = normalizePdfTermBankMap({
            '': [{ sourceText: 'ignored' }],
            'name:Draft.pdf': [
                { sourceText: ' Embodiment ', updatedAt: 200, id: 'a' },
                { sourceText: 'embodiment', updatedAt: 100, id: 'b' },
            ],
        });

        expect(getPdfDocumentTerms(map, '', 'Draft.pdf')).toEqual([
            expect.objectContaining({
                id: 'a',
                sourceText: 'Embodiment',
                updatedAt: 200,
            }),
        ]);
        expect(findPdfTermByText(getPdfDocumentTerms(map, '', 'Draft.pdf'), ' embodiment ')).toEqual(
            expect.objectContaining({ id: 'a' })
        );
    });

    it('updates and copies terms when a document gains a new save path', () => {
        const added = addPdfDocumentTerm(
            {},
            {
                documentName: 'Draft.pdf',
                sourceText: 'reinforcement learning',
                now: 300,
            }
        );

        const originalTerm = getPdfDocumentTerms(added.termBankMap, '', 'Draft.pdf')[0];
        const updated = updatePdfDocumentTerm(added.termBankMap, {
            documentName: 'Draft.pdf',
            termId: originalTerm.id,
            patch: {
                preferredTranslation: '强化学习',
                note: 'Keep this translation consistent.',
            },
            now: 400,
        });

        const copied = copyPdfDocumentTerms(updated, {
            fromDocumentName: 'Draft.pdf',
            toPath: '/tmp/final.pdf',
            toDocumentName: 'final.pdf',
        });

        expect(getPdfDocumentTerms(copied, '/tmp/final.pdf')).toEqual([
            expect.objectContaining({
                sourceText: 'reinforcement learning',
                preferredTranslation: '强化学习',
                note: 'Keep this translation consistent.',
                updatedAt: 400,
            }),
        ]);
    });
});
