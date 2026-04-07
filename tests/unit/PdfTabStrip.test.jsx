import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextUIProvider } from '@nextui-org/react';

import '../../src/i18n';
import PdfTabStrip from '../../src/window/Pdf/components/PdfTabStrip';

describe('PdfTabStrip', () => {
    it('renders tabs and triggers select/close callbacks', () => {
        const onSelectTab = vi.fn();
        const onCloseTab = vi.fn();

        render(
            <NextUIProvider>
                <PdfTabStrip
                    tabs={[
                        {
                            id: 'tab-1',
                            isPinned: true,
                            source: { name: 'Guide.pdf' },
                            documentState: { documentName: 'Guide.pdf', dirty: false },
                        },
                        {
                            id: 'tab-2',
                            source: { name: 'Notes.pdf' },
                            documentState: { documentName: 'Notes.pdf', dirty: true },
                        },
                    ]}
                    activeTabId='tab-2'
                    onSelectTab={onSelectTab}
                    onCloseTab={onCloseTab}
                    onTogglePinTab={vi.fn()}
                    onCloseOtherTabs={vi.fn()}
                    onCloseTabsToRight={vi.fn()}
                    onOpenDocument={vi.fn()}
                    recentlyClosedTabs={[
                        {
                            id: 'closed-1',
                            path: '/tmp/closed.pdf',
                            documentName: 'Closed.pdf',
                        },
                    ]}
                    onRestoreClosedTab={vi.fn()}
                />
            </NextUIProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: /Guide\.pdf/i }));
        expect(onSelectTab).toHaveBeenCalledWith('tab-1');

        fireEvent.click(screen.getAllByRole('button', { name: 'Close tab' })[0]);
        expect(onCloseTab).toHaveBeenCalledWith('tab-2');
        expect(screen.getAllByRole('button', { name: 'Tab actions' })).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Restore recently closed tab' })).toBeEnabled();
    });
});
