import { describe, expect, it } from 'vitest';

import {
    createLoadedDocumentState,
    markDocumentDirty,
    markDocumentSaved,
} from '../../src/window/Pdf/utils/documentState';

describe('PDF document state helpers', () => {
    it('creates a loaded state from a file path', () => {
        expect(createLoadedDocumentState('/tmp/example.pdf')).toEqual({
            currentPath: '/tmp/example.pdf',
            documentName: 'example.pdf',
            dirty: false,
        });
    });

    it('marks document dirty and saved while updating current path', () => {
        const dirtyState = markDocumentDirty(createLoadedDocumentState('/tmp/example.pdf'), true);
        expect(dirtyState.dirty).toBe(true);

        expect(markDocumentSaved(dirtyState, '/tmp/renamed.pdf')).toEqual({
            currentPath: '/tmp/renamed.pdf',
            documentName: 'renamed.pdf',
            dirty: false,
        });
    });
});
