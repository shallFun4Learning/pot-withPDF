import { appWindow } from '@tauri-apps/api/window';

export function getWindowLabel() {
    if (typeof window !== 'undefined') {
        if (window.__POT_WINDOW_LABEL__) {
            return window.__POT_WINDOW_LABEL__;
        }
        const search = new URLSearchParams(window.location.search);
        const queryWindow = search.get('window');
        if (queryWindow) {
            return queryWindow;
        }
    }

    return appWindow.label;
}
