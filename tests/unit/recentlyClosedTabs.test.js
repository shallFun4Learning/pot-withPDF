import { describe, expect, it } from 'vitest';

import {
    addRecentlyClosedPdfTab,
    createRecentlyClosedPdfTabSnapshot,
    getMostRecentlyClosedPdfTab,
    normalizeRecentlyClosedPdfTabs,
    removeRecentlyClosedPdfTab,
} from '../../src/window/Pdf/utils/recentlyClosedTabs';

describe('recently closed pdf tab helpers', () => {
    it('creates snapshots and keeps the most recent one per path', () => {
        const first = createRecentlyClosedPdfTabSnapshot(
            {
                source: { path: '/tmp/paper.pdf', name: 'paper.pdf' },
                documentState: { documentName: 'Paper.pdf' },
                isPinned: true,
                compareMode: 'document',
                comparePath: '/tmp/translation.pdf',
                compareSyncPages: false,
                interactionMode: 'highlight',
                navigationMode: 'extracts',
            },
            100
        );

        const list = addRecentlyClosedPdfTab([first], { ...first, closedAt: 200 }, 10);
        expect(list).toHaveLength(1);
        expect(list[0]).toEqual(
            expect.objectContaining({
                path: '/tmp/paper.pdf',
                documentName: 'Paper.pdf',
                isPinned: true,
                compareMode: 'document',
                comparePath: '/tmp/translation.pdf',
                compareSyncPages: false,
                closedAt: 200,
            })
        );
    });

    it('normalizes, returns, and removes the most recently closed tab', () => {
        const entries = normalizeRecentlyClosedPdfTabs([
            { path: '/tmp/a.pdf', documentName: 'A.pdf', closedAt: 100 },
            { path: '/tmp/b.pdf', documentName: 'B.pdf', closedAt: 300 },
        ]);

        expect(getMostRecentlyClosedPdfTab(entries)).toEqual(expect.objectContaining({ path: '/tmp/b.pdf' }));
        expect(removeRecentlyClosedPdfTab(entries, entries[0].id)).toEqual([
            expect.objectContaining({ path: '/tmp/a.pdf' }),
        ]);
    });
});
