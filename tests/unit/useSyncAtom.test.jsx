import React from 'react';
import { atom, useAtom } from 'jotai';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { useSyncAtom } from '../../src/hooks/useSyncAtom';

const testAtom = atom('alpha');

function SyncAtomProbe() {
    const [value, setValue, syncValue] = useSyncAtom(testAtom);
    const [, setAtomValue] = useAtom(testAtom);

    return (
        <div>
            <input
                aria-label='sync-value'
                value={value}
                onChange={(event) => setValue(event.target.value)}
            />
            <button onClick={() => syncValue()}>sync</button>
            <button onClick={() => setAtomValue('external')}>external</button>
        </div>
    );
}

describe('useSyncAtom', () => {
    it('keeps the local state in sync when the backing atom changes elsewhere', () => {
        render(<SyncAtomProbe />);

        expect(screen.getByLabelText('sync-value')).toHaveValue('alpha');

        fireEvent.change(screen.getByLabelText('sync-value'), {
            target: { value: 'local-edit' },
        });
        expect(screen.getByLabelText('sync-value')).toHaveValue('local-edit');

        fireEvent.click(screen.getByText('external'));
        expect(screen.getByLabelText('sync-value')).toHaveValue('external');
    });
});
