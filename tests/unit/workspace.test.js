import { describe, expect, it } from 'vitest';

import { createPdfWorkspaceSnapshot, normalizePdfWorkspaceSnapshot } from '../../src/window/Pdf/utils/workspace';

describe('pdf workspace helpers', () => {
    it('normalizes malformed workspace snapshots and preserves valid active paths', () => {
        expect(
            normalizePdfWorkspaceSnapshot({
                tabs: [
                    null,
                    {
                        path: '/tmp/a.pdf',
                        isPinned: true,
                        compareMode: 'document',
                        comparePath: '/tmp/b.pdf',
                        compareSyncPages: false,
                        interactionMode: 'highlight',
                        navigationMode: 'outline',
                        searchQuery: 'term',
                        selectedAnnotationKey: 'ann-1',
                    },
                ],
                activePath: '/tmp/a.pdf',
            })
        ).toEqual({
            tabs: [
                {
                    path: '/tmp/a.pdf',
                    isPinned: true,
                    compareMode: 'document',
                    comparePath: '/tmp/b.pdf',
                    compareSyncPages: false,
                    interactionMode: 'highlight',
                    navigationMode: 'outline',
                    searchQuery: 'term',
                    selectedAnnotationKey: 'ann-1',
                },
            ],
            activePath: '/tmp/a.pdf',
        });
    });

    it('creates a restorable snapshot from open tabs', () => {
        const snapshot = createPdfWorkspaceSnapshot(
            [
                {
                    id: 'tab-1',
                    source: { path: '/tmp/a.pdf' },
                    isPinned: true,
                    compareMode: 'document',
                    comparePath: '/tmp/b.pdf',
                    compareSyncPages: false,
                    interactionMode: 'translate',
                    navigationMode: 'pages',
                    searchQuery: '',
                    selectedAnnotationKey: '',
                },
                {
                    id: 'tab-2',
                    source: { path: '/tmp/b.pdf' },
                    compareMode: 'translation',
                    interactionMode: 'highlight',
                    navigationMode: 'extracts',
                    searchQuery: 'Apple',
                    selectedAnnotationKey: 'ann-2',
                },
                {
                    id: 'tab-3',
                    source: { path: '' },
                },
            ],
            'tab-2'
        );

        expect(snapshot).toEqual({
            tabs: [
                {
                    path: '/tmp/a.pdf',
                    isPinned: true,
                    compareMode: 'document',
                    comparePath: '/tmp/b.pdf',
                    compareSyncPages: false,
                    interactionMode: 'translate',
                    navigationMode: 'pages',
                    searchQuery: '',
                    selectedAnnotationKey: '',
                },
                {
                    path: '/tmp/b.pdf',
                    isPinned: false,
                    compareMode: 'translation',
                    comparePath: '',
                    compareSyncPages: true,
                    interactionMode: 'highlight',
                    navigationMode: 'extracts',
                    searchQuery: 'Apple',
                    selectedAnnotationKey: 'ann-2',
                },
            ],
            activePath: '/tmp/b.pdf',
        });
    });
});
