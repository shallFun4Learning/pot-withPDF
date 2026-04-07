export function isPdfPath(path) {
    return /\.pdf$/i.test(String(path || '').trim());
}

export function findFirstPdfPath(paths = []) {
    return (Array.isArray(paths) ? paths : []).find((path) => isPdfPath(path)) || '';
}

export function findFirstPdfFile(files) {
    return Array.from(files || []).find((file) => file && (file.type === 'application/pdf' || isPdfPath(file.name))) || null;
}

export async function createPdfDocumentFromFile(file) {
    if (!file) {
        return null;
    }

    return {
        path: '',
        name: file.name || 'document.pdf',
        data: new Uint8Array(await file.arrayBuffer()),
    };
}
