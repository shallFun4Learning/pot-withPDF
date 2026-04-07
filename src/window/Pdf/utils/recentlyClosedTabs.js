import { normalizePdfCompareMode, PDF_COMPARE_MODE_DOCUMENT } from './compare';

function normalizeTimestamp(value) {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

export function normalizeRecentlyClosedPdfTab(entry) {
    const path = String(entry?.path || '').trim();
    if (!path) {
        return null;
    }

    const closedAt = normalizeTimestamp(entry?.closedAt) || Date.now();
    const compareMode = normalizePdfCompareMode(entry?.compareMode, entry?.comparePath);

    return {
        id: String(entry?.id || `${closedAt}:${path}`),
        path,
        documentName: String(entry?.documentName || '').trim(),
        isPinned: Boolean(entry?.isPinned),
        compareMode,
        comparePath: compareMode === PDF_COMPARE_MODE_DOCUMENT ? String(entry?.comparePath || '').trim() : '',
        compareSyncPages: entry?.compareSyncPages !== false,
        interactionMode: entry?.interactionMode === 'highlight' ? 'highlight' : 'translate',
        navigationMode: ['pages', 'outline', 'extracts'].includes(entry?.navigationMode)
            ? entry.navigationMode
            : 'pages',
        searchQuery: String(entry?.searchQuery || '').trim(),
        selectedAnnotationKey: String(entry?.selectedAnnotationKey || '').trim(),
        closedAt,
    };
}

export function normalizeRecentlyClosedPdfTabs(entries = []) {
    const list = Array.isArray(entries) ? entries : [];
    const deduped = new Map();

    list.forEach((entry) => {
        const normalized = normalizeRecentlyClosedPdfTab(entry);
        if (!normalized) {
            return;
        }

        const existing = deduped.get(normalized.path);
        if (!existing || normalized.closedAt >= existing.closedAt) {
            deduped.set(normalized.path, normalized);
        }
    });

    return Array.from(deduped.values()).sort((left, right) => right.closedAt - left.closedAt);
}

export function createRecentlyClosedPdfTabSnapshot(tab, closedAt = Date.now()) {
    const path = String(tab?.source?.path || '').trim();
    if (!path) {
        return null;
    }

    return normalizeRecentlyClosedPdfTab({
        id: `${closedAt}:${path}`,
        path,
        documentName: tab?.documentState?.documentName || tab?.source?.name || '',
        isPinned: tab?.isPinned,
        compareMode: tab?.compareMode,
        comparePath: tab?.comparePath,
        compareSyncPages: tab?.compareSyncPages,
        interactionMode: tab?.interactionMode,
        navigationMode: tab?.navigationMode,
        searchQuery: tab?.searchQuery,
        selectedAnnotationKey: tab?.selectedAnnotationKey,
        closedAt,
    });
}

export function addRecentlyClosedPdfTab(entries = [], snapshot, limit = 12) {
    const normalizedSnapshot = normalizeRecentlyClosedPdfTab(snapshot);
    if (!normalizedSnapshot) {
        return normalizeRecentlyClosedPdfTabs(entries).slice(0, limit);
    }

    return normalizeRecentlyClosedPdfTabs([normalizedSnapshot, ...normalizeRecentlyClosedPdfTabs(entries)]).slice(
        0,
        limit
    );
}

export function removeRecentlyClosedPdfTab(entries = [], snapshotId = '') {
    const normalizedId = String(snapshotId || '').trim();
    if (!normalizedId) {
        return normalizeRecentlyClosedPdfTabs(entries);
    }

    return normalizeRecentlyClosedPdfTabs(entries).filter((entry) => entry.id !== normalizedId);
}

export function getMostRecentlyClosedPdfTab(entries = []) {
    return normalizeRecentlyClosedPdfTabs(entries)[0] || null;
}
