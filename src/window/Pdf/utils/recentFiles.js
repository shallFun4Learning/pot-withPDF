function getDocumentName(path) {
    return path ? path.split(/[\\/]/).pop() : '';
}

export const PDF_RECENT_FILES_LIMIT = 8;

export function normalizeRecentPdfFile(entry) {
    if (!entry) {
        return null;
    }

    const path = typeof entry === 'string' ? entry.trim() : String(entry.path || '').trim();
    if (!path) {
        return null;
    }

    const lastOpenedAt = Number(entry.lastOpenedAt);

    return {
        path,
        name: String(entry.name || '').trim() || getDocumentName(path),
        lastOpenedAt: Number.isFinite(lastOpenedAt) ? lastOpenedAt : Date.now(),
    };
}

export function normalizeRecentPdfFiles(list = []) {
    const deduped = new Map();

    for (const entry of Array.isArray(list) ? list : []) {
        const normalized = normalizeRecentPdfFile(entry);
        if (!normalized || deduped.has(normalized.path)) {
            continue;
        }
        deduped.set(normalized.path, normalized);
    }

    return Array.from(deduped.values()).slice(0, PDF_RECENT_FILES_LIMIT);
}

export function addRecentPdfFile(list = [], entry, { limit = PDF_RECENT_FILES_LIMIT } = {}) {
    const normalized = normalizeRecentPdfFile(entry);
    if (!normalized) {
        return normalizeRecentPdfFiles(list).slice(0, limit);
    }

    const next = normalizeRecentPdfFiles(list).filter((item) => item.path !== normalized.path);
    return [
        {
            ...normalized,
            lastOpenedAt: Date.now(),
        },
        ...next,
    ].slice(0, limit);
}

export function removeRecentPdfFile(list = [], path) {
    const normalizedPath = String(path || '').trim();
    if (!normalizedPath) {
        return normalizeRecentPdfFiles(list);
    }
    return normalizeRecentPdfFiles(list).filter((entry) => entry.path !== normalizedPath);
}
