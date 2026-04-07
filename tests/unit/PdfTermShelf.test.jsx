import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextUIProvider } from '@nextui-org/react';

import '../../src/i18n';
import PdfTermShelf from '../../src/window/Pdf/components/PdfTermShelf';

describe('PdfTermShelf', () => {
    it('shows an empty state and lets the user add the current selection', () => {
        const onAddSelection = vi.fn();

        render(
            <NextUIProvider>
                <PdfTermShelf
                    selectionText='latent variable'
                    terms={[]}
                    selectionTerm={null}
                    onAddSelection={onAddSelection}
                    onUseTerm={vi.fn()}
                    onUpdateTerm={vi.fn()}
                    onDeleteTerm={vi.fn()}
                />
            </NextUIProvider>
        );

        expect(screen.getByText('No saved terms yet')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('pdf-add-selection-to-terms'));
        expect(onAddSelection).toHaveBeenCalled();
    });

    it('lets the reader edit, reuse, and delete a saved term', () => {
        const onUseTerm = vi.fn();
        const onUpdateTerm = vi.fn();
        const onDeleteTerm = vi.fn();

        render(
            <NextUIProvider>
                <PdfTermShelf
                    selectionText='embodiment'
                    terms={[
                        {
                            id: 'term-1',
                            sourceText: 'embodiment',
                            preferredTranslation: '具身化',
                            note: 'Common in HCI papers.',
                            createdAt: 100,
                            updatedAt: 200,
                        },
                    ]}
                    selectionTerm={{
                        id: 'term-1',
                        sourceText: 'embodiment',
                        preferredTranslation: '具身化',
                        note: 'Common in HCI papers.',
                        createdAt: 100,
                        updatedAt: 200,
                    }}
                    onAddSelection={vi.fn()}
                    onUseTerm={onUseTerm}
                    onUpdateTerm={onUpdateTerm}
                    onDeleteTerm={onDeleteTerm}
                />
            </NextUIProvider>
        );

        fireEvent.change(screen.getByLabelText('Preferred translation'), {
            target: { value: '具身' },
        });
        expect(onUpdateTerm).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'term-1' }),
            expect.objectContaining({ preferredTranslation: '具身' })
        );

        fireEvent.change(screen.getByLabelText('Term note'), {
            target: { value: 'Use the shorter wording in notes.' },
        });
        expect(onUpdateTerm).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'term-1' }),
            expect.objectContaining({ note: 'Use the shorter wording in notes.' })
        );

        fireEvent.click(screen.getByRole('button', { name: 'Use for translation' }));
        expect(onUseTerm).toHaveBeenCalledWith(expect.objectContaining({ id: 'term-1' }));

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onDeleteTerm).toHaveBeenCalledWith(expect.objectContaining({ id: 'term-1' }));
    });
});
