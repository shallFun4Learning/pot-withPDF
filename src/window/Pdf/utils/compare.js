export const PDF_COMPARE_MODE_NONE = '';
export const PDF_COMPARE_MODE_DOCUMENT = 'document';
export const PDF_COMPARE_MODE_TRANSLATION = 'translation';

export function normalizePdfCompareMode(mode, comparePath = '') {
    if (mode === PDF_COMPARE_MODE_TRANSLATION) {
        return PDF_COMPARE_MODE_TRANSLATION;
    }

    const normalizedPath = String(comparePath || '').trim();
    if (mode === PDF_COMPARE_MODE_DOCUMENT || normalizedPath) {
        return normalizedPath ? PDF_COMPARE_MODE_DOCUMENT : PDF_COMPARE_MODE_NONE;
    }

    return PDF_COMPARE_MODE_NONE;
}
