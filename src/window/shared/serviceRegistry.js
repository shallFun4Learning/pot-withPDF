import { readDir, BaseDirectory, readTextFile, exists } from '@tauri-apps/api/fs';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/tauri';

export const SERVICE_TYPE_LIST = ['translate', 'tts', 'recognize', 'collection'];

export async function loadPluginList() {
    const temp = {};

    for (const serviceType of SERVICE_TYPE_LIST) {
        temp[serviceType] = {};

        if (!(await exists(`plugins/${serviceType}`, { dir: BaseDirectory.AppConfig }))) {
            continue;
        }

        const plugins = await readDir(`plugins/${serviceType}`, { dir: BaseDirectory.AppConfig });
        for (const plugin of plugins) {
            const infoStr = await readTextFile(`plugins/${serviceType}/${plugin.name}/info.json`, {
                dir: BaseDirectory.AppConfig,
            });
            const pluginInfo = JSON.parse(infoStr);
            if ('icon' in pluginInfo) {
                const appConfigDirPath = await appConfigDir();
                const iconPath = await join(
                    appConfigDirPath,
                    `/plugins/${serviceType}/${plugin.name}/${pluginInfo.icon}`
                );
                pluginInfo.icon = convertFileSrc(iconPath);
            }
            temp[serviceType][plugin.name] = pluginInfo;
        }
    }

    return temp;
}

export async function loadServiceInstanceConfigMap({
    store,
    translateServiceInstanceList = [],
    recognizeServiceInstanceList = [],
    ttsServiceInstanceList = [],
    collectionServiceInstanceList = [],
}) {
    const config = {};
    const serviceLists = [
        translateServiceInstanceList,
        recognizeServiceInstanceList,
        ttsServiceInstanceList,
        collectionServiceInstanceList,
    ];

    for (const serviceList of serviceLists) {
        for (const serviceInstanceKey of serviceList ?? []) {
            config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
        }
    }

    return config;
}
