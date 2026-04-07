import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextUIProvider } from '@nextui-org/react';

import '../../src/i18n';
import PdfAnnotationSidebar from '../../src/window/Pdf/components/PdfAnnotationSidebar';
import { PDF_HIGHLIGHT_PRESETS } from '../../src/window/Pdf/utils/highlightPalette';

const writeTextMock = vi.fn();

vi.mock('@tauri-apps/api/clipboard', () => ({
    writeText: (...args) => writeTextMock(...args),
}));

const annotations = [
    {
        id: 'one',
        annotationElementId: 'one',
        pageNumber: 1,
        color: PDF_HIGHLIGHT_PRESETS[0].value,
        snippet: 'Apple style highlight',
        comment: 'Warm note',
    },
    {
        id: 'two',
        annotationElementId: 'two',
        pageNumber: 2,
        color: PDF_HIGHLIGHT_PRESETS[2].value,
        snippet: 'Translation sidebar',
        comment: 'Cool note',
    },
];

function renderSidebar() {
    return render(
        <NextUIProvider>
            <PdfAnnotationSidebar
                annotations={annotations}
                dirty={false}
                canSave
                highlightColor={PDF_HIGHLIGHT_PRESETS[0].value}
                onHighlightColorChange={vi.fn()}
                onFocusAnnotation={vi.fn()}
                onDeleteAnnotation={vi.fn()}
                onExitHighlightMode={vi.fn()}
                onSave={vi.fn()}
            />
        </NextUIProvider>
    );
}

describe('PdfAnnotationSidebar', () => {
    it('filters highlights by search text', () => {
        renderSidebar();

        fireEvent.change(screen.getByPlaceholderText('Search highlights'), {
            target: { value: 'translation' },
        });

        expect(screen.getByText('Translation sidebar')).toBeInTheDocument();
        expect(screen.queryByText('Apple style highlight')).not.toBeInTheDocument();
    });

    it('filters highlights by color chips and can reset filters', () => {
        renderSidebar();

        fireEvent.click(screen.getByTestId('pdf-annotation-filter-blue'));
        expect(screen.getByText('Translation sidebar')).toBeInTheDocument();
        expect(screen.queryByText('Apple style highlight')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(screen.getByText('Apple style highlight')).toBeInTheDocument();
        expect(screen.getByText('Translation sidebar')).toBeInTheDocument();
    });


    it('edits reader notes for the selected annotation', () => {
        const onAnnotationNoteChange = vi.fn();

        render(
            <NextUIProvider>
                <PdfAnnotationSidebar
                    annotations={annotations.map((annotation) => ({
                        ...annotation,
                        annotationKey: annotation.id,
                    }))}
                    selectedAnnotation={{
                        ...annotations[0],
                        annotationKey: annotations[0].id,
                        readerNote: 'Warm note',
                    }}
                    selectedAnnotationKey='one'
                    dirty={false}
                    canSave
                    highlightColor={PDF_HIGHLIGHT_PRESETS[0].value}
                    onHighlightColorChange={vi.fn()}
                    onSelectAnnotation={vi.fn()}
                    onFocusAnnotation={vi.fn()}
                    onDeleteAnnotation={vi.fn()}
                    onAnnotationNoteChange={onAnnotationNoteChange}
                    onExitHighlightMode={vi.fn()}
                    onSave={vi.fn()}
                />
            </NextUIProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('Add your own takeaway, translation cue, or follow-up thought…'), {
            target: { value: 'Updated note' },
        });

        expect(onAnnotationNoteChange).toHaveBeenCalledWith(
            expect.objectContaining({ annotationKey: 'one' }),
            'Updated note'
        );
    });


    it('exports extracts from the highlight workspace', () => {
        const onExportExtracts = vi.fn();

        render(
            <NextUIProvider>
                <PdfAnnotationSidebar
                    annotations={annotations.map((annotation) => ({
                        ...annotation,
                        annotationKey: annotation.id,
                    }))}
                    dirty={false}
                    canSave
                    canExport
                    highlightColor={PDF_HIGHLIGHT_PRESETS[0].value}
                    onHighlightColorChange={vi.fn()}
                    onSelectAnnotation={vi.fn()}
                    onFocusAnnotation={vi.fn()}
                    onDeleteAnnotation={vi.fn()}
                    onAnnotationNoteChange={vi.fn()}
                    onExportExtracts={onExportExtracts}
                    onExitHighlightMode={vi.fn()}
                    onSave={vi.fn()}
                />
            </NextUIProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Export extracts' }));
        expect(onExportExtracts).toHaveBeenCalled();
    });

    it('copies a citation with page metadata from the highlight list card', () => {
        writeTextMock.mockResolvedValue(undefined);

        renderSidebar();

        fireEvent.click(screen.getAllByRole('button', { name: 'Copy citation with page' })[0]);

        expect(writeTextMock).toHaveBeenCalledWith('“Apple style highlight”\n— Document, p. 1');
    });
});
