import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
    getDocument,
    GlobalWorkerOptions,
    AnnotationEditorParamsType,
    AnnotationEditorType,
    AnnotationMode,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import { EventBus, PDFFindController, PDFLinkService, PDFViewer } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import 'pdfjs-dist/legacy/web/pdf_viewer.css';

import { colorToHex, mergeHighlightAnnotations, normalizeAnnotationText } from '../utils/annotations';
import { resolveOutlineItems } from '../utils/outline';
import { getSelectionTextFromViewer } from '../utils/selection';
import { applyPdfSearchMatches, createPdfSearchState, mapPdfFindControlState } from '../utils/search';

GlobalWorkerOptions.workerSrc = workerSrc;

const DEFAULT_SCALE = 'page-width';
const THUMBNAIL_WIDTH = 132;

const PdfViewerPane = forwardRef(function PdfViewerPane(
    {
        onSelectionTextChange,
        onDirtyChange,
        onAnnotationsChange,
        onViewerStateChange,
        onScrollStateChange,
        onOutlineChange,
        onSearchStateChange,
        onError,
        onThumbnailsChange,
        trackSelection = true,
        highlightColor,
    },
    ref
) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const pdfViewerRef = useRef(null);
    const linkServiceRef = useRef(null);
    const eventBusRef = useRef(null);
    const findControllerRef = useRef(null);
    const loadingTaskRef = useRef(null);
    const pdfDocumentRef = useRef(null);
    const highlightEnabledRef = useRef(false);
    const annotationEditorReadyRef = useRef(false);
    const trackSelectionRef = useRef(trackSelection);
    const thumbnailGenerationIdRef = useRef(0);
    const uiManagerRef = useRef(null);
    const highlightColorRef = useRef(highlightColor);
    const annotationRefreshTokenRef = useRef(0);
    const annotationRefreshTimeoutRef = useRef(null);
    const pendingRestoreViewStateRef = useRef(null);
    const outlineGenerationIdRef = useRef(0);
    const searchStateRef = useRef(createPdfSearchState());
    const currentSearchQueryRef = useRef('');
    const suppressScrollSyncRef = useRef(false);

    trackSelectionRef.current = trackSelection;
    highlightColorRef.current = highlightColor;

    const clearDomSelection = () => {
        window.getSelection()?.removeAllRanges();
        onSelectionTextChange?.('');
    };

    const emitViewerState = () => {
        const pdfViewer = pdfViewerRef.current;
        const pdfDocument = pdfDocumentRef.current;

        onViewerStateChange?.({
            currentPage: pdfViewer?.currentPageNumber ?? 0,
            pageCount: pdfDocument?.numPages ?? 0,
            scale: pdfViewer?.currentScale ?? 1,
            scaleValue: pdfViewer?.currentScaleValue ?? DEFAULT_SCALE,
        });
    };

    const getPageView = useCallback((pageIndex) => pdfViewerRef.current?.getPageView?.(pageIndex) ?? null, []);

    const emitScrollState = useCallback(() => {
        if (suppressScrollSyncRef.current) {
            return;
        }

        const container = containerRef.current;
        const pdfDocument = pdfDocumentRef.current;
        const pdfViewer = pdfViewerRef.current;
        if (!container || !pdfDocument || !pdfViewer) {
            return;
        }

        const pageNumber = Math.max(1, Math.min(pdfDocument.numPages, pdfViewer.currentPageNumber || 1));
        const pageView = getPageView(pageNumber - 1);
        const pageDiv = pageView?.div;
        const pageTop = pageDiv?.offsetTop ?? 0;
        const pageHeight = pageDiv?.clientHeight ?? 0;
        const maxPageOffset = Math.max(0, pageHeight - container.clientHeight);
        const pageOffset = Math.max(0, container.scrollTop - pageTop);
        const pageProgress = maxPageOffset > 0 ? Math.min(1, pageOffset / maxPageOffset) : 0;
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const documentProgress = maxScrollTop > 0 ? Math.min(1, container.scrollTop / maxScrollTop) : 0;

        onScrollStateChange?.({
            pageNumber,
            pageProgress,
            documentProgress,
            scrollTop: container.scrollTop,
        });
    }, [getPageView, onScrollStateChange]);

    const emitSearchState = useCallback((nextSearchState) => {
        const normalizedState = createPdfSearchState(nextSearchState);
        searchStateRef.current = normalizedState;
        currentSearchQueryRef.current = normalizedState.query || '';
        onSearchStateChange?.(normalizedState);
    }, [onSearchStateChange]);

    const loadOutline = useCallback(async (pdfDocument) => {
        const generationId = outlineGenerationIdRef.current + 1;
        outlineGenerationIdRef.current = generationId;

        if (!pdfDocument) {
            onOutlineChange?.([]);
            return;
        }

        try {
            const rawOutline = await pdfDocument.getOutline();
            const resolvedOutline = await resolveOutlineItems(pdfDocument, rawOutline || []);
            if (outlineGenerationIdRef.current !== generationId || pdfDocumentRef.current !== pdfDocument) {
                return;
            }
            onOutlineChange?.(resolvedOutline);
        } catch {
            if (outlineGenerationIdRef.current !== generationId || pdfDocumentRef.current !== pdfDocument) {
                return;
            }
            onOutlineChange?.([]);
        }
    }, [onOutlineChange]);

    const bindModifiedCallbacks = (pdfDocument) => {
        if (!pdfDocument?.annotationStorage) {
            return;
        }
        pdfDocument.annotationStorage.onSetModified = () => {
            onDirtyChange?.(true);
            scheduleAnnotationRefresh();
        };
        pdfDocument.annotationStorage.onResetModified = () => {
            onDirtyChange?.(false);
            scheduleAnnotationRefresh();
        };
    };

    const applyHighlightColor = (color) => {
        highlightColorRef.current = color;
        uiManagerRef.current?.updateParams(AnnotationEditorParamsType.HIGHLIGHT_COLOR, color);
    };

    const getRelativeRect = useCallback((pageIndex, domRect) => {
        const pageRect = getPageView(pageIndex)?.div?.getBoundingClientRect?.();
        if (!pageRect || !domRect) {
            return null;
        }
        return {
            left: domRect.left - pageRect.left,
            top: domRect.top - pageRect.top,
            right: domRect.right - pageRect.left,
            bottom: domRect.bottom - pageRect.top,
        };
    }, [getPageView]);

    const extractTextFromRelativeRect = useCallback((pageIndex, relativeRect) => {
        if (!relativeRect) {
            return '';
        }

        const textLayer = getPageView(pageIndex)?.div?.querySelector?.('.textLayer');
        const pageRect = getPageView(pageIndex)?.div?.getBoundingClientRect?.();
        if (!textLayer || !pageRect) {
            return '';
        }

        const texts = Array.from(textLayer.querySelectorAll('span'))
            .map((span) => ({
                text: normalizeAnnotationText(span.textContent),
                rect: {
                    left: span.getBoundingClientRect().left - pageRect.left,
                    top: span.getBoundingClientRect().top - pageRect.top,
                    right: span.getBoundingClientRect().right - pageRect.left,
                    bottom: span.getBoundingClientRect().bottom - pageRect.top,
                },
            }))
            .filter(
                ({ text, rect }) =>
                    text &&
                    rect.right >= relativeRect.left &&
                    rect.left <= relativeRect.right &&
                    rect.bottom >= relativeRect.top &&
                    rect.top <= relativeRect.bottom
            )
            .map(({ text }) => text);

        return normalizeAnnotationText(texts.join(' '));
    }, [getPageView]);

    const getSavedAnnotationSnippet = useCallback((annotation) => {
        const pageView = getPageView(annotation.pageIndex);
        const viewport = pageView?.viewport;
        if (!viewport || !annotation.rect) {
            return '';
        }

        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(annotation.rect);
        return extractTextFromRelativeRect(annotation.pageIndex, {
            left: Math.min(x1, x2),
            top: Math.min(y1, y2),
            right: Math.max(x1, x2),
            bottom: Math.max(y1, y2),
        });
    }, [extractTextFromRelativeRect, getPageView]);

    const getEditorSnippet = useCallback((editor) => {
        const labelText = normalizeAnnotationText(editor?.div?.getAttribute?.('aria-label'));
        if (labelText) {
            return labelText;
        }

        const commentText = normalizeAnnotationText(editor?.comment?.text);
        if (commentText) {
            return commentText;
        }

        return extractTextFromRelativeRect(editor.pageIndex, getRelativeRect(editor.pageIndex, editor.getClientDimensions?.()));
    }, [extractTextFromRelativeRect, getRelativeRect]);

    const collectLiveAnnotations = useCallback(() => {
        const uiManager = uiManagerRef.current;
        const pdfDocument = pdfDocumentRef.current;
        if (!uiManager || !pdfDocument) {
            return [];
        }

        const items = [];
        for (let pageIndex = 0; pageIndex < pdfDocument.numPages; pageIndex += 1) {
            for (const editor of uiManager.getEditors(pageIndex)) {
                if (editor.editorType !== AnnotationEditorType.HIGHLIGHT) {
                    continue;
                }

                items.push({
                    id: editor.id,
                    annotationElementId: editor.annotationElementId ?? null,
                    pageIndex: editor.pageIndex,
                    pageNumber: editor.pageIndex + 1,
                    color: colorToHex(editor.color),
                    comment: normalizeAnnotationText(editor.comment?.text),
                    snippet: getEditorSnippet(editor),
                    persisted: Boolean(editor.annotationElementId),
                    sortTop: editor.getClientDimensions?.()?.top ?? null,
                });
            }
        }

        return items;
    }, [getEditorSnippet]);

    const refreshAnnotations = useCallback(async () => {
        const pdfDocument = pdfDocumentRef.current;
        if (!pdfDocument) {
            onAnnotationsChange?.([]);
            return;
        }

        const refreshToken = annotationRefreshTokenRef.current + 1;
        annotationRefreshTokenRef.current = refreshToken;

        const uiManager = uiManagerRef.current;
        let savedAnnotations = [];

        try {
            const rawSavedAnnotations = await pdfDocument.getAnnotationsByType(
                new Set([AnnotationEditorType.HIGHLIGHT]),
                new Set()
            );

            if (annotationRefreshTokenRef.current !== refreshToken || pdfDocumentRef.current !== pdfDocument) {
                return;
            }

            savedAnnotations = rawSavedAnnotations
                .filter((annotation) => !uiManager?.isDeletedAnnotationElement?.(annotation.id))
                .map((annotation) => ({
                    id: annotation.id,
                    annotationElementId: annotation.id,
                    pageIndex: annotation.pageIndex,
                    pageNumber: annotation.pageIndex + 1,
                    color: colorToHex(annotation.color),
                    comment: normalizeAnnotationText(annotation.contentsObj?.str),
                    snippet: getSavedAnnotationSnippet(annotation),
                    persisted: true,
                    sortTop: annotation.rect?.[3] ?? null,
                }));
        } catch {
            savedAnnotations = [];
        }

        const mergedAnnotations = mergeHighlightAnnotations({
            savedAnnotations,
            liveAnnotations: collectLiveAnnotations(),
        });

        if (annotationRefreshTokenRef.current !== refreshToken) {
            return;
        }

        onAnnotationsChange?.(mergedAnnotations);
    }, [collectLiveAnnotations, getSavedAnnotationSnippet, onAnnotationsChange]);

    const scheduleAnnotationRefresh = useCallback(() => {
        window.clearTimeout(annotationRefreshTimeoutRef.current);
        annotationRefreshTimeoutRef.current = window.setTimeout(() => {
            void refreshAnnotations();
        }, 80);
    }, [refreshAnnotations]);

    const clearCurrentDocument = async () => {
        annotationEditorReadyRef.current = false;
        uiManagerRef.current = null;
        pendingRestoreViewStateRef.current = null;
        thumbnailGenerationIdRef.current += 1;
        outlineGenerationIdRef.current += 1;
        onThumbnailsChange?.([]);
        onAnnotationsChange?.([]);
        onOutlineChange?.([]);
        emitSearchState(createPdfSearchState());
        if (pdfViewerRef.current) {
            pdfViewerRef.current.setDocument(null);
        }
        if (linkServiceRef.current) {
            linkServiceRef.current.setDocument(null);
        }
        if (loadingTaskRef.current) {
            try {
                await loadingTaskRef.current.destroy();
            } catch {
                // noop
            }
            loadingTaskRef.current = null;
        }
        if (pdfDocumentRef.current) {
            try {
                await pdfDocumentRef.current.destroy();
            } catch {
                // noop
            }
            pdfDocumentRef.current = null;
        }
        onDirtyChange?.(false);
        clearDomSelection();
        emitViewerState();
    };

    const applyHighlightMode = (enabled) => {
        highlightEnabledRef.current = enabled;
        if (enabled) {
            clearDomSelection();
        }
        if (pdfViewerRef.current && annotationEditorReadyRef.current) {
            pdfViewerRef.current.annotationEditorMode = {
                mode: enabled ? AnnotationEditorType.HIGHLIGHT : AnnotationEditorType.NONE,
            };
        }
    };

    const generateThumbnails = async (pdfDocument, generationId) => {
        const placeholders = Array.from({ length: pdfDocument.numPages }, (_, index) => ({
            pageNumber: index + 1,
            dataUrl: '',
        }));
        onThumbnailsChange?.(placeholders);

        const results = [...placeholders];
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
            if (thumbnailGenerationIdRef.current !== generationId || pdfDocumentRef.current !== pdfDocument) {
                return;
            }
            const page = await pdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1 });
            const scale = THUMBNAIL_WIDTH / viewport.width;
            const scaledViewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { alpha: false });
            canvas.width = Math.ceil(scaledViewport.width);
            canvas.height = Math.ceil(scaledViewport.height);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
            results[pageNumber - 1] = {
                pageNumber,
                dataUrl: canvas.toDataURL('image/png'),
            };
            onThumbnailsChange?.([...results]);
        }
    };

    const applyRestoreViewState = useCallback((viewState) => {
        if (!viewState || !pdfViewerRef.current || !pdfDocumentRef.current) {
            return false;
        }

        const safePageNumber = Math.max(1, Math.min(pdfDocumentRef.current.numPages, viewState.pageNumber || 1));
        const scaleValue = viewState.scaleValue || DEFAULT_SCALE;

        pdfViewerRef.current.currentScaleValue = scaleValue;
        pdfViewerRef.current.currentPageNumber = safePageNumber;
        emitViewerState();
        return true;
    }, []);

    const loadSource = async (source) => {
        await clearCurrentDocument();
        pendingRestoreViewStateRef.current = source?.restoreViewState || null;

        const loadingTask = getDocument(source);
        loadingTaskRef.current = loadingTask;

        try {
            const pdfDocument = await loadingTask.promise;
            if (loadingTaskRef.current !== loadingTask) {
                return;
            }
            loadingTaskRef.current = null;
            pdfDocumentRef.current = pdfDocument;
            bindModifiedCallbacks(pdfDocument);
            pdfViewerRef.current.setDocument(pdfDocument);
            linkServiceRef.current.setDocument(pdfDocument, null);
            pdfViewerRef.current.currentScaleValue = DEFAULT_SCALE;
            emitViewerState();
            const generationId = thumbnailGenerationIdRef.current + 1;
            thumbnailGenerationIdRef.current = generationId;
            generateThumbnails(pdfDocument, generationId).catch(() => {
                // noop
            });
            loadOutline(pdfDocument).catch(() => {
                onOutlineChange?.([]);
            });
            scheduleAnnotationRefresh();
        } catch (error) {
            const message = error?.message || error?.toString() || '';
            if (loadingTaskRef.current !== loadingTask || /worker was destroyed/i.test(message)) {
                return;
            }
            loadingTaskRef.current = null;
            onError?.(error);
        }
    };

    useEffect(() => {
        const eventBus = new EventBus();
        const linkService = new PDFLinkService({ eventBus });
        const findController = new PDFFindController({ linkService, eventBus });
        const pdfViewer = new PDFViewer({
            container: containerRef.current,
            viewer: viewerRef.current,
            eventBus,
            linkService,
            findController,
            textLayerMode: 1,
            annotationMode: AnnotationMode.ENABLE_STORAGE,
            annotationEditorMode: AnnotationEditorType.NONE,
        });

        linkService.setViewer(pdfViewer);

        eventBus.on('pagesinit', () => {
            const restored = applyRestoreViewState(pendingRestoreViewStateRef.current);
            pendingRestoreViewStateRef.current = null;
            if (!restored) {
                pdfViewer.currentScaleValue = DEFAULT_SCALE;
                emitViewerState();
            }
        });
        eventBus.on('annotationeditoruimanager', ({ uiManager }) => {
            uiManagerRef.current = uiManager;
            annotationEditorReadyRef.current = true;
            applyHighlightColor(highlightColorRef.current);
            applyHighlightMode(highlightEnabledRef.current);
            scheduleAnnotationRefresh();
        });
        eventBus.on('annotationeditorlayerrendered', scheduleAnnotationRefresh);
        eventBus.on('annotationeditorparamschanged', scheduleAnnotationRefresh);
        eventBus.on('pagechanging', emitViewerState);
        eventBus.on('scalechanging', emitViewerState);
        eventBus.on('pagechanging', emitScrollState);
        eventBus.on('updatefindmatchescount', ({ matchesCount }) => {
            emitSearchState(applyPdfSearchMatches(searchStateRef.current, matchesCount));
        });
        eventBus.on('updatefindcontrolstate', (payload) => {
            emitSearchState(mapPdfFindControlState(payload, searchStateRef.current));
        });

        pdfViewerRef.current = pdfViewer;
        linkServiceRef.current = linkService;
        eventBusRef.current = eventBus;
        findControllerRef.current = findController;

        const handleSelectionChange = () => {
            if (!trackSelectionRef.current) {
                return;
            }
            onSelectionTextChange?.(getSelectionTextFromViewer(window.getSelection(), containerRef.current));
        };

        containerRef.current?.addEventListener('mouseup', handleSelectionChange);
        containerRef.current?.addEventListener('keyup', handleSelectionChange);
        containerRef.current?.addEventListener('click', scheduleAnnotationRefresh);
        containerRef.current?.addEventListener('pointerup', scheduleAnnotationRefresh);
        containerRef.current?.addEventListener('scroll', emitScrollState, { passive: true });

        return () => {
            containerRef.current?.removeEventListener('mouseup', handleSelectionChange);
            containerRef.current?.removeEventListener('keyup', handleSelectionChange);
            containerRef.current?.removeEventListener('click', scheduleAnnotationRefresh);
            containerRef.current?.removeEventListener('pointerup', scheduleAnnotationRefresh);
            containerRef.current?.removeEventListener('scroll', emitScrollState);
            window.clearTimeout(annotationRefreshTimeoutRef.current);
            clearCurrentDocument();
            eventBusRef.current = null;
            findControllerRef.current = null;
        };
    }, [applyRestoreViewState, emitScrollState, emitSearchState, scheduleAnnotationRefresh]);

    useEffect(() => {
        applyHighlightColor(highlightColor);
    }, [highlightColor]);

    const dispatchSearch = useCallback((query, options = {}) => {
        const eventBus = eventBusRef.current;
        const normalizedQuery = String(query ?? currentSearchQueryRef.current ?? '').trim();

        if (!eventBus) {
            return;
        }

        if (!normalizedQuery) {
            eventBus.dispatch('findbarclose', { source: pdfViewerRef.current });
            emitSearchState(createPdfSearchState());
            return;
        }

        const nextSearchState = createPdfSearchState({
            ...searchStateRef.current,
            query: normalizedQuery,
            status: options.type === 'again' ? searchStateRef.current.status : 'pending',
            pending: options.type !== 'again',
        });
        emitSearchState(nextSearchState);

        eventBus.dispatch('find', {
            source: pdfViewerRef.current,
            type: options.type,
            query: normalizedQuery,
            phraseSearch: true,
            caseSensitive: Boolean(options.caseSensitive),
            entireWord: Boolean(options.entireWord),
            highlightAll: options.highlightAll ?? true,
            findPrevious: Boolean(options.findPrevious),
            matchDiacritics: Boolean(options.matchDiacritics),
        });
    }, [emitSearchState]);

    useImperativeHandle(ref, () => ({
        openDocument: loadSource,
        async saveDocument() {
            if (!pdfDocumentRef.current) {
                return null;
            }
            return pdfDocumentRef.current.saveDocument();
        },
        setHighlightMode: applyHighlightMode,
        setHighlightColor: applyHighlightColor,
        clearSelection: clearDomSelection,
        nextPage() {
            if (pdfViewerRef.current && pdfDocumentRef.current) {
                pdfViewerRef.current.currentPageNumber = Math.min(
                    pdfDocumentRef.current.numPages,
                    pdfViewerRef.current.currentPageNumber + 1
                );
                emitViewerState();
            }
        },
        previousPage() {
            if (pdfViewerRef.current) {
                pdfViewerRef.current.currentPageNumber = Math.max(1, pdfViewerRef.current.currentPageNumber - 1);
                emitViewerState();
            }
        },
        goToPage(pageNumber) {
            if (pdfViewerRef.current && pdfDocumentRef.current) {
                const safePageNumber = Math.max(1, Math.min(pdfDocumentRef.current.numPages, pageNumber || 1));
                pdfViewerRef.current.currentPageNumber = safePageNumber;
                emitViewerState();
            }
        },
        zoomIn() {
            if (pdfViewerRef.current) {
                pdfViewerRef.current.increaseScale({ steps: 1 });
                emitViewerState();
            }
        },
        zoomOut() {
            if (pdfViewerRef.current) {
                pdfViewerRef.current.decreaseScale({ steps: 1 });
                emitViewerState();
            }
        },
        fitWidth() {
            if (pdfViewerRef.current) {
                pdfViewerRef.current.currentScaleValue = DEFAULT_SCALE;
                emitViewerState();
            }
        },
        search(query, options = {}) {
            dispatchSearch(query, options);
        },
        searchNext(query) {
            dispatchSearch(query, { type: 'again', findPrevious: false });
        },
        searchPrevious(query) {
            dispatchSearch(query, { type: 'again', findPrevious: true });
        },
        clearSearch() {
            dispatchSearch('', {});
        },
        async goToOutlineItem(outlineItem) {
            if (!outlineItem) {
                return false;
            }
            if (outlineItem.dest) {
                await linkServiceRef.current?.goToDestination?.(outlineItem.dest);
                emitViewerState();
                return true;
            }
            if (outlineItem.pageNumber) {
                pdfViewerRef.current?.scrollPageIntoView?.({ pageNumber: outlineItem.pageNumber });
                pdfViewerRef.current.currentPageNumber = outlineItem.pageNumber;
                emitViewerState();
                return true;
            }
            if (outlineItem.url) {
                window.open(outlineItem.url, '_blank', 'noopener,noreferrer');
                return true;
            }
            return false;
        },
        async focusAnnotation(annotation) {
            const uiManager = uiManagerRef.current;
            if (!uiManager || !annotation) {
                return false;
            }

            await uiManager.updateMode?.(AnnotationEditorType.HIGHLIGHT);

            const pageNumber = annotation.pageNumber || annotation.pageIndex + 1;
            pdfViewerRef.current?.scrollPageIntoView?.({ pageNumber });
            if (pdfViewerRef.current) {
                pdfViewerRef.current.currentPageNumber = pageNumber;
                emitViewerState();
            }

            await uiManager.waitForEditorsRendered?.(pageNumber);

            let editor = uiManager.getEditor?.(annotation.id);
            if (!editor) {
                for (const candidate of uiManager.getEditors(annotation.pageIndex)) {
                    if (
                        candidate.annotationElementId === annotation.annotationElementId ||
                        candidate.annotationElementId === annotation.id
                    ) {
                        editor = candidate;
                        break;
                    }
                }
            }

            if (!editor) {
                return false;
            }

            uiManager.unselectAll?.();
            uiManager.setSelected?.(editor);
            editor.div?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
            editor.div?.focus?.();
            scheduleAnnotationRefresh();
            return true;
        },
        async deleteAnnotation(annotation) {
            const uiManager = uiManagerRef.current;
            if (!uiManager || !annotation) {
                return false;
            }

            await uiManager.updateMode?.(AnnotationEditorType.HIGHLIGHT);

            const pageNumber = annotation.pageNumber || annotation.pageIndex + 1;
            pdfViewerRef.current?.scrollPageIntoView?.({ pageNumber });
            if (pdfViewerRef.current) {
                pdfViewerRef.current.currentPageNumber = pageNumber;
                emitViewerState();
            }

            await uiManager.waitForEditorsRendered?.(pageNumber);

            let editor = uiManager.getEditor?.(annotation.id);
            if (!editor) {
                for (const candidate of uiManager.getEditors(annotation.pageIndex)) {
                    if (
                        candidate.annotationElementId === annotation.annotationElementId ||
                        candidate.annotationElementId === annotation.id
                    ) {
                        editor = candidate;
                        break;
                    }
                }
            }

            if (!editor) {
                return false;
            }

            uiManager.unselectAll?.();
            uiManager.setSelected?.(editor);
            if (editor.annotationElementId) {
                uiManager.addDeletedAnnotationElement?.(editor);
            }
            editor.remove?.();
            scheduleAnnotationRefresh();
            return true;
        },
        async refreshAnnotations() {
            await refreshAnnotations();
        },
        async clearDocument() {
            await clearCurrentDocument();
        },
        getCurrentState() {
            return {
                currentPage: pdfViewerRef.current?.currentPageNumber ?? 0,
                pageCount: pdfDocumentRef.current?.numPages ?? 0,
                scale: pdfViewerRef.current?.currentScale ?? 1,
                scaleValue: pdfViewerRef.current?.currentScaleValue ?? DEFAULT_SCALE,
            };
        },
        restoreViewState(viewState) {
            return applyRestoreViewState(viewState);
        },
        applyScrollSyncState(scrollState) {
            const container = containerRef.current;
            const pdfDocument = pdfDocumentRef.current;
            if (!container || !pdfDocument || !scrollState) {
                return false;
            }

            const targetPageNumber = Math.max(
                1,
                Math.min(pdfDocument.numPages, Number(scrollState.pageNumber) || 1)
            );
            const targetPageView = getPageView(targetPageNumber - 1);
            const targetPageDiv = targetPageView?.div;

            if (!targetPageDiv) {
                pdfViewerRef.current.currentPageNumber = targetPageNumber;
                emitViewerState();
                return false;
            }

            const targetPageHeight = targetPageDiv.clientHeight || 0;
            const maxPageOffset = Math.max(0, targetPageHeight - container.clientHeight);
            const pageProgress = Math.min(1, Math.max(0, Number(scrollState.pageProgress) || 0));
            const targetScrollTop = Math.max(0, targetPageDiv.offsetTop + maxPageOffset * pageProgress);

            suppressScrollSyncRef.current = true;
            container.scrollTo({
                top: targetScrollTop,
                behavior: 'auto',
            });
            if (pdfViewerRef.current) {
                pdfViewerRef.current.currentPageNumber = targetPageNumber;
                emitViewerState();
            }

            window.requestAnimationFrame(() => {
                suppressScrollSyncRef.current = false;
                emitScrollState();
            });
            return true;
        },
    }), [applyRestoreViewState, dispatchSearch, emitScrollState, getPageView, loadSource, refreshAnnotations, scheduleAnnotationRefresh]);

    return (
        <div
            style={{
                position: 'relative',
                height: '100%',
                overflow: 'hidden',
                borderRadius: 18,
                background: '#f5f5f7',
            }}
        >
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'auto',
                }}
                data-testid='pdf-scroll-container'
            >
                <div
                    ref={viewerRef}
                    className='pdfViewer'
                    data-testid='pdf-viewer'
                    style={{ minHeight: '100%' }}
                />
            </div>
        </div>
    );
});

export default PdfViewerPane;
