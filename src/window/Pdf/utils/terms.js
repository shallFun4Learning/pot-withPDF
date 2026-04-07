import { nanoid } from 'nanoid';

export function normalizePdfTermText(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getPdfTermDocumentKey(path = '', documentName = '') {
    const normalizedPath = String(path || '').trim();
    if (normalizedPath) {
        return `path:${normalizedPath}`;
    }

    const normalizedName = normalizePdfTermText(documentName);
    if (normalizedName) {
        return `name:${normalizedName}`;
    }

    return '';
}

function normalizePdfTermTimestamp(value) {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function createPdfTermLookupKey(text) {
    return normalizePdfTermText(text).toLocaleLowerCase();
}

export function normalizePdfTerm(entry, fallbackId = '') {
    const sourceText = normalizePdfTermText(entry?.sourceText);
    if (!sourceText) {
        return null;
    }

    const createdAt = normalizePdfTermTimestamp(entry?.createdAt);
    const updatedAt = normalizePdfTermTimestamp(entry?.updatedAt) || createdAt;

    return {
        id: String(entry?.id || fallbackId || nanoid()),
        sourceText,
        preferredTranslation: normalizePdfTermText(entry?.preferredTranslation),
        note: String(entry?.note || '')
            .replace(/\r\n?/g, '\n')
            .trim(),
        createdAt,
        updatedAt,
    };
}

export function normalizePdfTerms(terms = []) {
    const list = Array.isArray(terms) ? terms : [];
    const dedupedMap = new Map();

    list.forEach((term, index) => {
        const normalizedTerm = normalizePdfTerm(term, `term-${index + 1}`);
        if (!normalizedTerm) {
            return;
        }

        const lookupKey = createPdfTermLookupKey(normalizedTerm.sourceText);
        const existing = dedupedMap.get(lookupKey);

        if (!existing || normalizedTerm.updatedAt >= existing.updatedAt) {
            dedupedMap.set(lookupKey, normalizedTerm);
        }
    });

    return Array.from(dedupedMap.values()).sort((left, right) => {
        if (right.updatedAt !== left.updatedAt) {
            return right.updatedAt - left.updatedAt;
        }
        return left.sourceText.localeCompare(right.sourceText);
    });
}

export function normalizePdfTermBankMap(termBankMap = {}) {
    return Object.entries(termBankMap || {}).reduce((result, [documentKey, entries]) => {
        const normalizedKey = String(documentKey || '').trim();
        if (!normalizedKey) {
            return result;
        }

        const normalizedTerms = normalizePdfTerms(entries);
        if (normalizedTerms.length === 0) {
            return result;
        }

        result[normalizedKey] = normalizedTerms;
        return result;
    }, {});
}

export function getPdfDocumentTerms(termBankMap = {}, path = '', documentName = '') {
    const documentKey = getPdfTermDocumentKey(path, documentName);
    if (!documentKey) {
        return [];
    }

    return normalizePdfTerms(termBankMap?.[documentKey]);
}

export function findPdfTermByText(terms = [], text = '') {
    const lookupKey = createPdfTermLookupKey(text);
    if (!lookupKey) {
        return null;
    }

    return normalizePdfTerms(terms).find((term) => createPdfTermLookupKey(term.sourceText) === lookupKey) || null;
}

export function addPdfDocumentTerm(
    termBankMap = {},
    { path = '', documentName = '', sourceText = '', preferredTranslation = '', note = '', now = Date.now() } = {}
) {
    const documentKey = getPdfTermDocumentKey(path, documentName);
    const normalizedSourceText = normalizePdfTermText(sourceText);

    if (!documentKey || !normalizedSourceText) {
        return {
            termBankMap: normalizePdfTermBankMap(termBankMap),
            term: null,
            documentKey,
            existed: false,
        };
    }

    const currentMap = normalizePdfTermBankMap(termBankMap);
    const currentTerms = getPdfDocumentTerms(currentMap, path, documentName);
    const existingTerm = findPdfTermByText(currentTerms, normalizedSourceText);

    const normalizedPreferredTranslation = normalizePdfTermText(preferredTranslation);
    const normalizedNote = String(note || '')
        .replace(/\r\n?/g, '\n')
        .trim();

    const nextTerm = existingTerm
        ? {
              ...existingTerm,
              preferredTranslation:
                  normalizedPreferredTranslation || existingTerm.preferredTranslation || '',
              note: normalizedNote || existingTerm.note || '',
              updatedAt: now,
          }
        : {
              id: nanoid(),
              sourceText: normalizedSourceText,
              preferredTranslation: normalizedPreferredTranslation,
              note: normalizedNote,
              createdAt: now,
              updatedAt: now,
          };

    const filteredTerms = currentTerms.filter((term) => term.id !== existingTerm?.id);
    const nextMap = normalizePdfTermBankMap({
        ...currentMap,
        [documentKey]: [...filteredTerms, nextTerm],
    });

    return {
        termBankMap: nextMap,
        term: findPdfTermByText(nextMap[documentKey], normalizedSourceText),
        documentKey,
        existed: Boolean(existingTerm),
    };
}

export function updatePdfDocumentTerm(
    termBankMap = {},
    { path = '', documentName = '', termId = '', patch = {}, now = Date.now() } = {}
) {
    const documentKey = getPdfTermDocumentKey(path, documentName);
    const normalizedTermId = String(termId || '').trim();

    if (!documentKey || !normalizedTermId) {
        return normalizePdfTermBankMap(termBankMap);
    }

    const currentMap = normalizePdfTermBankMap(termBankMap);
    const currentTerms = getPdfDocumentTerms(currentMap, path, documentName);
    const existingTerm = currentTerms.find((term) => term.id === normalizedTermId);

    if (!existingTerm) {
        return currentMap;
    }

    const nextSourceText = normalizePdfTermText(
        patch.sourceText === undefined ? existingTerm.sourceText : patch.sourceText
    );

    if (!nextSourceText) {
        return removePdfDocumentTerm(currentMap, { path, documentName, termId: normalizedTermId });
    }

    const dedupeCollision = currentTerms.find(
        (term) => term.id !== normalizedTermId && createPdfTermLookupKey(term.sourceText) === createPdfTermLookupKey(nextSourceText)
    );

    const nextTerm = {
        ...existingTerm,
        sourceText: nextSourceText,
        preferredTranslation: normalizePdfTermText(
            patch.preferredTranslation === undefined ? existingTerm.preferredTranslation : patch.preferredTranslation
        ),
        note: String(patch.note === undefined ? existingTerm.note : patch.note)
            .replace(/\r\n?/g, '\n')
            .trim(),
        updatedAt: now,
    };

    const nextTerms = currentTerms.filter((term) => term.id !== normalizedTermId && term.id !== dedupeCollision?.id);
    return normalizePdfTermBankMap({
        ...currentMap,
        [documentKey]: [...nextTerms, nextTerm],
    });
}

export function removePdfDocumentTerm(termBankMap = {}, { path = '', documentName = '', termId = '' } = {}) {
    const documentKey = getPdfTermDocumentKey(path, documentName);
    const normalizedTermId = String(termId || '').trim();

    if (!documentKey || !normalizedTermId) {
        return normalizePdfTermBankMap(termBankMap);
    }

    const currentMap = normalizePdfTermBankMap(termBankMap);
    const currentTerms = getPdfDocumentTerms(currentMap, path, documentName);
    const nextTerms = currentTerms.filter((term) => term.id !== normalizedTermId);

    if (nextTerms.length === currentTerms.length) {
        return currentMap;
    }

    if (nextTerms.length === 0) {
        const { [documentKey]: _removed, ...rest } = currentMap;
        return rest;
    }

    return {
        ...currentMap,
        [documentKey]: nextTerms,
    };
}

export function copyPdfDocumentTerms(
    termBankMap = {},
    { fromPath = '', fromDocumentName = '', toPath = '', toDocumentName = '' } = {}
) {
    const fromKey = getPdfTermDocumentKey(fromPath, fromDocumentName);
    const toKey = getPdfTermDocumentKey(toPath, toDocumentName);

    if (!fromKey || !toKey || fromKey === toKey) {
        return normalizePdfTermBankMap(termBankMap);
    }

    const currentMap = normalizePdfTermBankMap(termBankMap);
    const fromTerms = normalizePdfTerms(currentMap[fromKey]);
    if (fromTerms.length === 0) {
        return currentMap;
    }

    const nextMap = {
        ...currentMap,
        [toKey]: [...normalizePdfTerms(currentMap[toKey]), ...fromTerms],
    };

    return normalizePdfTermBankMap(nextMap);
}
