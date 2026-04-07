import { appWindow } from '@tauri-apps/api/window';
import { open, save } from '@tauri-apps/api/dialog';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api';
import toast, { Toaster } from 'react-hot-toast';
import { Button, Chip } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { AiOutlineFilePdf } from 'react-icons/ai';
import { MdHighlightAlt } from 'react-icons/md';
import { LuHistory } from 'react-icons/lu';

import PdfAnnotationSidebar from './components/PdfAnnotationSidebar';
import PdfComparePane from './components/PdfComparePane';
import PdfTabStrip from './components/PdfTabStrip';
import PdfThumbnailSidebar from './components/PdfThumbnailSidebar';
import PdfTranslationComparePane from './components/PdfTranslationComparePane';
import PdfTranslateSidebar from './components/PdfTranslateSidebar';
import PdfToolbar from './components/PdfToolbar';
import PdfViewerPane from './components/PdfViewerPane';
import { base64ToUint8Array, uint8ArrayToBase64 } from './utils/base64';
import { normalizePdfCompareMode, PDF_COMPARE_MODE_DOCUMENT, PDF_COMPARE_MODE_NONE, PDF_COMPARE_MODE_TRANSLATION } from './utils/compare';
import { createLoadedDocumentState, markDocumentDirty, markDocumentSaved } from './utils/documentState';
import { getAnnotationClientKey, getAnnotationDisplayNote, getDocumentAnnotationNotes, setDocumentAnnotationNote } from './utils/annotationNotes';
import { createExtractsExportFileName, createExtractsMarkdown } from './utils/extractsExport';
import { normalizeHighlightColor } from './utils/highlightPalette';
import { createPdfDocumentFromFile, findFirstPdfFile, findFirstPdfPath, isPdfPath } from './utils/pdfFiles';
import { addRecentPdfFile, normalizeRecentPdfFiles, removeRecentPdfFile } from './utils/recentFiles';
import { getPdfReadingProgress, normalizePdfReadingProgressMap, setPdfReadingProgress } from './utils/readingProgress';
import { createPdfSearchState } from './utils/search';
import { shouldAutoTranslateSelection, shouldTrackSelection } from './utils/selectionMode';
import {
    createPdfTab,
    findPdfTabByPath,
    getNextPdfTabId,
    getPdfTabsToCloseOther,
    getPdfTabsToCloseRight,
    reorderPdfTabs,
    setPdfTabPinned,
    sortPdfTabsForDisplay,
    swapPdfCompareTabs,
    updatePdfTab,
} from './utils/tabs';
import {
    addRecentlyClosedPdfTab,
    createRecentlyClosedPdfTabSnapshot,
    getMostRecentlyClosedPdfTab,
    normalizeRecentlyClosedPdfTabs,
    removeRecentlyClosedPdfTab,
} from './utils/recentlyClosedTabs';
import { copyPdfDocumentTerms } from './utils/terms';
import { createPdfWorkspaceSnapshot, normalizePdfWorkspaceSnapshot } from './utils/workspace';
import { useConfig } from '../../hooks';
import { osType } from '../../utils/env';

function getDocumentName(path) {
    return path ? path.split(/[\\/]/).pop() : '';
}

function hasDraggedFiles(dataTransfer) {
    return Array.from(dataTransfer?.types || []).includes('Files');
}

    function createEmptyViewerState() {
        return {
            currentPage: 0,
            pageCount: 0,
            scale: 1,
            scaleValue: 'page-width',
        };
    }

function createEmptyTranslationCompareState() {
    return {
        sourceText: '',
        selectionText: '',
        resultText: '',
        serviceLabel: '',
        isLoading: false,
        error: '',
    };
}

async function readDocumentFromPath(path) {
    const base64 = await invoke('read_pdf_file', { path });
    return {
        path,
        name: getDocumentName(path),
        data: base64ToUint8Array(base64),
    };
}

function createDefaultAdapter() {
    return {
        async openDocument(path) {
            if (path) {
                return readDocumentFromPath(path);
            }
            const selected = await open({
                multiple: false,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
            });
            if (!selected || Array.isArray(selected)) {
                return null;
            }
            return readDocumentFromPath(selected);
        },
        async readDocument(path) {
            return readDocumentFromPath(path);
        },
        async writeDocument(path, bytes) {
            await invoke('write_pdf_file', {
                path,
                base64: uint8ArrayToBase64(bytes),
            });
        },
        async writeTextFile(path, text) {
            await invoke('write_text_file', {
                path,
                text,
            });
        },
        async chooseSavePath(defaultPath) {
            const selected = await save({
                defaultPath,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
            });
            if (!selected || Array.isArray(selected)) {
                return null;
            }
            return selected;
        },
        async chooseExportPath(defaultPath) {
            const selected = await save({
                defaultPath,
                filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
            });
            if (!selected || Array.isArray(selected)) {
                return null;
            }
            return selected;
        },
    };
}

