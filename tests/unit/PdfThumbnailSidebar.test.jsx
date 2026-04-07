import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextUIProvider } from '@nextui-org/react';

import '../../src/i18n';
import PdfThumbnailSidebar from '../../src/window/Pdf/components/PdfThumbnailSidebar';

describe('PdfThumbnailSidebar', () => {
    it('shows recent files and reading progress when no document thumbnails are present', () => {
        const onOpenRecent = vi.fn();

        render(
            <NextUIProvider>
                <PdfThumbnailSidebar
                    thumbnails={[]}
                    currentPage={0}
                    recentFiles={[
                        {
                            path: '/tmp/guide.pdf',
                            name: 'guide.pdf',
                            lastOpenedAt: Date.now(),
                        },
                    ]}
                    readingProgressMap={{
                        '/tmp/guide.pdf': {
                            pageNumber: 7,
                            scaleValue: 'page-width',
                            updatedAt: Date.now(),
                        },
                    }}
                    onOpenRecent={onOpenRecent}
                    onSelectPage={vi.fn()}
                />
            </NextUIProvider>
        );

        expect(screen.getAllByText('Recent PDFs').length).toBeGreaterThan(0);
        expect(screen.getByText('guide.pdf')).toBeInTheDocument();
        expect(screen.getByText('Page 7')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /guide\.pdf/i }));
        expect(onOpenRecent).toHaveBeenCalledWith('/tmp/guide.pdf');
    });


    it('shows outline and extracts modes for an opened document', () => {
        const onModeChange = vi.fn();
        const onSelectOutlineItem = vi.fn();
        const onSelectAnnotation = vi.fn();

        const { rerender } = render(
            <NextUIProvider>
                <PdfThumbnailSidebar
                    hasDocument
                    mode='outline'
                    thumbnails={[{ pageNumber: 1, dataUrl: '' }]}
                    currentPage={1}
                    outline={[
                        {
                            id: 'outline-1',
                            title: 'Methods',
                            pageNumber: 4,
                            items: [],
                        },
                    ]}
                    annotations={[
                        {
                            annotationKey: 'a1',
                            pageNumber: 4,
                            color: '#ffe066',
                            snippet: 'Important passage',
                            displayNote: 'Remember this',
                        },
                    ]}
                    selectedAnnotationKey='a1'
                    onModeChange={onModeChange}
                    onSelectPage={vi.fn()}
                    onSelectOutlineItem={onSelectOutlineItem}
                    onSelectAnnotation={onSelectAnnotation}
                />
            </NextUIProvider>
        );

        expect(screen.getByText('Document Outline')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Methods'));
        expect(onSelectOutlineItem).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'outline-1', pageNumber: 4 })
        );
        fireEvent.click(screen.getByTestId('pdf-navigation-extracts'));
        expect(onModeChange).toHaveBeenCalledWith('extracts');

        rerender(
            <NextUIProvider>
                <PdfThumbnailSidebar
                    hasDocument
                    mode='extracts'
                    thumbnails={[{ pageNumber: 1, dataUrl: '' }]}
                    currentPage={1}
                    outline={[]}
                    annotations={[
                        {
                            annotationKey: 'a1',
                            pageNumber: 4,
                            color: '#ffe066',
                            snippet: 'Important passage',
                            displayNote: 'Remember this',
                        },
                    ]}
                    selectedAnnotationKey='a1'
                    onModeChange={onModeChange}
                    onSelectPage={vi.fn()}
                    onSelectOutlineItem={onSelectOutlineItem}
                    onSelectAnnotation={onSelectAnnotation}
                />
            </NextUIProvider>
        );

        expect(screen.getByRole('heading', { name: 'Extracts' })).toBeInTheDocument();
        fireEvent.click(screen.getByText('Important passage'));
        expect(onSelectAnnotation).toHaveBeenCalledWith(
            expect.objectContaining({ annotationKey: 'a1', pageNumber: 4 })
        );
    });
});
