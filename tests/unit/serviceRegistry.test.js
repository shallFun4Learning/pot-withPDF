import { describe, expect, it } from 'vitest';

import { loadServiceInstanceConfigMap } from '../../src/window/shared/serviceRegistry';

describe('loadServiceInstanceConfigMap', () => {
    it('loads all configured service instances from the provided store', async () => {
        const store = {
            async get(key) {
                return { key };
            },
        };

        const result = await loadServiceInstanceConfigMap({
            store,
            translateServiceInstanceList: ['google'],
            recognizeServiceInstanceList: ['system'],
            ttsServiceInstanceList: ['lingva_tts'],
            collectionServiceInstanceList: ['anki'],
        });

        expect(result).toEqual({
            google: { key: 'google' },
            system: { key: 'system' },
            lingva_tts: { key: 'lingva_tts' },
            anki: { key: 'anki' },
        });
    });
});
