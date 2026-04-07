import { useEffect } from 'react';
import { useAtom } from 'jotai';

import { useGetState } from './useGetState';

export const useSyncAtom = (atom) => {
    const [atomValue, setAtomValue] = useAtom(atom);
    const [localValue, setLocalValue, getLocalValue] = useGetState(atomValue);

    useEffect(() => {
        setLocalValue(atomValue);
    }, [atomValue, setLocalValue]);

    const syncAtom = () => setAtomValue(getLocalValue());

    return [localValue, setLocalValue, syncAtom];
};
