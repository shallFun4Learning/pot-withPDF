import { describe, expect, it } from 'vitest';

import {
    createPdfTab,
    findPdfTabByPath,
    getNextPdfTabId,
    getPdfTabsToCloseOther,
    getPdfTabsToCloseRight,
    reorderPdfTabs,
    setPdfTabPinned,
    sortPdfTabsForDisplay,
    swapPdfCompareTabs,
    updatePdfTab,
} from '../../src/window/Pdf/utils/tabs';

describe('pdf tab helpers', () => {
    it('creates a tab with default reader state', () => {
        const tab = createPdfTab({
            path: '/tmp/demo.pdf',
            name: 'demo.pdf',
            data: new Uint8Array([1, 2, 3]),
        });

        expect(tab).toEqual(
            expect.objectContaining({
                source: expect.objectContaining({
                    path: '/tmp/demo.pdf',
                    name: 'demo.pdf',
                }),
                documentState: expect.objectContaining({
                    currentPath: '/tmp/demo.pdf',
                    documentName: 'demo.pdf',
                    dirty: false,
                }),
                isPinned: false,
                compareMode: '',
                interactionMode: 'translate',
            })
        );
    });

    it('finds, updates, pins, and resolves the next active tab correctly', () => {
        const first = createPdfTab({ path: '/tmp/one.pdf', name: 'one.pdf' });
        const second = createPdfTab({ path: '/tmp/two.pdf', name: 'two.pdf' });
        const third = createPdfTab({ path: '/tmp/three.pdf', name: 'three.pdf' });
        const tabs = [first, second, third];

        expect(findPdfTabByPath(tabs, '/tmp/two.pdf')?.id).toBe(second.id);

        const updated = updatePdfTab(tabs, second.id, (tab) => ({
            ...tab,
            interactionMode: 'highlight',
        }));
        expect(updated[1].interactionMode).toBe('highlight');

        const pinned = setPdfTabPinned(updated, third.id, true);
        expect(sortPdfTabsForDisplay(pinned).map((tab) => tab.id)).toEqual([third.id, first.id, second.id]);
        expect(getPdfTabsToCloseOther(pinned, second.id).map((tab) => tab.id)).toEqual([first.id]);
        expect(getPdfTabsToCloseRight(pinned, third.id).map((tab) => tab.id)).toEqual([first.id, second.id]);
        expect(reorderPdfTabs(pinned, second.id, third.id).map((tab) => `${tab.id}:${tab.isPinned}`)).toEqual([
            `${second.id}:true`,
            `${third.id}:true`,
            `${first.id}:false`,
        ]);

        expect(getNextPdfTabId(tabs, second.id, second.id)).toBe(third.id);
        expect(getNextPdfTabId(tabs, third.id, first.id)).toBe(first.id);
        expect(getNextPdfTabId([first], first.id, first.id)).toBeNull();
    });

    it('swaps the compare pair while preserving the visible pane states', () => {
        const primary = createPdfTab({ path: '/tmp/original.pdf', name: 'Original.pdf' });
        const compare = createPdfTab({ path: '/tmp/translation.pdf', name: 'Translation.pdf' });
        const tabs = [
            {
                ...primary,
                compareMode: 'document',
                comparePath: '/tmp/translation.pdf',
                compareSyncPages: false,
                viewerState: {
                    currentPage: 3,
                    pageCount: 12,
                    scale: 1.1,
                    scaleValue: 'page-width',
                },
                compareViewerState: {
                    currentPage: 8,
                    pageCount: 12,
                    scale: 1.2,
                    scaleValue: 'page-width',
                },
            },
            compare,
        ];

        const result = swapPdfCompareTabs(tabs, primary.id, {
            primaryViewerState: tabs[0].viewerState,
            compareViewerState: tabs[0].compareViewerState,
        });

        expect(result.nextActiveTabId).toBe(compare.id);
        expect(result.tabs.find((tab) => tab.id === compare.id)).toEqual(
            expect.objectContaining({
                compareMode: 'document',
                comparePath: '/tmp/original.pdf',
                compareSyncPages: false,
                viewerState: expect.objectContaining({ currentPage: 8 }),
                compareViewerState: expect.objectContaining({ currentPage: 3 }),
            })
        );
    });
});
