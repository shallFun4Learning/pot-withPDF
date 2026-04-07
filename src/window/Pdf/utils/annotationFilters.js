import { colorToHex, normalizeAnnotationText } from './annotations';

export function hasActiveAnnotationFilters({ searchQuery = '', colorFilter = 'all' } = {}) {
    return normalizeAnnotationText(searchQuery) !== '' || colorFilter !== 'all';
}

export function filterHighlightAnnotations({
    annotations = [],
    searchQuery = '',
    colorFilter = 'all',
} = {}) {
    const normalizedSearch = normalizeAnnotationText(searchQuery).toLowerCase();
    const normalizedColorFilter = String(colorFilter || 'all').toLowerCase();

    return (Array.isArray(annotations) ? annotations : []).filter((annotation) => {
        const matchesColor =
            normalizedColorFilter === 'all' ||
            colorToHex(annotation.color).toLowerCase() === normalizedColorFilter;

        if (!matchesColor) {
            return false;
        }

        if (!normalizedSearch) {
            return true;
        }

        const searchableText = normalizeAnnotationText(
            [annotation.snippet, annotation.comment, annotation.pageNumber].filter(Boolean).join(' ')
        ).toLowerCase();

        return searchableText.includes(normalizedSearch);
    });
}
