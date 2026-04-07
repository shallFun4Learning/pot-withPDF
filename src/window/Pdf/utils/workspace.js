import { normalizePdfCompareMode, PDF_COMPARE_MODE_DOCUMENT } from './compare';

function normalizeWorkspaceTab(entry) {
    if (!entry) {
        return null;
    }

    const path = String(entry.path || '').trim();
    if (!path) {
        return null;
    }

    const compareMode = normalizePdfCompareMode(entry.compareMode, entry.comparePath);

    return {
        path,
        isPinned: Boolean(entry.isPinned),
        compareMode,
        comparePath: compareMode === PDF_COMPARE_MODE_DOCUMENT ? String(entry.comparePath || '').trim() : '',
        compareSyncPages: entry.compareSyncPages !== false,
        interactionMode: entry.interactionMode === 'highlight' ? 'highlight' : 'translate',
        navigationMode: ['pages', 'outline', 'extracts'].includes(entry.navigationMode) ? entry.navigationMode : 'pages',
        searchQuery: String(entry.searchQuery || '').trim(),
        selectedAnnotationKey: String(entry.selectedAnnotationKey || '').trim(),
    };
}

export function normalizePdfWorkspaceSnapshot(snapshot = {}) {
    const tabs = (Array.isArray(snapshot?.tabs) ? snapshot.tabs : [])
        .map(normalizeWorkspaceTab)
        .filter(Boolean);

    const activePath = String(snapshot?.activePath || '').trim();

    return {
        tabs,
        activePath: tabs.some((tab) => tab.path === activePath) ? activePath : tabs[0]?.path || '',
    };
}

export function createPdfWorkspaceSnapshot(tabs = [], activeTabId = null) {
    const normalizedTabs = (Array.isArray(tabs) ? tabs : [])
        .map((tab) =>
            normalizeWorkspaceTab({
                path: tab?.source?.path,
                isPinned: tab?.isPinned,
                compareMode: tab?.compareMode,
                comparePath: tab?.comparePath,
                compareSyncPages: tab?.compareSyncPages,
                interactionMode: tab?.interactionMode,
                navigationMode: tab?.navigationMode,
                searchQuery: tab?.searchQuery,
                selectedAnnotationKey: tab?.selectedAnnotationKey,
            })
        )
        .filter(Boolean);

    const activeTab = (tabs || []).find((tab) => tab?.id === activeTabId);
    const activePath = String(activeTab?.source?.path || '').trim();

    return normalizePdfWorkspaceSnapshot({
        tabs: normalizedTabs,
        activePath,
    });
}
