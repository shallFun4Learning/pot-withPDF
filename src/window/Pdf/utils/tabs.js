import { nanoid } from 'nanoid';

import { normalizePdfCompareMode, PDF_COMPARE_MODE_DOCUMENT } from './compare';
import { createLoadedDocumentState } from './documentState';
import { createPdfSearchState } from './search';

export function createPdfTab(result, overrides = {}) {
    const nextTab = {
        id: nanoid(),
        isPinned: false,
        compareMode: '',
        comparePath: '',
        compareSyncPages: true,
        compareViewerState: {
            currentPage: 1,
            pageCount: 0,
            scale: 1,
            scaleValue: 'page-width',
        },
        translationCompareState: {
            sourceText: '',
            selectionText: '',
            resultText: '',
            serviceLabel: '',
            isLoading: false,
            error: '',
        },
        source: {
            path: result?.path ?? '',
            name: result?.name ?? '',
            data: result?.data ?? null,
        },
        documentState: createLoadedDocumentState(result?.path ?? null, result?.name ?? ''),
        viewerState: {
            currentPage: 1,
            pageCount: 0,
            scale: 1,
            scaleValue: 'page-width',
        },
        selectionText: '',
        annotations: [],
        thumbnails: [],
        outline: [],
        navigationMode: 'pages',
        searchQuery: '',
        searchState: createPdfSearchState(),
        annotationNotes: {},
        selectedAnnotationKey: '',
        errorMessage: '',
        interactionMode: 'translate',
        ...overrides,
    };

    const compareMode = normalizePdfCompareMode(nextTab.compareMode, nextTab.comparePath);
    return {
        ...nextTab,
        compareMode,
        comparePath: compareMode === PDF_COMPARE_MODE_DOCUMENT ? String(nextTab.comparePath || '').trim() : '',
    };
}

export function findPdfTabByPath(tabs = [], path) {
    const normalizedPath = String(path || '').trim();
    if (!normalizedPath) {
        return null;
    }
    return (tabs || []).find((tab) => tab.source?.path === normalizedPath) || null;
}

export function updatePdfTab(tabs = [], tabId, updater) {
    return (tabs || []).map((tab) => {
        if (tab.id !== tabId) {
            return tab;
        }
        return typeof updater === 'function' ? updater(tab) : { ...tab, ...updater };
    });
}

export function sortPdfTabsForDisplay(tabs = []) {
    const list = Array.isArray(tabs) ? tabs : [];
    const pinnedTabs = list.filter((tab) => tab?.isPinned);
    const regularTabs = list.filter((tab) => !tab?.isPinned);
    return [...pinnedTabs, ...regularTabs];
}

export function reorderPdfTabs(tabs = [], draggedTabId, targetTabId) {
    const normalizedDraggedId = String(draggedTabId || '').trim();
    const normalizedTargetId = String(targetTabId || '').trim();

    if (!normalizedDraggedId || !normalizedTargetId || normalizedDraggedId === normalizedTargetId) {
        return Array.isArray(tabs) ? tabs : [];
    }

    const displayTabs = sortPdfTabsForDisplay(tabs);
    const draggedTab = displayTabs.find((tab) => tab?.id === normalizedDraggedId);
    const targetTab = displayTabs.find((tab) => tab?.id === normalizedTargetId);

    if (!draggedTab || !targetTab) {
        return displayTabs;
    }

    const remainingTabs = displayTabs.filter((tab) => tab?.id !== normalizedDraggedId);
    const targetIndex = remainingTabs.findIndex((tab) => tab?.id === normalizedTargetId);
    const nextDraggedTab = {
        ...draggedTab,
        isPinned: Boolean(targetTab.isPinned),
    };

    if (targetIndex === -1) {
        return sortPdfTabsForDisplay([...remainingTabs, nextDraggedTab]);
    }

    remainingTabs.splice(targetIndex, 0, nextDraggedTab);
    return sortPdfTabsForDisplay(remainingTabs);
}

export function setPdfTabPinned(tabs = [], tabId, isPinned = true) {
    return updatePdfTab(tabs, tabId, (tab) => ({
        ...tab,
        isPinned: Boolean(isPinned),
    }));
}

export function swapPdfCompareTabs(
    tabs = [],
    activeTabId = null,
    {
        primaryViewerState = null,
        compareViewerState = null,
    } = {}
) {
    const list = Array.isArray(tabs) ? tabs : [];
    const activeTab = list.find((tab) => tab?.id === activeTabId);
    const activePath = String(activeTab?.source?.path || '').trim();
    const comparePath = String(activeTab?.comparePath || '').trim();

    if (!activeTab || activeTab.compareMode !== PDF_COMPARE_MODE_DOCUMENT || !activePath || !comparePath) {
        return {
            tabs: list,
            nextActiveTabId: activeTabId,
        };
    }

    const compareTab = list.find((tab) => tab?.id !== activeTabId && tab?.source?.path === comparePath);
    if (!compareTab) {
        return {
            tabs: list,
            nextActiveTabId: activeTabId,
        };
    }

    const nextTabs = list.map((tab) => {
        if (tab.id === activeTab.id) {
            return {
                ...tab,
                compareMode: PDF_COMPARE_MODE_DOCUMENT,
                comparePath,
                compareViewerState:
                    compareViewerState?.pageCount || compareViewerState?.currentPage
                        ? compareViewerState
                        : tab.compareViewerState,
            };
        }

        if (tab.id === compareTab.id) {
            return {
                ...tab,
                viewerState:
                    compareViewerState?.pageCount || compareViewerState?.currentPage
                        ? compareViewerState
                        : tab.viewerState,
                compareMode: PDF_COMPARE_MODE_DOCUMENT,
                comparePath: activePath,
                compareSyncPages: activeTab.compareSyncPages ?? true,
                compareViewerState:
                    primaryViewerState?.pageCount || primaryViewerState?.currentPage
                        ? primaryViewerState
                        : tab.compareViewerState,
            };
        }

        return tab;
    });

    return {
        tabs: nextTabs,
        nextActiveTabId: compareTab.id,
    };
}

export function getPdfTabsToCloseOther(tabs = [], keepTabId = null) {
    return (Array.isArray(tabs) ? tabs : []).filter((tab) => tab?.id !== keepTabId && !tab?.isPinned);
}

export function getPdfTabsToCloseRight(tabs = [], anchorTabId = null) {
    const displayTabs = sortPdfTabsForDisplay(tabs);
    const anchorIndex = displayTabs.findIndex((tab) => tab?.id === anchorTabId);

    if (anchorIndex === -1) {
        return [];
    }

    return displayTabs.slice(anchorIndex + 1).filter((tab) => !tab?.isPinned);
}

export function getNextPdfTabId(tabs = [], closingTabId, preferredActiveId = null) {
    const list = Array.isArray(tabs) ? tabs : [];
    const index = list.findIndex((tab) => tab.id === closingTabId);
    if (index === -1) {
        return preferredActiveId;
    }

    const remaining = list.filter((tab) => tab.id !== closingTabId);
    if (remaining.length === 0) {
        return null;
    }

    if (preferredActiveId && preferredActiveId !== closingTabId && remaining.some((tab) => tab.id === preferredActiveId)) {
        return preferredActiveId;
    }

    return remaining[Math.min(index, remaining.length - 1)]?.id ?? remaining[0]?.id ?? null;
}
