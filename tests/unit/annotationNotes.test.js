import { describe, expect, it } from 'vitest';

import {
    getAnnotationClientKey,
    getAnnotationDisplayNote,
    getDocumentAnnotationNotes,
    setDocumentAnnotationNote,
} from '../../src/window/Pdf/utils/annotationNotes';

describe('pdf annotation notes helpers', () => {
    it('builds stable fallback keys for transient annotations', () => {
        expect(
            getAnnotationClientKey({
                pageNumber: 2,
                color: '#ffe066',
                snippet: 'Hello PDF',
                sortTop: 42,
            })
        ).toContain('Hello PDF');
        expect(getAnnotationClientKey({ annotationElementId: 'saved-1' })).toBe('saved-1');
    });

    it('stores and removes document-scoped reader notes', () => {
        const next = setDocumentAnnotationNote({}, '/tmp/demo.pdf', 'saved-1', '  key takeaway  ');
        expect(getDocumentAnnotationNotes(next, '/tmp/demo.pdf')).toEqual({ 'saved-1': 'key takeaway' });

        const removed = setDocumentAnnotationNote(next, '/tmp/demo.pdf', 'saved-1', '   ');
        expect(getDocumentAnnotationNotes(removed, '/tmp/demo.pdf')).toEqual({});
    });

    it('prefers local reader notes over embedded PDF comments', () => {
        const annotation = {
            annotationElementId: 'saved-1',
            comment: 'Embedded comment',
        };

        expect(getAnnotationDisplayNote(annotation, {})).toBe('Embedded comment');
        expect(getAnnotationDisplayNote(annotation, { 'saved-1': 'Reader note' })).toBe('Reader note');
    });
});
