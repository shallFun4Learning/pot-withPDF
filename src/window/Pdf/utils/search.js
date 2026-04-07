const FIND_STATUS_MAP = {
    0: 'found',
    1: 'not_found',
    2: 'wrapped',
    3: 'pending',
};

export function createPdfSearchState(overrides = {}) {
    return {
        query: '',
        current: 0,
        total: 0,
        status: 'idle',
        pending: false,
        previous: false,
        ...overrides,
    };
}

export function applyPdfSearchMatches(state = createPdfSearchState(), matchesCount = {}) {
    return {
        ...state,
        current: Number(matchesCount?.current) || 0,
        total: Number(matchesCount?.total) || 0,
    };
}

export function mapPdfFindControlState(payload = {}, previousState = createPdfSearchState()) {
    return {
        ...previousState,
        query: payload?.rawQuery ?? previousState.query,
        current: Number(payload?.matchesCount?.current) || 0,
        total: Number(payload?.matchesCount?.total) || 0,
        status: FIND_STATUS_MAP[payload?.state] || 'idle',
        pending: payload?.state === 3,
        previous: Boolean(payload?.previous),
    };
}
