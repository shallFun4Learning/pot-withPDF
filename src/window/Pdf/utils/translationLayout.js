export function splitPrimaryTranslationServices(services = []) {
    const normalizedServices = Array.isArray(services) ? services : [];
    return {
        primaryService: normalizedServices[0] || null,
        secondaryServices: normalizedServices.slice(1).map((instanceKey, index) => ({
            instanceKey,
            index: index + 1,
        })),
    };
}
