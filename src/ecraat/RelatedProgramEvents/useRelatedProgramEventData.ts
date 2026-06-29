import { useMemo } from 'react';
import log from 'loglevel';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useApiDataQuery } from 'capture-core/utils/reactQueryHelpers/query/useApiDataQuery';
// eslint-disable-next-line import/no-extraneous-dependencies
import { convertClientToList, convertServerToClient } from 'capture-core/converters';
// eslint-disable-next-line import/no-extraneous-dependencies
import { dataElementTypes } from 'capture-core/metaData';

type ApiOption = { code: string; displayName: string };
type ApiDataElement = {
    id: string;
    formName?: string;
    displayName: string;
    valueType: string;
    optionSet?: { options?: Array<ApiOption> };
};
type ApiProgramStageDataElement = { displayInReports: boolean; dataElement: ApiDataElement };
type ProgramMetaResponse = {
    id: string;
    displayName: string;
    programStages?: Array<{ id: string; displayName: string; programStageDataElements?: Array<ApiProgramStageDataElement> }>;
};

type ApiEvent = {
    event: string;
    occurredAt?: string;
    status?: string;
    orgUnit?: string;
    dataValues?: Array<{ dataElement: string; value: string }>;
};
type EventsResponse = { instances?: Array<ApiEvent>; events?: Array<ApiEvent> };

export type RelatedColumn = {
    id: string;
    header: string;
    valueType: string;
    options?: Array<ApiOption>;
};
export type RelatedRow = {
    id: string;
    orgUnit?: string;
    occurredAt: string;
    status?: string;
    values: Record<string, string>;
};

const isKnownType = (valueType: string): valueType is keyof typeof dataElementTypes =>
    Object.prototype.hasOwnProperty.call(dataElementTypes, valueType);

const formatValue = (rawValue: string | undefined, column: RelatedColumn): string => {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return '';
    }

    // Resolve option set codes to their display names (supports multi-text comma lists)
    if (column.options && column.options.length > 0) {
        const labelByCode = new Map(column.options.map(({ code, displayName }) => [code, displayName]));
        return String(rawValue)
            .split(',')
            .map(code => labelByCode.get(code.trim()) ?? code.trim())
            .join(', ');
    }

    const type = isKnownType(column.valueType) ? column.valueType : dataElementTypes.TEXT;
    try {
        const clientValue = convertServerToClient(rawValue, type);
        const listValue = convertClientToList(clientValue, type);
        if (typeof listValue === 'string' || typeof listValue === 'number') {
            return String(listValue);
        }
        // Non-primitive (e.g. React element for images/coordinates) — fall back to raw value
        return String(rawValue);
    } catch (error) {
        log.warn('RelatedProgramEvents: could not format value', { rawValue, column, error });
        return String(rawValue);
    }
};

const formatDate = (rawValue: string | undefined): string => {
    if (!rawValue) return '';
    try {
        const clientValue = convertServerToClient(rawValue, dataElementTypes.DATE);
        const listValue = convertClientToList(clientValue, dataElementTypes.DATE);
        return typeof listValue === 'string' ? listValue : String(rawValue);
    } catch (error) {
        return String(rawValue);
    }
};

/**
 * Fetches a separate event program's stage metadata (to know which data elements
 * are shown "in reports") and its events for the given org unit, then formats them
 * for a read-only table. Both queries are disabled until programId and orgUnitId
 * are available.
 */
export const useRelatedProgramEventData = (programId: string, orgUnitId: string | undefined) => {
    const shouldFetch = !!programId && !!orgUnitId;

    const { data: programData, isLoading: programLoading } = useApiDataQuery<ProgramMetaResponse>(
        ['ecraat-related-program-meta', programId],
        programId
            ? {
                resource: 'programs',
                id: programId,
                params: {
                    fields: 'id,displayName,programStages[id,displayName,programStageDataElements'
                        + '[displayInReports,dataElement[id,formName,displayName,valueType,'
                        + 'optionSet[options[code,displayName]]]]]',
                },
            }
            : undefined,
        { enabled: !!programId, staleTime: Infinity },
    );

    const { data: eventsData, isLoading: eventsLoading } = useApiDataQuery<EventsResponse>(
        ['ecraat-related-program-events', programId, orgUnitId ?? ''],
        shouldFetch
            ? {
                resource: 'tracker/events',
                params: {
                    program: programId,
                    orgUnit: orgUnitId ?? '',
                    order: 'occurredAt:desc',
                    fields: 'event,occurredAt,status,orgUnit,dataValues[dataElement,value]',
                    pageSize: 50,
                },
            }
            : undefined,
        { enabled: shouldFetch, staleTime: 5 * 60 * 1000 },
    );

    const title = programData?.displayName;

    const columns = useMemo<Array<RelatedColumn>>(() => {
        const stage = programData?.programStages?.[0];
        if (!stage?.programStageDataElements) return [];
        return stage.programStageDataElements
            .filter(psde => psde.displayInReports && psde.dataElement)
            .map(({ dataElement }) => ({
                id: dataElement.id,
                header: dataElement.formName || dataElement.displayName,
                valueType: dataElement.valueType,
                options: dataElement.optionSet?.options,
            }));
    }, [programData]);

    const rows = useMemo<Array<RelatedRow>>(() => {
        const events = eventsData?.instances ?? eventsData?.events ?? [];
        return events.map((event) => {
            const valueByDataElement = new Map(
                (event.dataValues ?? []).map(({ dataElement, value }) => [dataElement, value]),
            );
            const values: Record<string, string> = {};
            columns.forEach((column) => {
                values[column.id] = formatValue(valueByDataElement.get(column.id), column);
            });
            return {
                id: event.event,
                orgUnit: event.orgUnit,
                occurredAt: formatDate(event.occurredAt),
                status: event.status,
                values,
            };
        });
    }, [eventsData, columns]);

    return {
        title,
        columns,
        rows,
        isLoading: (!!programId && programLoading) || (shouldFetch && eventsLoading),
    };
};
