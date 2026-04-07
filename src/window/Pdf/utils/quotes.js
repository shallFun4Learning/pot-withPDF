function normalizeText(text = '') {
    return String(text || '')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function resolveDocumentLabel(documentName = '', documentPath = '') {
    const normalizedName = normalizeText(documentName);
    if (normalizedName) {
        return normalizedName;
    }

    const normalizedPath = String(documentPath || '').trim();
    if (!normalizedPath) {
        return 'Document';
    }

    return normalizedPath.split(/[\\/]/).pop() || 'Document';
}

function resolvePageLabel(annotation = {}) {
    const pageNumber = Number(annotation?.pageNumber || annotation?.pageIndex + 1 || 0);
    return Number.isFinite(pageNumber) && pageNumber > 0 ? `p. ${pageNumber}` : 'page unknown';
}

export function createPdfExtractCopyText(annotation = {}, { documentName = '', documentPath = '' } = {}) {
    const lines = [];
    const snippet = normalizeText(annotation?.snippet);
    const readerNote = normalizeText(annotation?.readerNote || annotation?.displayNote || '');
    const embeddedComment = normalizeText(annotation?.comment || '');

    if (snippet) {
        lines.push(snippet);
    }

    if (readerNote) {
        lines.push('');
        lines.push(`Note: ${readerNote}`);
    }

    if (embeddedComment && embeddedComment !== readerNote) {
        lines.push('');
        lines.push(`PDF comment: ${embeddedComment}`);
    }

    lines.push('');
    lines.push(`${resolveDocumentLabel(documentName, documentPath)} — ${resolvePageLabel(annotation)}`);

    return lines.join('\n').trim();
}

export function createPdfCitationCopyText(annotation = {}, { documentName = '', documentPath = '' } = {}) {
    const snippet = normalizeText(annotation?.snippet) || '(No extracted text available)';
    return `“${snippet}”\n— ${resolveDocumentLabel(documentName, documentPath)}, ${resolvePageLabel(annotation)}`;
}
