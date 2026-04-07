import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextUIProvider } from '@nextui-org/react';

import '../../src/i18n';
import PdfToolbar from '../../src/window/Pdf/components/PdfToolbar';

describe('PdfToolbar', () => {
    it('triggers focus mode toggle from the toolbar', () => {
        const onToggleFocusMode = vi.fn();

        render(
            <NextUIProvider>
                <PdfToolbar
                    documentName='Paper.pdf'
                    dirty={false}
                    currentPage={3}
                    pageCount={12}
                    scale={1}
                    interactionMode='translate'
                    focusMode={false}
                    thumbnailSidebarVisible
                    recentFiles={[]}
                    searchQuery=''
                    searchCurrent={0}
                    searchTotal={0}
                    searchStatus='idle'
                    onOpen={vi.fn()}
                    onOpenRecent={vi.fn()}
                    onClearRecentFiles={vi.fn()}
                    onSave={vi.fn()}
                    onSaveAs={vi.fn()}
                    onPreviousPage={vi.fn()}
                    onNextPage={vi.fn()}
                    onPageSubmit={vi.fn()}
                    onZoomIn={vi.fn()}
                    onZoomOut={vi.fn()}
                    onFitWidth={vi.fn()}
                    onChangeMode={vi.fn()}
                    onToggleFocusMode={onToggleFocusMode}
                    onToggleThumbnailSidebar={vi.fn()}
                    onSearchChange={vi.fn()}
                    onSearchNext={vi.fn()}
                    onSearchPrevious={vi.fn()}
                    onSearchClear={vi.fn()}
                />
            </NextUIProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Focus' }));
        expect(onToggleFocusMode).toHaveBeenCalled();
    });

    it('offers the dedicated original and translation compare mode', async () => {
        render(
            <NextUIProvider>
                <PdfToolbar
                    documentName='Paper.pdf'
                    dirty={false}
                    currentPage={3}
                    pageCount={12}
                    scale={1}
                    interactionMode='translate'
                    focusMode={false}
                    compareMode=''
                    compareCandidates={[]}
                    compareSyncPages
                    thumbnailSidebarVisible
                    recentFiles={[]}
                    searchQuery=''
                    searchCurrent={0}
                    searchTotal={0}
                    searchStatus='idle'
                    onOpen={vi.fn()}
                    onOpenRecent={vi.fn()}
                    onClearRecentFiles={vi.fn()}
                    onSave={vi.fn()}
                    onSaveAs={vi.fn()}
                    onPreviousPage={vi.fn()}
                    onNextPage={vi.fn()}
                    onPageSubmit={vi.fn()}
                    onZoomIn={vi.fn()}
                    onZoomOut={vi.fn()}
                    onFitWidth={vi.fn()}
                    onChangeMode={vi.fn()}
                    onToggleFocusMode={vi.fn()}
                    onSelectTranslationCompare={vi.fn()}
                    onSelectCompareDocument={vi.fn()}
                    onClearCompareDocument={vi.fn()}
                    onToggleThumbnailSidebar={vi.fn()}
                    onSearchChange={vi.fn()}
                    onSearchNext={vi.fn()}
                    onSearchPrevious={vi.fn()}
                    onSearchClear={vi.fn()}
                />
            </NextUIProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
        expect(await screen.findByRole('menuitem', { name: 'Original / Translation' })).toBeInTheDocument();
    });
});
