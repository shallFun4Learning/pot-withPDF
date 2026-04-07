export const PDF_READING_PROGRESS_LIMIT = 32;

function normalizePageNumber(pageNumber) {
    const value = Number(pageNumber);
    if (!Number.isFinite(value)) {
        return 1;
    }
    return Math.max(1, Math.round(value));
}

function normalizeScaleValue(scaleValue) {
    if (typeof scaleValue === 'number' && Number.isFinite(scaleValue)) {
        return scaleValue;
    }

    const value = String(scaleValue || '').trim();
    return value || 'page-width';
}

export function normalizePdfReadingProgressEntry(entry) {
    if (!entry) {
        return null;
    }

    const updatedAt = Number(entry.updatedAt);

    return {
        pageNumber: normalizePageNumber(entry.pageNumber),
        scaleValue: normalizeScaleValue(entry.scaleValue),
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    };
}

export function normalizePdfReadingProgressMap(progressMap = {}) {
    const entries = Object.entries(progressMap || {})
        .map(([path, entry]) => [String(path || '').trim(), normalizePdfReadingProgressEntry(entry)])
        .filter(([path, entry]) => path && entry)
        .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
        .slice(0, PDF_READING_PROGRESS_LIMIT);

    return Object.fromEntries(entries);
}

export function getPdfReadingProgress(progressMap = {}, path) {
    const normalizedPath = String(path || '').trim();
    if (!normalizedPath) {
        return null;
    }
    return normalizePdfReadingProgressMap(progressMap)[normalizedPath] || null;
}

export function setPdfReadingProgress(progressMap = {}, path, viewState = {}) {
    const normalizedPath = String(path || '').trim();
    if (!normalizedPath) {
        return normalizePdfReadingProgressMap(progressMap);
    }

    const next = {
        ...normalizePdfReadingProgressMap(progressMap),
        [normalizedPath]: normalizePdfReadingProgressEntry({
            pageNumber: viewState.pageNumber ?? viewState.currentPage,
            scaleValue: viewState.scaleValue ?? viewState.scale,
            updatedAt: Date.now(),
        }),
    };

    return normalizePdfReadingProgressMap(next);
}

export function removePdfReadingProgress(progressMap = {}, path) {
    const normalizedPath = String(path || '').trim();
    const next = { ...normalizePdfReadingProgressMap(progressMap) };
    delete next[normalizedPath];
    return next;
}
