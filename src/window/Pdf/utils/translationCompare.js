function normalizeText(text = '') {
    return String(text || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function pushUniqueLine(lines, value = '') {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue || lines.includes(normalizedValue)) {
        return;
    }
    lines.push(normalizedValue);
}

export function flattenTranslationResult(result) {
    if (!result) {
        return '';
    }

    if (typeof result === 'string') {
        return normalizeText(result);
    }

    if (typeof result !== 'object') {
        return normalizeText(result);
    }

    const lines = [];

    for (const pronunciation of result.pronunciations || []) {
        const symbol = normalizeText(pronunciation?.symbol);
        const region = normalizeText(pronunciation?.region);
        if (symbol || region) {
            pushUniqueLine(lines, region ? `${region} ${symbol}` : symbol);
        }
    }

    for (const explanation of result.explanations || []) {
        const trait = normalizeText(explanation?.trait);
        const explains = Array.isArray(explanation?.explains)
            ? explanation.explains.map((item) => normalizeText(item)).filter(Boolean)
            : [];

        if (explains.length > 0) {
            pushUniqueLine(lines, trait ? `${trait} ${explains.join('；')}` : explains.join('；'));
        }
    }

    for (const association of result.associations || []) {
        pushUniqueLine(lines, association);
    }

    for (const sentence of result.sentence || []) {
        pushUniqueLine(lines, sentence?.target || sentence?.source || '');
    }

    return lines.join('\n\n');
}
