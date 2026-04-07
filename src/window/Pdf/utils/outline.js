export function normalizeOutlineTitle(title) {
    return String(title || '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function resolveOutlineDestinationPageNumber(pdfDocument, dest) {
    if (!pdfDocument || !dest) {
        return null;
    }

    let explicitDest = dest;
    if (typeof dest === 'string') {
        explicitDest = await pdfDocument.getDestination(dest);
    }

    if (!Array.isArray(explicitDest) || explicitDest.length === 0) {
        return null;
    }

    const [destRef] = explicitDest;
    if (Number.isInteger(destRef)) {
        return destRef + 1;
    }

    if (destRef && typeof destRef === 'object') {
        return (await pdfDocument.getPageIndex(destRef)) + 1;
    }

    return null;
}

async function resolveOutlineItem(pdfDocument, item, depth, lineage, index) {
    const currentLineage = `${lineage}-${index}`;
    const title = normalizeOutlineTitle(item?.title);
    let pageNumber = null;

    try {
        pageNumber = await resolveOutlineDestinationPageNumber(pdfDocument, item?.dest);
    } catch {
        pageNumber = null;
    }

    const children = await Promise.all(
        (item?.items || []).map((child, childIndex) =>
            resolveOutlineItem(pdfDocument, child, depth + 1, currentLineage, childIndex)
        )
    );

    return {
        id: currentLineage,
        title,
        depth,
        pageNumber,
        dest: item?.dest ?? null,
        url: item?.url ?? '',
        items: children,
    };
}

export async function resolveOutlineItems(pdfDocument, outlineItems = []) {
    if (!pdfDocument || !Array.isArray(outlineItems) || outlineItems.length === 0) {
        return [];
    }

    return Promise.all(outlineItems.map((item, index) => resolveOutlineItem(pdfDocument, item, 0, 'outline', index)));
}

export function flattenOutlineItems(outlineItems = [], depth = 0) {
    return (outlineItems || []).flatMap((item) => {
        const current = {
            ...item,
            depth,
        };
        return [current, ...flattenOutlineItems(item?.items || [], depth + 1)];
    });
}
