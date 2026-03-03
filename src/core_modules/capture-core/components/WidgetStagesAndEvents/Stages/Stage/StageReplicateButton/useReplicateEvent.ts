import { useCallback, useState } from 'react';
import { useDataEngine } from '@dhis2/app-runtime';
import { useDispatch } from 'react-redux';
import type { ApiEnrollmentEvent } from 'capture-core-utils/types/api-types';
import { generateUID } from '../../../../../utils/uid/generateUID';
import {
    addPersistedEnrollmentEvents,
} from '../../../../Pages/common/EnrollmentOverviewDomain/enrollment.actions';

type ReplicateStatus =
    | { type: 'no-completed'; message: string }
    | { type: 'active-exists'; message: string }
    | { type: 'ready'; sourceEvent: ApiEnrollmentEvent; minDate: string }
    | null;

/**
 * Analyse the events for a given stage and determine whether replication is possible.
 * If possible, returns the source event (most-recent completed) and the minimum allowed date.
 */
export const getReplicateStatus = (
    events: Array<ApiEnrollmentEvent>,
): ReplicateStatus => {
    const completedEvents = events.filter(e => e.status === 'COMPLETED' && !e.deleted);

    if (completedEvents.length === 0) {
        return {
            type: 'no-completed',
            message:
                'There is no completed event to be replicated to this program stage, ' +
                'please fill and complete a blank form to enable replication',
        };
    }

    const activeEvents = events.filter(e => e.status === 'ACTIVE' && !e.deleted);
    if (activeEvents.length > 0) {
        return {
            type: 'active-exists',
            message:
                'There is already an "active" (non completed) event attached to the ' +
                'current program stage, please complete it or delete it before running ' +
                'the form replication',
        };
    }

    // Most-recent completed event by occurredAt (report date)
    const sorted = [...completedEvents].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    const sourceEvent = sorted[0];

    return {
        type: 'ready',
        sourceEvent,
        minDate: sourceEvent.occurredAt.slice(0, 10), // YYYY-MM-DD
    };
};

/**
 * Hook that handles the actual API call to replicate an event.
 * Returns `{ replicate, loading, error }`.
 */
export const useReplicateEvent = () => {
    const dataEngine = useDataEngine();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const replicate = useCallback(
        async (sourceEvent: ApiEnrollmentEvent, newDate: string) => {
            setLoading(true);
            setError(null);

            const newEventId = generateUID();
            const now = new Date().toISOString();

            const newEvent: Record<string, unknown> = {
                event: newEventId,
                program: sourceEvent.program,
                programStage: sourceEvent.programStage,
                orgUnit: sourceEvent.orgUnit,
                trackedEntity: sourceEvent.trackedEntity,
                enrollment: sourceEvent.enrollment,
                status: 'ACTIVE',
                occurredAt: newDate,
                scheduledAt: newDate,
                updatedAt: now,
                dataValues: sourceEvent.dataValues.map(dv => ({
                    dataElement: dv.dataElement,
                    value: dv.value,
                })),
            };

            try {
                await dataEngine.mutate({
                    resource: 'tracker?async=false',
                    type: 'create',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data: () => ({ events: [newEvent] }),
                } as Parameters<typeof dataEngine.mutate>[0]);

                // Add the new event to the redux store so the UI refreshes
                dispatch(addPersistedEnrollmentEvents({ events: [newEvent] }));
                setLoading(false);
                return true;
            } catch (e: unknown) {
                const err = e as Record<string, unknown>;
                const details = err?.details as Record<string, unknown> | undefined;
                const valReport = details?.validationReport as Record<string, unknown> | undefined;
                const errorReports = valReport?.errorReports as Array<{ message: string }> | undefined;
                const msg = errorReports?.length
                    ? errorReports.map(r => r.message).join(' ')
                    : (err?.message as string) || 'An error occurred while replicating the event';
                setError(msg);
                setLoading(false);
                return false;
            }
        },
        [dataEngine, dispatch],
    );

    return { replicate, loading, error };
};
