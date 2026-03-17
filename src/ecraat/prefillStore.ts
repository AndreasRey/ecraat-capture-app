/**
 * Module-level store for prefetched prefill data.
 * Keyed by orgUnitId so values stay correct when navigating between org units.
 */
type PrefillData = {
    orgUnitId: string;
    formValues: Record<string, string>;
};

let storedPrefillData: PrefillData | undefined;

export const setPrefillFormValues = (
    orgUnitId: string,
    formValues: Record<string, string> | undefined,
): void => {
    storedPrefillData = formValues ? { orgUnitId, formValues } : undefined;
};

export const getPrefillFormValues = (
    orgUnitId: string,
): Record<string, string> | undefined => {
    if (storedPrefillData?.orgUnitId === orgUnitId) {
        return storedPrefillData.formValues;
    }
    return undefined;
};
