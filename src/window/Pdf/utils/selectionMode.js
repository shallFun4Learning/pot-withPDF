export function shouldTrackSelection(interactionMode) {
    return interactionMode !== 'highlight';
}

export function shouldAutoTranslateSelection({ interactionMode, autoTranslateSelection }) {
    return shouldTrackSelection(interactionMode) && Boolean(autoTranslateSelection);
}
