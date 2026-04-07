import { normalizeHighlightColor } from './highlightPalette';

function clampChannel(value) {
    const number = Number(value);
    if (Number.isNaN(number)) {
        return 0;
    }
    return Math.max(0, Math.min(255, Math.round(number)));
}

export function colorToHex(color) {
    if (!color) {
        return normalizeHighlightColor();
    }

    if (typeof color === 'string') {
        const normalized = color.startsWith('#') ? color : `#${color}`;
        if (/^#[0-9a-f]{6}$/i.test(normalized)) {
            return normalized.toLowerCase();
        }
        return normalizeHighlightColor(normalized);
    }

    if (Array.isArray(color) || ArrayBuffer.isView(color)) {
        const [red = 0, green = 0, blue = 0] = Array.from(color);
        return `#${[red, green, blue]
            .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
            .join('')}`;
    }

    return normalizeHighlightColor();
}

export function normalizeAnnotationText(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function sortHighlightAnnotations(left, right) {
    if (left.pageIndex !== right.pageIndex) {
        return left.pageIndex - right.pageIndex;
    }

    if ((left.sortTop ?? null) !== (right.sortTop ?? null)) {
        return (right.sortTop ?? 0) - (left.sortTop ?? 0);
    }

    return (left.snippet || '').localeCompare(right.snippet || '');
}

export function mergeHighlightAnnotations({
    savedAnnotations = [],
    liveAnnotations = [],
    deletedAnnotationIds = [],
}) {
    const merged = new Map();
    const deletedSet = new Set(Array.from(deletedAnnotationIds || []));

    for (const annotation of savedAnnotations) {
        const key = annotation.annotationElementId || annotation.id;
        if (!key || deletedSet.has(key)) {
            continue;
        }
        merged.set(key, { ...annotation, persisted: true });
    }

    for (const annotation of liveAnnotations) {
        const key = annotation.annotationElementId || annotation.id;
        if (!key || deletedSet.has(annotation.annotationElementId)) {
            continue;
        }
        merged.set(key, {
            ...merged.get(key),
            ...annotation,
        });
    }

    return Array.from(merged.values()).sort(sortHighlightAnnotations);
}
