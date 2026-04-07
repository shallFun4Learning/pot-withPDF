export const PDF_HIGHLIGHT_PRESETS = [
    { key: 'yellow', value: '#ffe066' },
    { key: 'green', value: '#8ce99a' },
    { key: 'blue', value: '#74c0fc' },
    { key: 'pink', value: '#faa2c1' },
];

export function normalizeHighlightColor(color) {
    if (!color) {
        return PDF_HIGHLIGHT_PRESETS[0].value;
    }
    const match = PDF_HIGHLIGHT_PRESETS.find((item) => item.value.toLowerCase() === String(color).toLowerCase());
    return match?.value ?? PDF_HIGHLIGHT_PRESETS[0].value;
}