export default function PdfWindow({ adapter = createDefaultAdapter(), initialDocument = null }) {
    const viewerRef = useRef(null);
    const compareViewerRef = useRef(null);
    const tabsRef = useRef([]);
    const activeTabIdRef = useRef(null);
    const dragDepthRef = useRef(0);
    const loadGenerationRef = useRef(0);
    const compareLoadGenerationRef = useRef(0);
    const workspaceRestoredRef = useRef(false);
    const syncingPrimaryScrollRef = useRef(false);
    const syncingCompareScrollRef = useRef(false);

    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [selectionText, setSelectionText] = useState('');
    const [annotations, setAnnotations] = useState([]);
    const [outline, setOutline] = useState([]);
    const [viewerState, setViewerState] = useState(createEmptyViewerState());
    const [interactionMode, setInteractionMode] = useState('translate');
    const [navigationMode, setNavigationMode] = useState('pages');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchState, setSearchState] = useState(createPdfSearchState());
    const [annotationNotes, setAnnotationNotes] = useState({});
    const [selectedAnnotationKey, setSelectedAnnotationKey] = useState('');
    const [documentState, setDocumentState] = useState(createLoadedDocumentState(null));
    const [errorMessage, setErrorMessage] = useState('');
    const [thumbnails, setThumbnails] = useState([]);
    const [compareViewerState, setCompareViewerState] = useState(createEmptyViewerState());
    const [compareSyncPages, setCompareSyncPages] = useState(true);
    const [translationCompareState, setTranslationCompareState] = useState(createEmptyTranslationCompareState());
    const [recentFiles, setRecentFiles, getRecentFiles] = useConfig('pdf_recent_files', []);
    const [recentlyClosedTabs, setRecentlyClosedTabs, getRecentlyClosedTabs] = useConfig('pdf_recently_closed_tabs', []);
    const [readingProgressMap, setReadingProgressMap, getReadingProgressMap] = useConfig('pdf_reading_progress_map', {});
    const [startupPdfPath, setStartupPdfPath] = useConfig('pdf_startup_path', '');
    const [startupPdfMode, setStartupPdfMode] = useConfig('pdf_startup_mode', '');
    const [autoTranslateSelection, setAutoTranslateSelection] = useConfig('pdf_auto_translate_selection', true);
    const [thumbnailSidebarVisible, setThumbnailSidebarVisible] = useConfig('pdf_thumbnail_sidebar_visible', true);
    const [focusMode, setFocusMode] = useConfig('pdf_focus_mode', false);
    const [workspaceSnapshot, setWorkspaceSnapshot, getWorkspaceSnapshot] = useConfig('pdf_workspace_snapshot', {
        tabs: [],
        activePath: '',
    });
    const [storedAnnotationNotesMap, setStoredAnnotationNotesMap, getStoredAnnotationNotesMap] = useConfig(
        'pdf_annotation_notes_map',
        {}
    );
    const [termBankMap, setTermBankMap, getTermBankMap] = useConfig('pdf_term_bank_map', {});
    const [highlightColor, setHighlightColor] = useConfig('pdf_highlight_color', normalizeHighlightColor());
    const [dropState, setDropState] = useState({ active: false, name: '' });
    const { t } = useTranslation();

    const normalizedHighlightColor = normalizeHighlightColor(highlightColor);
    const thumbnailSidebarEnabled = thumbnailSidebarVisible ?? true;
    const autoTranslateSelectionEnabled = autoTranslateSelection ?? true;
    const focusModeEnabled = Boolean(focusMode);
    const normalizedRecentFiles = useMemo(() => normalizeRecentPdfFiles(recentFiles), [recentFiles]);
    const normalizedRecentlyClosedTabs = useMemo(
        () => normalizeRecentlyClosedPdfTabs(recentlyClosedTabs),
        [recentlyClosedTabs]
    );
    const normalizedReadingProgressMap = useMemo(
        () => normalizePdfReadingProgressMap(readingProgressMap),
        [readingProgressMap]
    );
    const displayTabs = useMemo(() => sortPdfTabsForDisplay(tabs), [tabs]);
    const activeTabData = useMemo(() => tabs.find((tab) => tab.id === activeTabId) || null, [tabs, activeTabId]);
    const activeCompareMode = useMemo(
        () => normalizePdfCompareMode(activeTabData?.compareMode, activeTabData?.comparePath),
        [activeTabData?.compareMode, activeTabData?.comparePath]
    );
    const translationCompareActive = activeCompareMode === PDF_COMPARE_MODE_TRANSLATION;
    const compareTargetTab = useMemo(() => {
        if (activeCompareMode !== PDF_COMPARE_MODE_DOCUMENT) {
            return null;
        }
        const comparePath = String(activeTabData?.comparePath || '').trim();
        if (!comparePath) {
            return null;
        }

        return tabs.find((tab) => tab.source?.path === comparePath && tab.id !== activeTabId) || null;
    }, [activeCompareMode, activeTabData?.comparePath, activeTabId, tabs]);
    const compareCandidates = useMemo(
        () =>
            displayTabs
                .filter((tab) => tab.id !== activeTabId && tab.source?.path)
                .map((tab) => ({
                    id: tab.id,
                    path: tab.source.path,
                    name: tab.documentState?.documentName || tab.source?.name || getDocumentName(tab.source.path),
                })),
        [activeTabId, displayTabs]
    );
    const displayAnnotations = useMemo(
        () =>
            annotations.map((annotation) => {
                const annotationKey = getAnnotationClientKey(annotation);
                return {
                    ...annotation,
                    annotationKey,
                    readerNote: annotationNotes[annotationKey] || '',
                    displayNote: getAnnotationDisplayNote(annotation, annotationNotes),
                };
            }),
        [annotationNotes, annotations]
    );
    const selectedAnnotation = useMemo(
        () => displayAnnotations.find((annotation) => annotation.annotationKey === selectedAnnotationKey) || null,
        [displayAnnotations, selectedAnnotationKey]
    );

    useEffect(() => {
        tabsRef.current = tabs;
    }, [tabs]);

    useEffect(() => {
        activeTabIdRef.current = activeTabId;
    }, [activeTabId]);

    useEffect(() => {
        if (documentState.documentName) {
            appWindow.setTitle(`pot-withPDF - ${documentState.documentName}`);
        } else {
            appWindow.setTitle('pot-withPDF');
        }
    }, [documentState.documentName]);

    const resetWindowState = useCallback(() => {
        setSelectionText('');
        setAnnotations([]);
        setOutline([]);
        setViewerState(createEmptyViewerState());
        setInteractionMode('translate');
        setNavigationMode('pages');
        setSearchQuery('');
        setSearchState(createPdfSearchState());
        setAnnotationNotes({});
        setSelectedAnnotationKey('');
        setDocumentState(createLoadedDocumentState(null));
        setErrorMessage('');
        setThumbnails([]);
        setCompareViewerState(createEmptyViewerState());
        setCompareSyncPages(true);
        setTranslationCompareState(createEmptyTranslationCompareState());
    }, []);

    const updateTabState = useCallback((tabId, updater) => {
        if (!tabId) {
            return;
        }
        setTabs((current) => updatePdfTab(current, tabId, updater));
    }, []);

    const updateActiveTabState = useCallback(
        (updater) => {
            const tabId = activeTabIdRef.current;
            if (!tabId) {
                return;
            }
            updateTabState(tabId, updater);
        },
        [updateTabState]
    );

    const updateRecentFiles = useCallback(
        (updater) => {
            const next = updater(normalizeRecentPdfFiles(getRecentFiles() || []));
            setRecentFiles(next, true);
            return next;
        },
        [getRecentFiles, setRecentFiles]
    );

    const rememberRecentFile = useCallback(
        (path, name = '') => {
            if (!path) {
                return;
            }
            updateRecentFiles((current) => addRecentPdfFile(current, { path, name }));
        },
        [updateRecentFiles]
    );

    const forgetRecentFile = useCallback(
        (path) => {
            updateRecentFiles((current) => removeRecentPdfFile(current, path));
        },
        [updateRecentFiles]
    );

    const clearRecentFiles = useCallback(() => {
        setRecentFiles([], true);
    }, [setRecentFiles]);

    const persistTabSnapshot = useCallback(async (tabId = activeTabIdRef.current) => {
        const tab = tabsRef.current.find((item) => item.id === tabId);
        if (!tab?.documentState?.dirty) {
            return;
        }
        const bytes = await viewerRef.current?.saveDocument();
        if (!bytes?.length) {
            return;
        }
        updateTabState(tabId, (currentTab) => ({
            ...currentTab,
            source: {
                ...currentTab.source,
                data: bytes,
            },
        }));
    }, [updateTabState]);

    const applyTabStateToWindow = useCallback((tab) => {
        if (!tab) {
            resetWindowState();
            return;
        }
        setSelectionText(tab.selectionText || '');
        setAnnotations(tab.annotations || []);
        setOutline(tab.outline || []);
        setViewerState(tab.viewerState || createEmptyViewerState());
        setInteractionMode(tab.interactionMode || 'translate');
        setNavigationMode(tab.navigationMode || 'pages');
        setSearchQuery(tab.searchQuery || '');
        setSearchState(tab.searchState || createPdfSearchState());
        setAnnotationNotes(tab.annotationNotes || {});
        setSelectedAnnotationKey(tab.selectedAnnotationKey || '');
        setDocumentState(tab.documentState || createLoadedDocumentState(null));
        setErrorMessage(tab.errorMessage || '');
        setThumbnails(tab.thumbnails || []);
        setCompareViewerState(tab.compareViewerState || createEmptyViewerState());
        setCompareSyncPages(tab.compareSyncPages !== false);
        setTranslationCompareState(tab.translationCompareState || createEmptyTranslationCompareState());
    }, [resetWindowState]);

    const switchToTab = useCallback(
        async (tabId) => {
            if (!tabId || tabId === activeTabIdRef.current) {
                return;
            }
            await persistTabSnapshot(activeTabIdRef.current);
            setActiveTabId(tabId);
        },
        [persistTabSnapshot]
    );

    const addTabFromResult = useCallback(
        async (result, { mode = 'translate', remember = true, restoreSnapshot = null } = {}) => {
            if (!result) {
                return null;
            }

            await persistTabSnapshot(activeTabIdRef.current);

            const tab = createPdfTab(result, {
                isPinned: Boolean(restoreSnapshot?.isPinned),
                compareMode: restoreSnapshot?.compareMode || '',
                comparePath: restoreSnapshot?.comparePath || '',
                compareSyncPages: restoreSnapshot?.compareSyncPages !== false,
                interactionMode: mode === 'highlight' ? 'highlight' : 'translate',
                navigationMode: restoreSnapshot?.navigationMode || 'pages',
                searchQuery: restoreSnapshot?.searchQuery || '',
                searchState: restoreSnapshot?.searchQuery
                    ? createPdfSearchState({ query: restoreSnapshot.searchQuery })
                    : createPdfSearchState(),
                selectedAnnotationKey: restoreSnapshot?.selectedAnnotationKey || '',
                annotationNotes: getDocumentAnnotationNotes(getStoredAnnotationNotesMap() || {}, result.path),
            });

            setTabs((current) => [...current, tab]);
            setActiveTabId(tab.id);
            setDropState({ active: false, name: '' });

            if (remember && result.path) {
                rememberRecentFile(result.path, result.name);
            }

            return tab;
        },
        [getStoredAnnotationNotesMap, persistTabSnapshot, rememberRecentFile]
    );

    const openDocumentByPath = useCallback(
        async (path, { mode = 'translate', removeIfUnreadable = false, restoreSnapshot = null } = {}) => {
            if (!path) {
                return null;
            }

            const existingTab = findPdfTabByPath(tabsRef.current, path);
            if (existingTab) {
                await switchToTab(existingTab.id);
                return existingTab;
            }

            try {
                const result = adapter.readDocument
                    ? await adapter.readDocument(path)
                    : await adapter.openDocument(path);
                return await addTabFromResult(result, { mode, restoreSnapshot });
            } catch (error) {
                const message = error?.message || error?.toString() || t('pdf.load_error');
                setErrorMessage(message);
                toast.error(message);
                if (removeIfUnreadable) {
                    forgetRecentFile(path);
                }
                return null;
            }
        },
        [adapter, addTabFromResult, forgetRecentFile, switchToTab, t]
    );

    const changeInteractionMode = useCallback(
        (nextMode) => {
            setInteractionMode(nextMode);
            viewerRef.current?.setHighlightMode(nextMode === 'highlight');
            viewerRef.current?.clearSelection();
            setSelectionText('');
            updateActiveTabState((tab) => ({
                ...tab,
                interactionMode: nextMode,
                selectionText: '',
            }));
        },
        [updateActiveTabState]
    );

    const changeNavigationMode = useCallback(
        (nextMode) => {
            setNavigationMode(nextMode);
            updateActiveTabState((tab) => ({
                ...tab,
                navigationMode: nextMode,
            }));
        },
        [updateActiveTabState]
    );

    const updateSelectedAnnotation = useCallback(
        (nextAnnotationKey) => {
            const normalizedKey = nextAnnotationKey || '';
            setSelectedAnnotationKey(normalizedKey);
            updateActiveTabState((tab) => ({
                ...tab,
                selectedAnnotationKey: normalizedKey,
            }));
        },
        [updateActiveTabState]
    );

    const updateSearchQueryState = useCallback(
        (nextQuery) => {
            setSearchQuery(nextQuery);
            setSearchState((current) => {
                const nextState = nextQuery
                    ? {
                          ...current,
                          query: nextQuery,
                      }
                    : createPdfSearchState();
                updateActiveTabState((tab) => ({
                    ...tab,
                    searchQuery: nextQuery,
                    searchState: nextState,
                }));
                return nextState;
            });
        },
        [updateActiveTabState]
    );

    const focusSearchInput = useCallback(() => {
        const input = document.querySelector('[data-testid="pdf-search-input"] input');
        input?.focus();
        input?.select?.();
    }, []);

    const handleAnnotationNoteChange = useCallback(
        (annotation, note) => {
            const annotationKey = getAnnotationClientKey(annotation);
            const normalizedNote = String(note || '').replace(/\r\n?/g, '\n').trim();
            const nextAnnotationNotes = {
                ...annotationNotes,
            };

            if (normalizedNote) {
                nextAnnotationNotes[annotationKey] = normalizedNote;
            } else {
                delete nextAnnotationNotes[annotationKey];
            }

            setAnnotationNotes(nextAnnotationNotes);
            updateSelectedAnnotation(annotationKey);
            updateActiveTabState((tab) => ({
                ...tab,
                annotationNotes: nextAnnotationNotes,
                selectedAnnotationKey: annotationKey,
            }));

            if (documentState.currentPath) {
                const nextStoredMap = setDocumentAnnotationNote(
                    getStoredAnnotationNotesMap() || {},
                    documentState.currentPath,
                    annotationKey,
                    normalizedNote
                );
                setStoredAnnotationNotesMap(nextStoredMap, true);
            }
        },
        [
            annotationNotes,
            documentState.currentPath,
            getStoredAnnotationNotesMap,
            setStoredAnnotationNotesMap,
            updateActiveTabState,
            updateSelectedAnnotation,
        ]
    );

    const focusAnnotation = useCallback(
        async (annotation) => {
            updateSelectedAnnotation(getAnnotationClientKey(annotation));
            changeInteractionMode('highlight');
            const focused = await viewerRef.current?.focusAnnotation(annotation);
            if (!focused) {
                toast.error(t('pdf.highlight_locate_error'));
            }
        },
        [changeInteractionMode, t, updateSelectedAnnotation]
    );

    const deleteAnnotation = useCallback(
        async (annotation) => {
            updateSelectedAnnotation('');
            changeInteractionMode('highlight');
            const deleted = await viewerRef.current?.deleteAnnotation(annotation);
            if (!deleted) {
                toast.error(t('pdf.highlight_delete_error'));
                return;
            }
            toast.success(t('pdf.highlight_delete_success'));
        },
        [changeInteractionMode, t, updateSelectedAnnotation]
    );

    const saveDocumentToPath = useCallback(
        async (path) => {
            const bytes = await viewerRef.current?.saveDocument();
            if (!bytes || !path) {
                return null;
            }

            await adapter.writeDocument(path, bytes);
            if (Object.keys(annotationNotes).length > 0) {
                const currentNotesMap = getStoredAnnotationNotesMap() || {};
                setStoredAnnotationNotesMap(
                    {
                        ...currentNotesMap,
                        [path]: {
                            ...annotationNotes,
                        },
                    },
                    true
                );
            }
            const currentPath = documentState.currentPath || '';
            const currentDocumentName = documentState.documentName || '';
            const nextTermBankMap = copyPdfDocumentTerms(getTermBankMap() || termBankMap, {
                fromPath: currentPath,
                fromDocumentName: currentDocumentName,
                toPath: path,
                toDocumentName: getDocumentName(path) || currentDocumentName,
            });
            setTermBankMap(nextTermBankMap, true);
            const nextDocumentState = markDocumentSaved(documentState, path);
            setDocumentState(nextDocumentState);
            updateActiveTabState((tab) => ({
                ...tab,
                documentState: nextDocumentState,
                source: {
                    ...tab.source,
                    path,
                    name: nextDocumentState.documentName,
                    data: bytes,
                },
                errorMessage: '',
            }));
            rememberRecentFile(path);
            toast.success(t('pdf.saved_success'));
            return path;
        },
        [
            adapter,
            annotationNotes,
            documentState,
            getTermBankMap,
            getStoredAnnotationNotesMap,
            rememberRecentFile,
            setTermBankMap,
            setStoredAnnotationNotesMap,
            t,
            termBankMap,
            updateActiveTabState,
        ]
    );

    const saveDocumentAs = useCallback(async () => {
        const defaultPath = documentState.currentPath || `${documentState.documentName || 'document'}.pdf`;
        const selectedPath = await adapter.chooseSavePath(defaultPath);
        if (!selectedPath) {
            return null;
        }
        return saveDocumentToPath(selectedPath);
    }, [adapter, documentState.currentPath, documentState.documentName, saveDocumentToPath]);

    const saveCurrentDocument = useCallback(async () => {
        if (!documentState.currentPath) {
            return saveDocumentAs();
        }
        return saveDocumentToPath(documentState.currentPath);
    }, [documentState.currentPath, saveDocumentAs, saveDocumentToPath]);

    const exportExtracts = useCallback(async () => {
        if (!documentState.documentName || displayAnnotations.length === 0) {
            return null;
        }

        const defaultPath = createExtractsExportFileName(documentState.documentName);
        const selectedPath = adapter.chooseExportPath
            ? await adapter.chooseExportPath(defaultPath)
            : await adapter.chooseSavePath(defaultPath);

        if (!selectedPath) {
            return null;
        }

        const markdown = createExtractsMarkdown({
            documentName: documentState.documentName,
            documentPath: documentState.currentPath,
            annotations: displayAnnotations,
            exportedAt: new Date(),
        });

        await adapter.writeTextFile(selectedPath, markdown);
        toast.success(t('pdf.export_extracts_success'));
        return selectedPath;
    }, [adapter, displayAnnotations, documentState.currentPath, documentState.documentName, t]);

    const setTabPinned = useCallback((tabId, nextPinned) => {
        setTabs((current) => setPdfTabPinned(current, tabId, nextPinned));
    }, []);

    const reorderTabs = useCallback((draggedTabId, targetTabId) => {
        setTabs((current) => reorderPdfTabs(current, draggedTabId, targetTabId));
    }, []);

    const setCompareDocument = useCallback(
        (path = '') => {
            const normalizedPath = String(path || '').trim();
            updateActiveTabState((tab) => ({
                ...tab,
                compareMode: normalizedPath ? PDF_COMPARE_MODE_DOCUMENT : PDF_COMPARE_MODE_NONE,
                comparePath: normalizedPath,
                compareSyncPages: normalizedPath ? tab.compareSyncPages !== false : true,
                compareViewerState: normalizedPath ? tab.compareViewerState || createEmptyViewerState() : createEmptyViewerState(),
            }));
        },
        [updateActiveTabState]
    );

    const setTranslationCompareMode = useCallback(
        (enabled = true) => {
            updateActiveTabState((tab) => ({
                ...tab,
                compareMode: enabled ? PDF_COMPARE_MODE_TRANSLATION : PDF_COMPARE_MODE_NONE,
                comparePath: '',
                compareSyncPages: true,
                compareViewerState: createEmptyViewerState(),
            }));
        },
        [updateActiveTabState]
    );

    const toggleCompareSyncPages = useCallback(
        (nextValue) => {
            const nextSyncValue = typeof nextValue === 'boolean' ? nextValue : !compareSyncPages;
            setCompareSyncPages(nextSyncValue);
            updateActiveTabState((tab) => ({
                ...tab,
                compareSyncPages: nextSyncValue,
            }));
        },
        [compareSyncPages, updateActiveTabState]
    );

    const clearCompareMode = useCallback(() => {
        if (activeCompareMode === PDF_COMPARE_MODE_TRANSLATION) {
            setTranslationCompareMode(false);
            return;
        }
        setCompareDocument('');
    }, [activeCompareMode, setCompareDocument, setTranslationCompareMode]);

    const swapCompareDocuments = useCallback(async () => {
        const activeId = activeTabIdRef.current;
        if (!activeId) {
            return;
        }

        if (activeCompareMode !== PDF_COMPARE_MODE_DOCUMENT) {
            return;
        }

        await persistTabSnapshot(activeId);

        const { tabs: nextTabs, nextActiveTabId } = swapPdfCompareTabs(tabsRef.current, activeId, {
            primaryViewerState: viewerState,
            compareViewerState,
        });

        setTabs(nextTabs);
        if (nextActiveTabId && nextActiveTabId !== activeId) {
            setActiveTabId(nextActiveTabId);
        }
    }, [activeCompareMode, compareViewerState, persistTabSnapshot, viewerState]);

    const rememberRecentlyClosedTab = useCallback(
        (tab) => {
            const snapshot = createRecentlyClosedPdfTabSnapshot(tab);
            if (!snapshot) {
                return;
            }

            const nextTabs = addRecentlyClosedPdfTab(getRecentlyClosedTabs() || recentlyClosedTabs, snapshot);
            setRecentlyClosedTabs(nextTabs, true);
        },
        [getRecentlyClosedTabs, recentlyClosedTabs, setRecentlyClosedTabs]
    );

    const restoreClosedTab = useCallback(
        async (snapshotId = '') => {
            const closedEntries = normalizeRecentlyClosedPdfTabs(getRecentlyClosedTabs() || recentlyClosedTabs);
            const targetSnapshot =
                closedEntries.find((entry) => entry.id === String(snapshotId || '').trim()) ||
                getMostRecentlyClosedPdfTab(closedEntries);

            if (!targetSnapshot) {
                return null;
            }

            const tab = await openDocumentByPath(targetSnapshot.path, {
                mode: targetSnapshot.interactionMode,
                removeIfUnreadable: true,
                restoreSnapshot: targetSnapshot,
            });

            if (tab) {
                setRecentlyClosedTabs(removeRecentlyClosedPdfTab(closedEntries, targetSnapshot.id), true);
            }

            return tab;
        },
        [getRecentlyClosedTabs, openDocumentByPath, recentlyClosedTabs, setRecentlyClosedTabs]
    );

    const toggleFocusMode = useCallback(
        (nextValue) => {
            const nextFocusMode = typeof nextValue === 'boolean' ? nextValue : !focusModeEnabled;
            setFocusMode(nextFocusMode, true);
        },
        [focusModeEnabled, setFocusMode]
    );

    const closeTab = useCallback(
        async (tabId) => {
            const tab = tabsRef.current.find((item) => item.id === tabId);
            if (!tab) {
                return false;
            }

            if (
                tab.documentState?.dirty &&
                !window.confirm(
                    t('pdf.close_tab_confirm_message', {
                        name: tab.documentState.documentName || t('pdf.tab_untitled'),
                    })
                )
            ) {
                return false;
            }

            const nextActiveId = getNextPdfTabId(tabsRef.current, tabId, activeTabIdRef.current);
            rememberRecentlyClosedTab(tab);
            setTabs((current) => current.filter((item) => item.id !== tabId));

            if (activeTabIdRef.current === tabId) {
                setActiveTabId(nextActiveId);
            }

            return true;
        },
        [rememberRecentlyClosedTab, t]
    );

    const closeOtherTabs = useCallback(
        async (tabId) => {
            const targetTab = tabsRef.current.find((tab) => tab.id === tabId);
            if (!targetTab) {
                return;
            }

            if (activeTabIdRef.current !== tabId) {
                setActiveTabId(tabId);
            }

            const tabsToClose = getPdfTabsToCloseOther(tabsRef.current, tabId);
            for (const tab of tabsToClose) {
                const closed = await closeTab(tab.id);
                if (!closed) {
                    break;
                }
            }
        },
        [closeTab]
    );

    const closeTabsToRight = useCallback(
        async (tabId) => {
            const tabsToClose = getPdfTabsToCloseRight(tabsRef.current, tabId);
            for (const tab of tabsToClose) {
                const closed = await closeTab(tab.id);
                if (!closed) {
                    break;
                }
            }
        },
        [closeTab]
    );

    const openDocument = useCallback(async () => {
        try {
            const result = await adapter.openDocument();
            if (!result) {
                return;
            }

            if (result.path) {
                const existingTab = findPdfTabByPath(tabsRef.current, result.path);
                if (existingTab) {
                    await switchToTab(existingTab.id);
                    return;
                }
            }

            await addTabFromResult(result, { mode: 'translate' });
        } catch (error) {
            const message = error?.message || error?.toString() || t('pdf.load_error');
            setErrorMessage(message);
            toast.error(message);
        }
    }, [adapter, addTabFromResult, switchToTab, t]);

    const openDroppedFile = useCallback(
        async (file) => {
            try {
                const result = await createPdfDocumentFromFile(file);
                await addTabFromResult(result, { mode: 'translate', remember: false });
            } catch (error) {
                const message = error?.message || error?.toString() || t('pdf.load_error');
                setErrorMessage(message);
                toast.error(message);
            }
        },
        [addTabFromResult, t]
    );

    const openDroppedPath = useCallback(
        async (path) => {
            if (!isPdfPath(path)) {
                toast.error(t('pdf.drop_invalid_file'));
                return;
            }
            await openDocumentByPath(path, { removeIfUnreadable: true });
        },
        [openDocumentByPath, t]
    );

    useEffect(() => {
        if (initialDocument) {
            const tab = createPdfTab(initialDocument, {
                annotationNotes: getDocumentAnnotationNotes(getStoredAnnotationNotesMap() || {}, initialDocument.path),
            });
            setTabs([tab]);
            setActiveTabId(tab.id);
            if (initialDocument.path) {
                rememberRecentFile(initialDocument.path, initialDocument.name);
            }
        }
    }, [getStoredAnnotationNotesMap, initialDocument, rememberRecentFile]);

    useEffect(() => {
        if (!startupPdfPath) {
            return;
        }
        let cancelled = false;

        (async () => {
            try {
                if (!cancelled) {
                    await openDocumentByPath(startupPdfPath, {
                        mode: startupPdfMode === 'highlight' ? 'highlight' : 'translate',
                        removeIfUnreadable: true,
                    });
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }
                const message = error?.message || error?.toString() || t('pdf.load_error');
                setErrorMessage(message);
                toast.error(message);
            } finally {
                setStartupPdfPath('', true);
                setStartupPdfMode('', true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [openDocumentByPath, setStartupPdfMode, setStartupPdfPath, startupPdfMode, startupPdfPath, t]);

    useEffect(() => {
        const nextSnapshot = createPdfWorkspaceSnapshot(tabs, activeTabId);
        const currentSnapshot = normalizePdfWorkspaceSnapshot(getWorkspaceSnapshot() || workspaceSnapshot);

        if (JSON.stringify(nextSnapshot) === JSON.stringify(currentSnapshot)) {
            return;
        }

        setWorkspaceSnapshot(nextSnapshot, true);
    }, [activeTabId, getWorkspaceSnapshot, setWorkspaceSnapshot, tabs, workspaceSnapshot]);

    useEffect(() => {
        if (workspaceRestoredRef.current) {
            return;
        }

        if (initialDocument || startupPdfPath || tabsRef.current.length > 0) {
            workspaceRestoredRef.current = true;
            return;
        }

        const snapshot = normalizePdfWorkspaceSnapshot(getWorkspaceSnapshot() || workspaceSnapshot);
        if (snapshot.tabs.length === 0) {
            workspaceRestoredRef.current = true;
            return;
        }

        workspaceRestoredRef.current = true;
        let cancelled = false;

        (async () => {
            const restoredTabs = [];

            for (const tabSnapshot of snapshot.tabs) {
                const tab = await openDocumentByPath(tabSnapshot.path, {
                    mode: tabSnapshot.interactionMode,
                    removeIfUnreadable: true,
                    restoreSnapshot: tabSnapshot,
                });

                if (!tab || cancelled) {
                    continue;
                }

                restoredTabs.push({
                    path: tabSnapshot.path,
                    id: tab.id,
                });
            }

            if (cancelled || !snapshot.activePath) {
                return;
            }

            const targetTab = restoredTabs.find((tab) => tab.path === snapshot.activePath);
            if (targetTab?.id) {
                setActiveTabId(targetTab.id);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        getWorkspaceSnapshot,
        initialDocument,
        openDocumentByPath,
        startupPdfPath,
        tabs,
        workspaceSnapshot,
    ]);

    useEffect(() => {
        viewerRef.current?.setHighlightColor(normalizedHighlightColor);
    }, [normalizedHighlightColor]);

    useEffect(() => {
        if (!displayAnnotations.length) {
            if (selectedAnnotationKey) {
                updateSelectedAnnotation('');
            }
            return;
        }

        if (!displayAnnotations.some((annotation) => annotation.annotationKey === selectedAnnotationKey)) {
            updateSelectedAnnotation(displayAnnotations[0].annotationKey);
        }
    }, [displayAnnotations, selectedAnnotationKey, updateSelectedAnnotation]);

    useEffect(() => {
        if (!documentState.documentName || !viewerState.pageCount) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            if (!searchQuery.trim()) {
                viewerRef.current?.clearSearch?.();
                return;
            }
            viewerRef.current?.search?.(searchQuery);
        }, 180);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [documentState.documentName, searchQuery, viewerState.pageCount]);

    useEffect(() => {
        if (!documentState.currentPath || !viewerState.pageCount || !viewerState.currentPage) {
            return;
        }

        const currentMap = getReadingProgressMap() || {};
        const nextMap = setPdfReadingProgress(currentMap, documentState.currentPath, {
            pageNumber: viewerState.currentPage,
            scaleValue: viewerState.scaleValue,
        });

        const currentEntry = currentMap?.[documentState.currentPath];
        const nextEntry = nextMap?.[documentState.currentPath];

        if (
            currentEntry?.pageNumber === nextEntry?.pageNumber &&
            currentEntry?.scaleValue === nextEntry?.scaleValue
        ) {
            return;
        }

        setReadingProgressMap(nextMap);
    }, [
        documentState.currentPath,
        getReadingProgressMap,
        setReadingProgressMap,
        viewerState.currentPage,
        viewerState.pageCount,
        viewerState.scaleValue,
    ]);

    useEffect(() => {
        if (!compareTargetTab?.source?.path || !compareViewerState.pageCount || !compareViewerState.currentPage) {
            return;
        }

        const currentMap = getReadingProgressMap() || {};
        const nextMap = setPdfReadingProgress(currentMap, compareTargetTab.source.path, {
            pageNumber: compareViewerState.currentPage,
            scaleValue: compareViewerState.scaleValue,
        });

        const currentEntry = currentMap?.[compareTargetTab.source.path];
        const nextEntry = nextMap?.[compareTargetTab.source.path];

        if (
            currentEntry?.pageNumber === nextEntry?.pageNumber &&
            currentEntry?.scaleValue === nextEntry?.scaleValue
        ) {
            return;
        }

        setReadingProgressMap(nextMap);
    }, [
        compareTargetTab?.source?.path,
        compareViewerState.currentPage,
        compareViewerState.pageCount,
        compareViewerState.scaleValue,
        getReadingProgressMap,
        setReadingProgressMap,
    ]);

    useEffect(() => {
        if (!compareTargetTab || !compareSyncPages || !viewerState.currentPage || !compareViewerState.pageCount) {
            return;
        }

        const nextPage = Math.min(viewerState.currentPage, compareViewerState.pageCount);
        if (!nextPage || nextPage === compareViewerState.currentPage) {
            return;
        }

        compareViewerRef.current?.goToPage(nextPage);
    }, [
        compareSyncPages,
        compareTargetTab,
        compareViewerState.currentPage,
        compareViewerState.pageCount,
        viewerState.currentPage,
    ]);

    useEffect(() => {
        syncingPrimaryScrollRef.current = false;
        syncingCompareScrollRef.current = false;
    }, [compareSyncPages, compareTargetTab?.id, activeCompareMode]);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.__TAURI_IPC__) {
            return undefined;
        }

        let unlisten = null;

        appWindow
            .onFileDropEvent(async (event) => {
                if (event.payload.type === 'hover') {
                    const hoveredPath = findFirstPdfPath(event.payload.paths);
                    setDropState({
                        active: Boolean(hoveredPath),
                        name: getDocumentName(hoveredPath),
                    });
                    return;
                }

                if (event.payload.type === 'cancel') {
                    setDropState({ active: false, name: '' });
                    return;
                }

                const droppedPath = findFirstPdfPath(event.payload.paths);
                setDropState({ active: false, name: '' });
                if (droppedPath) {
                    await openDroppedPath(droppedPath);
                } else {
                    toast.error(t('pdf.drop_invalid_file'));
                }
            })
            .then((dispose) => {
                unlisten = dispose;
            })
            .catch(() => {
                // noop outside tauri runtime
            });

        return () => {
            unlisten?.();
        };
    }, [openDroppedPath, t]);

    useEffect(() => {
        const handleKeyDown = async (event) => {
            const lowerKey = event.key.toLowerCase();
            if (event.metaKey || event.ctrlKey) {
                if (lowerKey === 'f') {
                    event.preventDefault();
                    focusSearchInput();
                    return;
                }
                if (lowerKey === 's') {
                    event.preventDefault();
                    await saveCurrentDocument();
                    return;
                }
                if (lowerKey === 't') {
                    event.preventDefault();
                    if (event.shiftKey) {
                        await restoreClosedTab();
                        return;
                    }
                    await openDocument();
                    return;
                }
                if (lowerKey === 'w') {
                    event.preventDefault();
                    await closeTab(activeTabIdRef.current);
                    return;
                }
                if (lowerKey === 'g' && searchQuery.trim()) {
                    event.preventDefault();
                    if (event.shiftKey) {
                        viewerRef.current?.searchPrevious?.();
                    } else {
                        viewerRef.current?.searchNext?.();
                    }
                    return;
                }
                if (lowerKey === '1') {
                    event.preventDefault();
                    changeInteractionMode('translate');
                    return;
                }
                if (lowerKey === '2') {
                    event.preventDefault();
                    changeInteractionMode('highlight');
                    return;
                }
                if (lowerKey === '3') {
                    event.preventDefault();
                    toggleFocusMode();
                    return;
                }
            }
            if (event.key === 'Escape') {
                if (interactionMode === 'highlight') {
                    event.preventDefault();
                    changeInteractionMode('translate');
                    return;
                }
                if (focusModeEnabled) {
                    event.preventDefault();
                    toggleFocusMode(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [
        changeInteractionMode,
        closeTab,
        focusSearchInput,
        focusModeEnabled,
        interactionMode,
        openDocument,
        restoreClosedTab,
        saveCurrentDocument,
        searchQuery,
        toggleFocusMode,
    ]);

    useEffect(() => {
        const nextTab = tabsRef.current.find((tab) => tab.id === activeTabId) || null;
        const loadGeneration = loadGenerationRef.current + 1;
        loadGenerationRef.current = loadGeneration;

        if (!nextTab) {
            resetWindowState();
            void viewerRef.current?.clearDocument?.();
            return;
        }

        applyTabStateToWindow(nextTab);
        setDropState({ active: false, name: '' });

        let cancelled = false;

        (async () => {
            try {
                await viewerRef.current?.openDocument({
                    data: nextTab.source.data,
                    restoreViewState: nextTab.source.path
                        ? getPdfReadingProgress(getReadingProgressMap() || {}, nextTab.source.path) || nextTab.viewerState
                        : nextTab.viewerState,
                });

                if (cancelled || loadGenerationRef.current !== loadGeneration) {
                    return;
                }

                if (nextTab.documentState?.dirty) {
                    setDocumentState(nextTab.documentState);
                    updateTabState(nextTab.id, (tab) => ({
                        ...tab,
                        documentState: nextTab.documentState,
                    }));
                }

                viewerRef.current?.setHighlightMode(nextTab.interactionMode === 'highlight');
                viewerRef.current?.setHighlightColor(normalizedHighlightColor);
                if (nextTab.searchQuery) {
                    viewerRef.current?.search?.(nextTab.searchQuery);
                } else {
                    viewerRef.current?.clearSearch?.();
                }
            } catch (error) {
                if (cancelled || loadGenerationRef.current !== loadGeneration) {
                    return;
                }
                const message = error?.message || error?.toString() || t('pdf.load_error');
                setErrorMessage(message);
                updateTabState(nextTab.id, (tab) => ({
                    ...tab,
                    errorMessage: message,
                }));
                toast.error(message);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        activeTabId,
        applyTabStateToWindow,
        getReadingProgressMap,
        normalizedHighlightColor,
        resetWindowState,
        t,
        updateTabState,
    ]);

    useEffect(() => {
        if (activeCompareMode !== PDF_COMPARE_MODE_DOCUMENT || !activeTabData?.comparePath) {
            return;
        }

        if (!compareTargetTab) {
            setCompareDocument('');
        }
    }, [activeCompareMode, activeTabData?.comparePath, compareTargetTab, setCompareDocument]);

    useEffect(() => {
        const loadGeneration = compareLoadGenerationRef.current + 1;
        compareLoadGenerationRef.current = loadGeneration;

        if (!compareTargetTab) {
            setCompareViewerState(createEmptyViewerState());
            void compareViewerRef.current?.clearDocument?.();
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const activeTab = tabsRef.current.find((tab) => tab.id === activeTabIdRef.current);
                const restoreCompareViewState = activeTab?.compareViewerState;
                await compareViewerRef.current?.openDocument({
                    data: compareTargetTab.source.data,
                    restoreViewState:
                        restoreCompareViewState?.pageCount || restoreCompareViewState?.currentPage
                            ? restoreCompareViewState
                            : getPdfReadingProgress(getReadingProgressMap() || {}, compareTargetTab.source.path) ||
                              compareTargetTab.viewerState,
                });

                if (cancelled || compareLoadGenerationRef.current !== loadGeneration) {
                    return;
                }
            } catch (error) {
                if (cancelled || compareLoadGenerationRef.current !== loadGeneration) {
                    return;
                }
                toast.error(error?.message || error?.toString() || t('pdf.load_error'));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        activeTabId,
        compareTargetTab?.id,
        compareTargetTab?.source?.data,
        compareTargetTab?.source?.path,
        getReadingProgressMap,
        t,
    ]);

    const syncCompareViewerToPrimary = useCallback(
        (scrollState) => {
            if (!compareTargetTab || !compareSyncPages || syncingCompareScrollRef.current) {
                return;
            }

            syncingPrimaryScrollRef.current = true;
            const applied = compareViewerRef.current?.applyScrollSyncState?.(scrollState);
            if (!applied) {
                syncingPrimaryScrollRef.current = false;
            }
        },
        [compareSyncPages, compareTargetTab]
    );

    const syncPrimaryViewerToCompare = useCallback(
        (scrollState) => {
            if (!compareTargetTab || !compareSyncPages || syncingPrimaryScrollRef.current) {
                return;
            }

            syncingCompareScrollRef.current = true;
            const applied = viewerRef.current?.applyScrollSyncState?.(scrollState);
            if (!applied) {
                syncingCompareScrollRef.current = false;
            }
        },
        [compareSyncPages, compareTargetTab]
    );

    const toolbarProps = useMemo(
        () => ({
            documentName: documentState.documentName,
            dirty: documentState.dirty,
            currentPage: viewerState.currentPage,
            pageCount: viewerState.pageCount,
            scale: viewerState.scale,
            interactionMode,
            focusMode: focusModeEnabled,
            compareMode: activeCompareMode,
            compareDocumentName:
                compareTargetTab?.documentState?.documentName || compareTargetTab?.source?.name || '',
            compareCandidates,
            compareSyncPages,
            thumbnailSidebarVisible: thumbnailSidebarEnabled,
            recentFiles: normalizedRecentFiles,
            searchQuery,
            searchCurrent: searchState.current,
            searchTotal: searchState.total,
            searchStatus: searchState.status,
            onOpen: openDocument,
            onOpenRecent: (path) => openDocumentByPath(path, { removeIfUnreadable: true }),
            onClearRecentFiles: clearRecentFiles,
            onSave: saveCurrentDocument,
            onSaveAs: saveDocumentAs,
            onPreviousPage: () => viewerRef.current?.previousPage(),
            onNextPage: () => viewerRef.current?.nextPage(),
            onPageSubmit: (pageNumber) => viewerRef.current?.goToPage(pageNumber),
            onZoomIn: () => viewerRef.current?.zoomIn(),
            onZoomOut: () => viewerRef.current?.zoomOut(),
            onFitWidth: () => viewerRef.current?.fitWidth(),
            onChangeMode: changeInteractionMode,
            onToggleFocusMode: toggleFocusMode,
            onSelectTranslationCompare: () => setTranslationCompareMode(true),
            onSelectCompareDocument: setCompareDocument,
            onClearCompareDocument: clearCompareMode,
            onToggleCompareSyncPages: toggleCompareSyncPages,
            onSwapCompareDocument: swapCompareDocuments,
            onToggleThumbnailSidebar: () => setThumbnailSidebarVisible(!thumbnailSidebarEnabled),
            onSearchChange: updateSearchQueryState,
            onSearchNext: () => viewerRef.current?.searchNext?.(searchQuery),
            onSearchPrevious: () => viewerRef.current?.searchPrevious?.(searchQuery),
            onSearchClear: () => updateSearchQueryState(''),
        }),
        [
            activeCompareMode,
            changeInteractionMode,
            compareCandidates,
            compareTargetTab?.documentState?.documentName,
            compareTargetTab?.source?.name,
            clearRecentFiles,
            clearCompareMode,
            compareSyncPages,
            documentState,
            focusModeEnabled,
            interactionMode,
            normalizedRecentFiles,
            openDocument,
            openDocumentByPath,
            searchQuery,
            searchState.current,
            searchState.status,
            searchState.total,
            saveCurrentDocument,
            saveDocumentAs,
            setCompareDocument,
            setTranslationCompareMode,
            setThumbnailSidebarVisible,
            swapCompareDocuments,
            thumbnailSidebarEnabled,
            toggleCompareSyncPages,
            toggleFocusMode,
            updateSearchQueryState,
            viewerState,
        ]
    );

    const primaryViewerPaneProps = {
        ref: viewerRef,
        trackSelection: shouldTrackSelection(interactionMode),
        highlightColor: normalizedHighlightColor,
        onAnnotationsChange: (nextAnnotations) => {
            const nextKeys = nextAnnotations.map((annotation) => getAnnotationClientKey(annotation));
            const nextSelectedKey = nextKeys.includes(selectedAnnotationKey) ? selectedAnnotationKey : nextKeys[0] || '';
            setAnnotations(nextAnnotations);
            setSelectedAnnotationKey(nextSelectedKey);
            updateActiveTabState((tab) => ({
                ...tab,
                annotations: nextAnnotations,
                selectedAnnotationKey: nextSelectedKey,
            }));
        },
        onThumbnailsChange: (nextThumbnails) => {
            setThumbnails(nextThumbnails);
            updateActiveTabState((tab) => ({
                ...tab,
                thumbnails: nextThumbnails,
            }));
        },
        onOutlineChange: (nextOutline) => {
            setOutline(nextOutline);
            updateActiveTabState((tab) => ({
                ...tab,
                outline: nextOutline,
            }));
        },
        onSelectionTextChange: (text) => {
            if (!shouldTrackSelection(interactionMode)) {
                return;
            }
            setSelectionText(text);
            updateActiveTabState((tab) => ({
                ...tab,
                selectionText: text,
            }));
        },
        onDirtyChange: (dirty) => {
            setDocumentState((current) => markDocumentDirty(current, dirty));
            updateActiveTabState((tab) => ({
                ...tab,
                documentState: markDocumentDirty(tab.documentState, dirty),
            }));
        },
        onViewerStateChange: (nextViewerState) => {
            setViewerState(nextViewerState);
            updateActiveTabState((tab) => ({
                ...tab,
                viewerState: nextViewerState,
            }));
        },
        onScrollStateChange: (nextScrollState) => {
            if (syncingCompareScrollRef.current) {
                syncingCompareScrollRef.current = false;
                return;
            }
            syncCompareViewerToPrimary(nextScrollState);
        },
        onSearchStateChange: (nextSearchState) => {
            setSearchState(nextSearchState);
            updateActiveTabState((tab) => ({
                ...tab,
                searchState: nextSearchState,
            }));
        },
        onError: (error) => {
            const message = error?.message || error?.toString() || t('pdf.load_error');
            setErrorMessage(message);
            updateActiveTabState((tab) => ({
                ...tab,
                errorMessage: message,
            }));
            toast.error(message);
        },
    };

    const hasSecondaryComparePane = Boolean(compareTargetTab || translationCompareActive);

    const contentGridClass = focusModeEnabled
        ? 'grid-cols-[minmax(0,1fr)]'
        : hasSecondaryComparePane && thumbnailSidebarEnabled
          ? 'grid-cols-[220px_minmax(0,1fr)_360px]'
          : hasSecondaryComparePane
            ? 'grid-cols-[minmax(0,1fr)_360px]'
        : thumbnailSidebarEnabled
          ? 'grid-cols-[252px_minmax(0,1fr)_420px]'
          : 'grid-cols-[minmax(0,1fr)_420px]';

    return (
        <div
            className={`bg-default-50 h-screen w-screen ${osType === 'Linux' ? 'rounded-[10px]' : ''}`}
            onDragEnter={(event) => {
                if (!hasDraggedFiles(event.dataTransfer)) {
                    return;
                }
                event.preventDefault();
                const file = findFirstPdfFile(event.dataTransfer?.files);
                if (!file) {
                    return;
                }
                dragDepthRef.current += 1;
                setDropState({ active: true, name: file.name });
            }}
            onDragOver={(event) => {
                if (!hasDraggedFiles(event.dataTransfer)) {
                    return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                const file = findFirstPdfFile(event.dataTransfer?.files);
                if (!file) {
                    return;
                }
                if (!dropState.active) {
                    setDropState({ active: true, name: file.name });
                }
            }}
            onDragLeave={(event) => {
                if (!hasDraggedFiles(event.dataTransfer)) {
                    return;
                }
                dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                if (dragDepthRef.current === 0) {
                    setDropState({ active: false, name: '' });
                }
            }}
            onDrop={async (event) => {
                if (!hasDraggedFiles(event.dataTransfer)) {
                    return;
                }
                event.preventDefault();
                const file = findFirstPdfFile(event.dataTransfer?.files);
                dragDepthRef.current = 0;
                setDropState({ active: false, name: '' });
                if (!file) {
                    toast.error(t('pdf.drop_invalid_file'));
                    return;
                }
                await openDroppedFile(file);
            }}
        >
            <Toaster />
            <PdfToolbar {...toolbarProps} />
            {!focusModeEnabled ? (
                <PdfTabStrip
                    tabs={displayTabs}
                activeTabId={activeTabId}
                onSelectTab={switchToTab}
                onCloseTab={closeTab}
                onOpenDocument={openDocument}
                onTogglePinTab={(tabId, nextPinned) => setTabPinned(tabId, nextPinned)}
                onCloseOtherTabs={closeOtherTabs}
                onCloseTabsToRight={closeTabsToRight}
                onReorderTabs={reorderTabs}
                recentlyClosedTabs={normalizedRecentlyClosedTabs}
                onRestoreClosedTab={restoreClosedTab}
            />
            ) : null}

            <div
                className={`grid ${contentGridClass} gap-[16px] p-[16px] ${
                    focusModeEnabled ? 'h-[calc(100vh-72px)]' : 'h-[calc(100vh-132px)]'
                }`}
            >
                {!focusModeEnabled && thumbnailSidebarEnabled ? (
                    <PdfThumbnailSidebar
                        hasDocument={Boolean(documentState.documentName)}
                        mode={navigationMode}
                        thumbnails={thumbnails}
                        outline={outline}
                        annotations={displayAnnotations}
                        selectedAnnotationKey={selectedAnnotationKey}
                        currentPage={viewerState.currentPage}
                        recentFiles={normalizedRecentFiles}
                        readingProgressMap={normalizedReadingProgressMap}
                        onModeChange={changeNavigationMode}
                        onOpenRecent={(path) => openDocumentByPath(path, { removeIfUnreadable: true })}
                        onSelectPage={(pageNumber) => viewerRef.current?.goToPage(pageNumber)}
                        onSelectOutlineItem={(outlineItem) => viewerRef.current?.goToOutlineItem?.(outlineItem)}
                        onSelectAnnotation={(annotation) => {
                            updateSelectedAnnotation(annotation.annotationKey);
                            void focusAnnotation(annotation);
                        }}
                    />
                ) : null}

                <section
                    className={`relative min-h-0 overflow-hidden bg-content1 shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${
                        focusModeEnabled ? 'rounded-[34px]' : 'rounded-[28px]'
                    }`}
                >
                    {dropState.active ? (
                        <div className='absolute inset-0 z-30 flex items-center justify-center bg-white/35 dark:bg-black/30 backdrop-blur-md'>
                            <div className='mx-[24px] w-full max-w-[420px] rounded-[32px] border border-primary/15 bg-white/90 dark:bg-content1/95 px-[24px] py-[24px] text-center shadow-2xl'>
                                <div className='mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-[24px] bg-primary/10 text-primary'>
                                    <AiOutlineFilePdf className='text-[30px]' />
                                </div>
                                <div className='mt-[16px] text-[24px] font-semibold tracking-[-0.02em] text-foreground'>
                                    {t('pdf.drop_overlay_title')}
                                </div>
                                <p className='mt-[8px] text-sm leading-[1.7] text-default-500'>
                                    {dropState.name
                                        ? t('pdf.drop_overlay_description_with_name', { name: dropState.name })
                                        : t('pdf.drop_overlay_description')}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {focusModeEnabled && documentState.documentName ? (
                        <div className='absolute right-[18px] top-[18px] z-20'>
                            <div className='flex items-center gap-[10px] rounded-full border border-black/5 bg-white/88 dark:bg-content1/92 px-[12px] py-[8px] shadow-lg backdrop-blur'>
                                <span className='text-sm font-medium text-foreground whitespace-nowrap'>
                                    {t('pdf.focus_mode_active')}
                                </span>
                                <Button
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={() => toggleFocusMode(false)}
                                >
                                    {t('pdf.focus_mode_exit')}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {interactionMode === 'highlight' && documentState.documentName ? (
                        <div className='absolute left-1/2 top-[18px] z-20 -translate-x-1/2'>
                            <div className='flex items-center gap-[12px] rounded-full border border-warning-200 bg-white/90 dark:bg-content1/95 px-[14px] py-[8px] shadow-lg backdrop-blur'>
                                <MdHighlightAlt className='text-[18px] text-warning-600 dark:text-warning-300' />
                                <span className='text-sm font-medium text-foreground whitespace-nowrap'>
                                    {t('pdf.highlight_banner')}
                                </span>
                                <Button
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={() => changeInteractionMode('translate')}
                                >
                                    {t('pdf.highlight_banner_exit')}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {!documentState.documentName ? (
                        <div className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-[32px]'>
                            <div className='pointer-events-auto w-full max-w-[560px] rounded-[32px] border border-black/5 bg-white/90 dark:bg-content1/95 px-[28px] py-[28px] text-center shadow-2xl backdrop-blur-xl dark:border-white/10'>
                                <div className='mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-[22px] bg-primary/10 text-primary'>
                                    <AiOutlineFilePdf className='text-[30px]' />
                                </div>
                                <h2 className='mt-[16px] text-[28px] font-semibold tracking-[-0.02em] text-foreground'>
                                    {t('pdf.empty_state_title')}
                                </h2>
                                <p className='mt-[10px] text-sm leading-[1.7] text-default-500'>
                                    {t('pdf.empty_state_description')}
                                </p>
                                <p className='mt-[10px] text-xs tracking-[0.06em] uppercase text-default-400'>
                                    {t('pdf.empty_state_drop_hint')}
                                </p>
                                <div className='mt-[18px] flex items-center justify-center gap-[10px]'>
                                    <Button
                                        color='primary'
                                        radius='full'
                                        startContent={<AiOutlineFilePdf className='text-[18px]' />}
                                        onPress={openDocument}
                                    >
                                        {t('pdf.open')}
                                    </Button>
                                    {normalizedRecentFiles.length > 0 ? (
                                        <div className='flex items-center gap-[8px] text-sm text-default-500'>
                                            <LuHistory className='text-[16px]' />
                                            {t('pdf.recent_files_quick_open')}
                                        </div>
                                    ) : null}
                                </div>
                                {normalizedRecentFiles.length > 0 ? (
                                    <div className='mt-[18px] grid gap-[10px] text-left'>
                                        {normalizedRecentFiles.slice(0, 4).map((file) => (
                                            <button
                                                key={file.path}
                                                type='button'
                                                className='rounded-[20px] border border-default-100 bg-default-50/70 px-[16px] py-[12px] transition hover:bg-default-100/80'
                                                onClick={() => openDocumentByPath(file.path, { removeIfUnreadable: true })}
                                            >
                                                <div className='flex items-center justify-between gap-[8px]'>
                                                    <div className='text-sm font-medium text-foreground truncate'>{file.name}</div>
                                                    {normalizedReadingProgressMap[file.path]?.pageNumber ? (
                                                        <div className='shrink-0 rounded-full bg-default-100 px-[8px] py-[3px] text-[11px] text-default-500'>
                                                            {t('pdf.resume_page', {
                                                                page: normalizedReadingProgressMap[file.path].pageNumber,
                                                            })}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className='mt-[4px] text-xs text-default-400 line-clamp-2 break-all'>
                                                    {file.path}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <div className={`h-full ${focusModeEnabled ? 'p-[20px]' : 'p-[14px]'}`}>
                        {compareTargetTab ? (
                            <div className='grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[14px]'>
                                <div className='min-h-0 flex flex-col rounded-[24px] border border-default-100 bg-content1/80 p-[10px]'>
                                    <div className='mb-[10px] flex items-center justify-between gap-[10px] rounded-[18px] bg-default-50/80 px-[12px] py-[10px]'>
                                        <div className='min-w-0'>
                                            <div className='text-sm font-medium text-foreground truncate'>
                                                {documentState.documentName || t('pdf.tab_untitled')}
                                            </div>
                                            <div className='mt-[4px] text-xs text-default-500'>
                                                {t('pdf.compare_page_summary', {
                                                    page: viewerState.currentPage || 0,
                                                    total: viewerState.pageCount || 0,
                                                })}
                                            </div>
                                        </div>
                                        <Chip
                                            size='sm'
                                            radius='full'
                                            color='primary'
                                            variant='flat'
                                        >
                                            {t('pdf.compare_primary')}
                                        </Chip>
                                    </div>
                                    <div className='min-h-0 flex-1'>
                                        <PdfViewerPane {...primaryViewerPaneProps} />
                                    </div>
                                </div>
                                <PdfComparePane
                                    viewerRef={compareViewerRef}
                                    documentName={
                                        compareTargetTab.documentState?.documentName ||
                                        compareTargetTab.source?.name ||
                                        t('pdf.tab_untitled')
                                    }
                                    viewerState={compareViewerState}
                                    onPreviousPage={() => compareViewerRef.current?.previousPage()}
                                    onNextPage={() => compareViewerRef.current?.nextPage()}
                                    onFitWidth={() => compareViewerRef.current?.fitWidth()}
                                    onClose={() => setCompareDocument('')}
                                    syncPages={compareSyncPages}
                                    onToggleSyncPages={toggleCompareSyncPages}
                                    onSwapDocuments={swapCompareDocuments}
                                    onScrollStateChange={(nextScrollState) => {
                                        if (syncingPrimaryScrollRef.current) {
                                            syncingPrimaryScrollRef.current = false;
                                            return;
                                        }
                                        syncPrimaryViewerToCompare(nextScrollState);
                                    }}
                                    onViewerStateChange={(nextViewerState) => {
                                        setCompareViewerState(nextViewerState);
                                        updateActiveTabState((tab) => ({
                                            ...tab,
                                            compareViewerState: nextViewerState,
                                        }));
                                    }}
                                    onError={(error) => toast.error(error?.message || error?.toString() || t('pdf.load_error'))}
                                />
                            </div>
                        ) : translationCompareActive ? (
                            <div className='grid h-full grid-cols-[minmax(0,1fr)_minmax(340px,0.92fr)] gap-[14px]'>
                                <div className='min-h-0 flex flex-col rounded-[24px] border border-default-100 bg-content1/80 p-[10px]'>
                                    <div className='mb-[10px] flex items-center justify-between gap-[10px] rounded-[18px] bg-default-50/80 px-[12px] py-[10px]'>
                                        <div className='min-w-0'>
                                            <div className='text-sm font-medium text-foreground truncate'>
                                                {documentState.documentName || t('pdf.tab_untitled')}
                                            </div>
                                            <div className='mt-[4px] text-xs text-default-500'>
                                                {t('pdf.compare_page_summary', {
                                                    page: viewerState.currentPage || 0,
                                                    total: viewerState.pageCount || 0,
                                                })}
                                            </div>
                                        </div>
                                        <Chip
                                            size='sm'
                                            radius='full'
                                            color='primary'
                                            variant='flat'
                                        >
                                            {t('pdf.compare_primary')}
                                        </Chip>
                                    </div>
                                    <div className='min-h-0 flex-1'>
                                        <PdfViewerPane {...primaryViewerPaneProps} />
                                    </div>
                                </div>

                                <PdfTranslationComparePane
                                    documentName={documentState.documentName}
                                    documentPath={documentState.currentPath}
                                    currentPage={viewerState.currentPage}
                                    sourceText={translationCompareState.sourceText || selectionText}
                                    translationText={translationCompareState.resultText}
                                    serviceLabel={translationCompareState.serviceLabel}
                                    isLoading={translationCompareState.isLoading}
                                    error={translationCompareState.error}
                                    onClose={clearCompareMode}
                                />
                            </div>
                        ) : (
                            <PdfViewerPane {...primaryViewerPaneProps} />
                        )}
                        {errorMessage ? <p className='text-danger text-sm mt-[8px]'>{errorMessage}</p> : null}
                    </div>
                </section>

                {!focusModeEnabled ? (
                    <aside className='min-h-0 overflow-hidden rounded-[28px] bg-content1/95 px-[18px] py-[18px] shadow-sm ring-1 ring-black/5 dark:ring-white/10 backdrop-blur'>
                    {interactionMode === 'highlight' ? (
                        <PdfAnnotationSidebar
                            annotations={displayAnnotations}
                            documentName={documentState.documentName}
                            documentPath={documentState.currentPath}
                            dirty={documentState.dirty}
                            canSave={Boolean(documentState.documentName)}
                            canExport={displayAnnotations.length > 0}
                            highlightColor={normalizedHighlightColor}
                            selectedAnnotation={selectedAnnotation}
                            selectedAnnotationKey={selectedAnnotationKey}
                            onHighlightColorChange={setHighlightColor}
                            onSelectAnnotation={(annotation) => updateSelectedAnnotation(annotation.annotationKey)}
                            onFocusAnnotation={focusAnnotation}
                            onDeleteAnnotation={deleteAnnotation}
                            onAnnotationNoteChange={handleAnnotationNoteChange}
                            onExportExtracts={exportExtracts}
                            onExitHighlightMode={() => changeInteractionMode('translate')}
                            onSave={saveCurrentDocument}
                        />
                    ) : (
                        <PdfTranslateSidebar
                            documentPath={documentState.currentPath}
                            documentName={documentState.documentName}
                            currentPage={viewerState.currentPage}
                            sessionKey={activeTabId || 'empty'}
                            selectionText={selectionText}
                            autoTranslateSelection={shouldAutoTranslateSelection({
                                interactionMode,
                                autoTranslateSelection: autoTranslateSelectionEnabled,
                            })}
                            onAutoTranslateSelectionChange={setAutoTranslateSelection}
                            onRequestHighlightMode={() => changeInteractionMode('highlight')}
                            onTranslationCompareStateChange={(nextCompareState) => {
                                const normalizedCompareState = {
                                    ...createEmptyTranslationCompareState(),
                                    ...nextCompareState,
                                };
                                setTranslationCompareState(normalizedCompareState);
                                updateActiveTabState((tab) => ({
                                    ...tab,
                                    translationCompareState: normalizedCompareState,
                                }));
                            }}
                        />
                    )}
                    </aside>
                ) : null}
            </div>
        </div>
    );
}
