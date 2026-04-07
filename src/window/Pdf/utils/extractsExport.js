function stripExtension(name = '') {
    return String(name || '').replace(/\.pdf$/i, '');
}

function escapeMarkdownBlock(text = '') {
    return String(text || '')
        .replace(/\r\n?/g, '\n')
        .trim();
}

export function createExtractsExportFileName(documentName = 'document.pdf') {
    const base = stripExtension(documentName) || 'document';
    return `${base}-extracts.md`;
}

export function createExtractsMarkdown({
    documentName = '',
    documentPath = '',
    annotations = [],
    exportedAt = new Date(),
}) {
    const exportDate = exportedAt instanceof Date ? exportedAt : new Date(exportedAt);
    const lines = [
        `# ${stripExtension(documentName) || 'Document'} — Extracts`,
        '',
        `- Exported from: pot-withPDF`,
        `- Source file: ${documentName || 'Unknown PDF'}`,
        documentPath ? `- Source path: ${documentPath}` : null,
        `- Exported at: ${exportDate.toISOString()}`,
        `- Extract count: ${(annotations || []).length}`,
        '',
    ].filter(Boolean);

    (annotations || []).forEach((annotation, index) => {
        const pageNumber = annotation.pageNumber || annotation.pageIndex + 1 || index + 1;
        const snippet = escapeMarkdownBlock(annotation.snippet || '');
        const readerNote = escapeMarkdownBlock(annotation.readerNote || '');
        const embeddedComment = escapeMarkdownBlock(annotation.comment || '');

        lines.push(`## ${index + 1}. Page ${pageNumber}`);
        lines.push('');
        lines.push(snippet ? `> ${snippet.replace(/\n/g, '\n> ')}` : '> (No extracted text available)');
        lines.push('');

        if (readerNote) {
            lines.push('**Reader note**');
            lines.push('');
            lines.push(readerNote);
            lines.push('');
        }

        if (embeddedComment && embeddedComment !== readerNote) {
            lines.push('**PDF comment**');
            lines.push('');
            lines.push(embeddedComment);
            lines.push('');
        }

        if (annotation.color) {
            lines.push(`- Highlight color: ${annotation.color}`);
        }
        lines.push('');
    });

    return lines.join('\n').trim() + '\n';
}
