import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
    AnnotationMode,
    getDocument,
    GlobalWorkerOptions,
    TextLayer,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import { error as logError, info as logInfo } from 'tauri-plugin-log-api';
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import 'pdfjs-dist/legacy/web/pdf_viewer.css';

import { resolveOutlineItems } from '../utils/outline';
import { getSelectionTextFromViewer } from '../utils/selection';
import { createPdfSearchState } from '../utils/search';

const isTauriPdfRuntime = typeof window !== 'undefined' && Boolean(window.__TAURI_IPC__);
const DEFAULT_SCALE = 'page-width';
const PAGE_RENDER_TIMEOUT_MS = 1800;
const THUMBNAIL_WIDTH = 132;
const standardFontDataUrl = '/pdfjs-standard-fonts/';

GlobalWorkerOptions.workerSrc = workerSrc;

function logTauriPdf(message, details = null) {
    if (!isTauriPdfRuntime) {
        return;
    }

    const suffix =
        details && typeof details === 'object' && Object.keys(details).length > 0
            ? ` ${JSON.stringify(details)}`
            : details
              ? ` ${String(details)}`
              : '';

    void logInfo(`[tauri-pdf] ${message}${suffix}`);
}

function logTauriPdfError(message, error) {
    if (!isTauriPdfRuntime) {
        return;
    }

    void logError(`[tauri-pdf] ${message} ${error?.message || error?.toString?.() || String(error)}`);
}

function isRenderingCancelledError(error) {
    const message = error?.message || error?.toString?.() || '';
    return error?.name === 'RenderingCancelledException' || message.includes('Rendering cancelled');
}

function getNumericScale(scaleValue, baseWidth, containerWidth) {
    if (scaleValue === DEFAULT_SCALE || !scaleValue) {
        const safeWidth = Math.max(240, containerWidth - 24);
        return Math.max(0.25, safeWidth / Math.max(1, baseWidth));
    }

    const numericScale = Number(scaleValue);
    if (Number.isFinite(numericScale) && numericScale > 0) {
        return numericScale;
    }

    return 1;
}

