import { useEffect } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useApiDataQuery } from 'capture-core/utils/reactQueryHelpers/query/useApiDataQuery';
import { ecraatConfig } from './ecraat-config';
import { setPrefillFormValues } from './prefillStore';

type EventDataValue = { dataElement: string; value: string };
type PrefillApiResponse = {
    instances?: Array<{ dataValues: Array<EventDataValue> }>;
    events?: Array<{ dataValues: Array<EventDataValue> }>;
};

/**
 * Fetches the most recent completed event for the current org unit from the configured source
 * event program. Call this hook on the Enrollment page — it keeps `isPrefillLoading: true`
 * until the data is ready so callers can delay rendering the Stages & Events widget.
 *
 * Fetched values are stored in prefillStore and read synchronously when the new event form opens.
 */
export const usePrefillOnEnrollmentPage = (orgUnitId: string | undefined): { isPrefillLoading: boolean } => {
    const { prefillFromEventProgram } = ecraatConfig;
    const shouldFetch = !!prefillFromEventProgram && !!orgUnitId;

    const { data, isLoading } = useApiDataQuery<PrefillApiResponse>(
        ['ecraat-prefill', orgUnitId ?? ''],
        shouldFetch ? {
            resource: 'tracker/events',
            params: {
                program: prefillFromEventProgram?.sourceProgram ?? '',
                programStage: prefillFromEventProgram?.sourceStage ?? '',
                orgUnit: orgUnitId ?? '',
                order: 'occurredAt:desc',
                status: 'COMPLETED',
                pageSize: 1,
                fields: 'dataValues[dataElement,value]',
            },
        } : undefined,
        {
            enabled: shouldFetch,
            staleTime: Infinity,
        },
    );

    useEffect(() => {
        if (!shouldFetch || isLoading || !orgUnitId) return;

        // Tracker API returns { instances: [...] } or { events: [...] } depending on version
        const events = data?.instances ?? data?.events ?? [];

        if (events.length > 0) {
            const formValues: Record<string, string> = {};
            (events[0].dataValues ?? []).forEach(({ dataElement, value }) => {
                formValues[dataElement] = value;
            });
            setPrefillFormValues(orgUnitId, formValues);
        } else {
            setPrefillFormValues(orgUnitId, undefined);
        }
    }, [data, isLoading, shouldFetch, orgUnitId]);

    if (!shouldFetch) return { isPrefillLoading: false };
    return { isPrefillLoading: isLoading };
};

