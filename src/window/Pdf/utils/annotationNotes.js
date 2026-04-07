import { normalizeAnnotationText } from './annotations';

export function getAnnotationClientKey(annotation = {}) {
    const persistentId = annotation.annotationElementId || annotation.id;
    if (persistentId) {
        return String(persistentId);
    }

    return [
        annotation.pageNumber ?? annotation.pageIndex ?? 0,
        annotation.color ?? '',
        normalizeAnnotationText(annotation.snippet),
        annotation.sortTop ?? '',
    ].join('::');
}

export function normalizeReaderNote(note) {
    return String(note || '')
        .replace(/\r\n?/g, '\n')
        .trim();
}

export function normalizeAnnotationNotes(noteMap = {}) {
    if (!noteMap || typeof noteMap !== 'object') {
        return {};
    }

    return Object.fromEntries(
        Object.entries(noteMap)
            .map(([key, value]) => [String(key || '').trim(), normalizeReaderNote(value)])
            .filter(([key, value]) => Boolean(key) && Boolean(value))
    );
}

export function getDocumentAnnotationNotes(notesMap = {}, path = '') {
    if (!path || !notesMap || typeof notesMap !== 'object') {
        return {};
    }

    return normalizeAnnotationNotes(notesMap[path]);
}

export function setDocumentAnnotationNote(notesMap = {}, path, annotationKey, note) {
    if (!path || !annotationKey) {
        return notesMap || {};
    }

    const normalizedNotesMap = notesMap && typeof notesMap === 'object' ? notesMap : {};
    const currentDocumentNotes = normalizeAnnotationNotes(normalizedNotesMap[path]);
    const nextDocumentNotes = {
        ...currentDocumentNotes,
    };
    const normalizedNote = normalizeReaderNote(note);

    if (normalizedNote) {
        nextDocumentNotes[annotationKey] = normalizedNote;
    } else {
        delete nextDocumentNotes[annotationKey];
    }

    const nextMap = {
        ...normalizedNotesMap,
    };

    if (Object.keys(nextDocumentNotes).length > 0) {
        nextMap[path] = nextDocumentNotes;
    } else {
        delete nextMap[path];
    }

    return nextMap;
}

export function getAnnotationDisplayNote(annotation = {}, documentNotes = {}) {
    return documentNotes[getAnnotationClientKey(annotation)] || normalizeAnnotationText(annotation.comment);
}