function getThumbnailDataUrl(canvas) {
    if (!canvas?.width || !canvas?.height) {
        return '';
    }

    const scale = THUMBNAIL_WIDTH / canvas.width;
    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = THUMBNAIL_WIDTH;
    thumbnailCanvas.height = Math.max(1, Math.round(canvas.height * scale));
    const context = thumbnailCanvas.getContext('2d', { alpha: false });

    if (!context) {
        return '';
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
    context.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
    return thumbnailCanvas.toDataURL('image/png');
}

const TauriPdfViewerPane = forwardRef(function TauriPdfViewerPane(
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
    },
    ref
) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const pdfDocumentRef = useRef(null);
    const loadingTaskRef = useRef(null);
    const pageViewsRef = useRef([]);
    const renderGenerationRef = useRef(0);
    const trackSelectionRef = useRef(trackSelection);
    const currentPageRef = useRef(1);
    const scaleRef = useRef(1);
    const scaleValueRef = useRef(DEFAULT_SCALE);
    const outlineGenerationIdRef = useRef(0);
    const pendingRestoreViewStateRef = useRef(null);
    const selectionChangeCallbackRef = useRef(onSelectionTextChange);
    const scrollEmitterRef = useRef(() => {});
    const clearDocumentRef = useRef(async () => {});

    trackSelectionRef.current = trackSelection;
    selectionChangeCallbackRef.current = onSelectionTextChange;

    const emitSearchState = useCallback(
        (nextSearchState = null) => {
            onSearchStateChange?.(createPdfSearchState(nextSearchState));
        },
        [onSearchStateChange]
    );

    const clearDomSelection = useCallback(() => {
        window.getSelection()?.removeAllRanges();
        onSelectionTextChange?.('');
    }, [onSelectionTextChange]);

    const getPageView = useCallback((pageIndex) => pageViewsRef.current[pageIndex] ?? null, []);

    const emitViewerState = useCallback(() => {
        onViewerStateChange?.({
            currentPage: currentPageRef.current,
            pageCount: pdfDocumentRef.current?.numPages ?? 0,
            scale: scaleRef.current,
            scaleValue: scaleValueRef.current,
        });
    }, [onViewerStateChange]);

    const loadOutline = useCallback(
        async (pdfDocument) => {
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
        },
        [onOutlineChange]
    );

    const emitScrollState = useCallback(() => {
        const container = containerRef.current;
        const pdfDocument = pdfDocumentRef.current;
        if (!container || !pdfDocument || pageViewsRef.current.length === 0) {
            return;
        }

        const probeTop = container.scrollTop + 24;
        let pageNumber = 1;

        for (const pageView of pageViewsRef.current) {
            if ((pageView?.div?.offsetTop ?? 0) <= probeTop) {
                pageNumber = pageView.id;
            } else {
                break;
            }
        }

        currentPageRef.current = Math.max(1, Math.min(pdfDocument.numPages, pageNumber));

        const activePageView = getPageView(currentPageRef.current - 1);
        const activePageDiv = activePageView?.div;
        const activePageTop = activePageDiv?.offsetTop ?? 0;
        const activePageHeight = activePageDiv?.clientHeight ?? 0;
        const maxPageOffset = Math.max(0, activePageHeight - container.clientHeight);
        const pageOffset = Math.max(0, container.scrollTop - activePageTop);
        const pageProgress = maxPageOffset > 0 ? Math.min(1, pageOffset / maxPageOffset) : 0;
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const documentProgress = maxScrollTop > 0 ? Math.min(1, container.scrollTop / maxScrollTop) : 0;

        emitViewerState();
        onScrollStateChange?.({
            pageNumber: currentPageRef.current,
            pageProgress,
            documentProgress,
            scrollTop: container.scrollTop,
        });
    }, [emitViewerState, getPageView, onScrollStateChange]);
    scrollEmitterRef.current = emitScrollState;

    const clearCurrentDocument = useCallback(async () => {
        renderGenerationRef.current += 1;
        outlineGenerationIdRef.current += 1;
        pendingRestoreViewStateRef.current = null;
        pageViewsRef.current.forEach((pageView) => {
            pageView.textLayerTask?.cancel?.();
            pageView.canvas?.remove?.();
        });
        pageViewsRef.current = [];
        if (viewerRef.current) {
            viewerRef.current.innerHTML = '';
        }
        onThumbnailsChange?.([]);
        onAnnotationsChange?.([]);
        onOutlineChange?.([]);
        emitSearchState();

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

        currentPageRef.current = 1;
        scaleRef.current = 1;
        scaleValueRef.current = DEFAULT_SCALE;
        onDirtyChange?.(false);
        clearDomSelection();
        emitViewerState();
    }, [
        clearDomSelection,
        emitSearchState,
        emitViewerState,
        onAnnotationsChange,
        onDirtyChange,
        onOutlineChange,
        onThumbnailsChange,
    ]);
    clearDocumentRef.current = clearCurrentDocument;

    const renderDocument = useCallback(
        async (pdfDocument, viewState = null) => {
            const container = containerRef.current;
            const viewer = viewerRef.current;
            if (!container || !viewer || !pdfDocument) {
                return false;
            }

            const generationId = renderGenerationRef.current + 1;
            renderGenerationRef.current = generationId;
            logTauriPdf('render-document-start', {
                generationId,
                pageCount: pdfDocument.numPages,
                scaleValue: viewState?.scaleValue || DEFAULT_SCALE,
            });
            viewer.innerHTML = '';
            pageViewsRef.current.forEach((pageView) => pageView.textLayerTask?.cancel?.());
            pageViewsRef.current = [];

            const firstPage = await pdfDocument.getPage(1);
            if (renderGenerationRef.current !== generationId || pdfDocumentRef.current !== pdfDocument) {
                return false;
            }

            const firstBaseViewport = firstPage.getViewport({ scale: 1 });
            const nextScaleValue = viewState?.scaleValue || DEFAULT_SCALE;
            const nextScale = getNumericScale(nextScaleValue, firstBaseViewport.width, container.clientWidth || 0);
            scaleRef.current = nextScale;
            scaleValueRef.current = nextScaleValue;
            currentPageRef.current = Math.max(1, Math.min(pdfDocument.numPages, viewState?.pageNumber || 1));

            const thumbnailEntries = Array.from({ length: pdfDocument.numPages }, (_, index) => ({
                pageNumber: index + 1,
                dataUrl: '',
            }));
            onThumbnailsChange?.(thumbnailEntries);

            for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
                const page = pageNumber === 1 ? firstPage : await pdfDocument.getPage(pageNumber);
                if (renderGenerationRef.current !== generationId || pdfDocumentRef.current !== pdfDocument) {
                    return false;
                }
                logTauriPdf('render-page-start', { pageNumber });

                const viewport = page.getViewport({ scale: nextScale });
                const pageDiv = document.createElement('div');
                pageDiv.className = 'page';
                pageDiv.dataset.pageNumber = String(pageNumber);
                pageDiv.style.width = `${Math.ceil(viewport.width)}px`;
                pageDiv.style.height = `${Math.ceil(viewport.height)}px`;
                pageDiv.style.margin = '0 auto 16px';
                pageDiv.style.position = 'relative';
                pageDiv.style.backgroundColor = '#ffffff';

                const canvasWrapper = document.createElement('div');
                canvasWrapper.className = 'canvasWrapper';
                pageDiv.append(canvasWrapper);

                const canvas = document.createElement('canvas');
                canvas.setAttribute('role', 'presentation');
                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.contain = 'none';
                canvasWrapper.append(canvas);

                viewer.append(pageDiv);

                const canvasContext = canvas.getContext('2d', { alpha: false });
                if (!canvasContext) {
                    throw new Error('Unable to create PDF canvas context');
                }

                canvasContext.fillStyle = '#ffffff';
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);
                let canvasRendered = false;
                const renderTask = page.render({
                    canvasContext,
                    viewport,
                    annotationMode: AnnotationMode.DISABLE,
                    isOffscreenCanvasSupported: false,
                    isImageDecoderSupported: false,
                });
                const guardedRenderPromise = renderTask.promise.catch((error) => {
                    if (isRenderingCancelledError(error)) {
                        return 'cancelled';
                    }
                    throw error;
                });
                const renderOutcome = await Promise.race([
                    guardedRenderPromise.then((result) => (result === 'cancelled' ? 'cancelled' : 'rendered')),
                    new Promise((resolve) => {
                        window.setTimeout(() => resolve('timeout'), PAGE_RENDER_TIMEOUT_MS);
                    }),
                ]);

                if (renderOutcome === 'timeout') {
                    logTauriPdf('render-page-timeout', {
                        pageNumber,
                        timeoutMs: PAGE_RENDER_TIMEOUT_MS,
                    });
                    renderTask.cancel();
                    canvasWrapper.remove();
                } else if (renderOutcome === 'rendered') {
                    canvasRendered = true;
                    logTauriPdf('render-page-finished', {
                        pageNumber,
                        width: canvas.width,
                        height: canvas.height,
                    });
                }

                const textLayerDiv = document.createElement('div');
                textLayerDiv.className = 'textLayer';
                pageDiv.append(textLayerDiv);

                const textLayerTask = new TextLayer({
                    textContentSource: page.streamTextContent(),
                    container: textLayerDiv,
                    viewport,
                });
                await textLayerTask.render();
                const textSpanCount = textLayerDiv.querySelectorAll('span').length;
                logTauriPdf('text-layer-finished', {
                    pageNumber,
                    textSpanCount,
                    canvasRendered,
                });

                if (!canvasRendered && textSpanCount === 0) {
                    const placeholder = document.createElement('div');
                    placeholder.textContent = 'Preview unavailable in compatibility mode';
                    placeholder.style.position = 'absolute';
                    placeholder.style.inset = '0';
                    placeholder.style.display = 'flex';
                    placeholder.style.alignItems = 'center';
                    placeholder.style.justifyContent = 'center';
                    placeholder.style.padding = '24px';
                    placeholder.style.color = '#6b7280';
                    placeholder.style.fontSize = '14px';
                    placeholder.style.textAlign = 'center';
                    pageDiv.append(placeholder);
                }

                pageViewsRef.current.push({
                    id: pageNumber,
                    div: pageDiv,
                    canvas: canvasRendered ? canvas : null,
                    viewport,
                    pdfPage: page,
                    textLayerTask,
                });

                thumbnailEntries[pageNumber - 1] = {
                    pageNumber,
                    dataUrl: canvasRendered ? getThumbnailDataUrl(canvas) : '',
                };
                onThumbnailsChange?.([...thumbnailEntries]);
            }

            logTauriPdf('render-document-finished', {
                generationId,
                renderedPages: pageViewsRef.current.length,
            });
            window.requestAnimationFrame(() => {
                const targetPage = getPageView(currentPageRef.current - 1)?.div;
                targetPage?.scrollIntoView({ block: 'start', behavior: 'auto' });
                emitViewerState();
                emitScrollState();
            });

            return true;
        },
        [emitViewerState, emitScrollState, getPageView, onThumbnailsChange]
    );

    const openDocument = useCallback(
        async (source) => {
            logTauriPdf('open-document-start', {
                hasData: Boolean(source?.data?.length),
                hasUrl: Boolean(source?.url),
            });
            await clearCurrentDocument();
            pendingRestoreViewStateRef.current = source?.restoreViewState || null;

            const loadingTask = getDocument({
                ...source,
                disableFontFace: true,
                standardFontDataUrl,
                isOffscreenCanvasSupported: false,
                isImageDecoderSupported: false,
            });
            loadingTaskRef.current = loadingTask;

            try {
                const pdfDocument = await loadingTask.promise;
                if (loadingTaskRef.current !== loadingTask) {
                    return;
                }

                loadingTaskRef.current = null;
                pdfDocumentRef.current = pdfDocument;
                logTauriPdf('document-loaded', { pageCount: pdfDocument.numPages });
                onDirtyChange?.(false);
                emitViewerState();
                loadOutline(pdfDocument).catch(() => {
                    onOutlineChange?.([]);
                });
                await renderDocument(pdfDocument, pendingRestoreViewStateRef.current);
                pendingRestoreViewStateRef.current = null;
            } catch (error) {
                if (loadingTaskRef.current !== loadingTask) {
                    return;
                }
                loadingTaskRef.current = null;
                logTauriPdfError('open-document-error', error);
                onError?.(error instanceof Error ? error : new Error(String(error)));
            }
        },
        [clearCurrentDocument, emitViewerState, loadOutline, onDirtyChange, onError, onOutlineChange, renderDocument]
    );

    useEffect(() => {
        logTauriPdf('component-mounted');
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const handleSelectionChange = () => {
            if (!trackSelectionRef.current) {
                return;
            }
            selectionChangeCallbackRef.current?.(getSelectionTextFromViewer(window.getSelection(), containerRef.current));
        };

        const handleScroll = () => {
            scrollEmitterRef.current();
        };

        container.addEventListener('mouseup', handleSelectionChange);
        container.addEventListener('keyup', handleSelectionChange);
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            logTauriPdf('component-unmounted');
            container.removeEventListener('mouseup', handleSelectionChange);
            container.removeEventListener('keyup', handleSelectionChange);
            container.removeEventListener('scroll', handleScroll);
            void clearDocumentRef.current();
        };
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            openDocument,
            async saveDocument() {
                if (!pdfDocumentRef.current) {
                    return null;
                }
                return pdfDocumentRef.current.saveDocument();
            },
            setHighlightMode(enabled) {
                if (enabled) {
                    clearDomSelection();
                }
            },
            setHighlightColor() {
                // Highlight editing is not supported in the Tauri fallback renderer yet.
            },
            clearSelection: clearDomSelection,
            nextPage() {
                const targetPage = Math.min(pdfDocumentRef.current?.numPages || 1, currentPageRef.current + 1);
                const targetPageView = getPageView(targetPage - 1)?.div;
                targetPageView?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            },
            previousPage() {
                const targetPage = Math.max(1, currentPageRef.current - 1);
                const targetPageView = getPageView(targetPage - 1)?.div;
                targetPageView?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            },
            goToPage(pageNumber) {
                const targetPage = Math.max(1, Math.min(pdfDocumentRef.current?.numPages || 1, pageNumber || 1));
                currentPageRef.current = targetPage;
                const targetPageView = getPageView(targetPage - 1)?.div;
                targetPageView?.scrollIntoView({ block: 'start', behavior: 'auto' });
                emitViewerState();
            },
            zoomIn() {
                if (!pdfDocumentRef.current) {
                    return;
                }
                const nextScale = Number((scaleRef.current * 1.1).toFixed(2));
                void renderDocument(pdfDocumentRef.current, {
                    pageNumber: currentPageRef.current,
                    scaleValue: String(nextScale),
                });
            },
            zoomOut() {
                if (!pdfDocumentRef.current) {
                    return;
                }
                const nextScale = Number(Math.max(0.25, scaleRef.current / 1.1).toFixed(2));
                void renderDocument(pdfDocumentRef.current, {
                    pageNumber: currentPageRef.current,
                    scaleValue: String(nextScale),
                });
            },
            fitWidth() {
                if (!pdfDocumentRef.current) {
                    return;
                }
                void renderDocument(pdfDocumentRef.current, {
                    pageNumber: currentPageRef.current,
                    scaleValue: DEFAULT_SCALE,
                });
            },
            search(query) {
                emitSearchState({ query, status: 'idle' });
            },
            searchNext(query) {
                emitSearchState({ query, status: 'idle' });
            },
            searchPrevious(query) {
                emitSearchState({ query, status: 'idle' });
            },
            clearSearch() {
                emitSearchState();
            },
            async goToOutlineItem(outlineItem) {
                if (!outlineItem?.pageNumber) {
                    return false;
                }
                const targetPageView = getPageView(outlineItem.pageNumber - 1)?.div;
                targetPageView?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                return Boolean(targetPageView);
            },
            async focusAnnotation() {
                return false;
            },
            async deleteAnnotation() {
                return false;
            },
            async refreshAnnotations() {
                onAnnotationsChange?.([]);
            },
            async clearDocument() {
                await clearCurrentDocument();
            },
            getCurrentState() {
                return {
                    currentPage: currentPageRef.current,
                    pageCount: pdfDocumentRef.current?.numPages ?? 0,
                    scale: scaleRef.current,
                    scaleValue: scaleValueRef.current,
                };
            },
            restoreViewState(viewState) {
                if (!pdfDocumentRef.current) {
                    pendingRestoreViewStateRef.current = viewState || null;
                    return false;
                }

                void renderDocument(pdfDocumentRef.current, viewState || null);
                return true;
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
                const targetPageView = getPageView(targetPageNumber - 1)?.div;
                if (!targetPageView) {
                    return false;
                }

                const targetPageHeight = targetPageView.clientHeight || 0;
                const maxPageOffset = Math.max(0, targetPageHeight - container.clientHeight);
                const pageProgress = Math.min(1, Math.max(0, Number(scrollState.pageProgress) || 0));
                const targetScrollTop = Math.max(0, targetPageView.offsetTop + maxPageOffset * pageProgress);

                container.scrollTo({
                    top: targetScrollTop,
                    behavior: 'auto',
                });
                currentPageRef.current = targetPageNumber;
                emitViewerState();
                return true;
            },
        }),
        [
            clearCurrentDocument,
            clearDomSelection,
            emitSearchState,
            emitViewerState,
            getPageView,
            onAnnotationsChange,
            openDocument,
            renderDocument,
        ]
    );

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
                    style={{ minHeight: '100%', padding: '12px 0 16px' }}
                />
            </div>
        </div>
    );
});

export default TauriPdfViewerPane;
