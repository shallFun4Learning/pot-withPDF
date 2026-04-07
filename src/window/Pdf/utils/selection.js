export function getSelectionTextFromViewer(selection, viewerElement) {
    if (!selection || !viewerElement || selection.rangeCount === 0 || selection.isCollapsed) {
        return '';
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    if ((anchorNode && !viewerElement.contains(anchorNode)) || (focusNode && !viewerElement.contains(focusNode))) {
        return '';
    }

    return selection.toString().replace(/\s+/g, ' ').trim();
}
