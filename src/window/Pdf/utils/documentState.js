export function createLoadedDocumentState(path, name = '') {
    return {
        currentPath: path,
        documentName: name || (path ? path.split(/[\\/]/).pop() : ''),
        dirty: false,
    };
}

export function markDocumentDirty(state, dirty) {
    return {
        ...state,
        dirty,
    };
}

export function markDocumentSaved(state, path) {
    return {
        ...state,
        currentPath: path,
        documentName: path ? path.split(/[\\/]/).pop() : state.documentName,
        dirty: false,
    };
}
