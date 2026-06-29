import React, { useState, useCallback } from 'react';
import { css } from '@emotion/css';
import i18n from '@dhis2/d2-i18n';
import {
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    CircularLoader,
    spacersNum,
    colors,
} from '@dhis2/ui';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Widget } from 'capture-core/components/Widget';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useNavigate, buildUrlQueryString } from 'capture-core/utils/routing';
import { useRelatedProgramEventData } from './useRelatedProgramEventData';

const contentClass = css`
    margin-bottom: ${spacersNum.dp16}px;
`;
const stateContainerClass = css`
    display: flex;
    align-items: center;
    gap: ${spacersNum.dp8}px;
    padding: ${spacersNum.dp16}px;
    color: ${colors.grey700};
    font-size: 14px;
`;
const clickableRowClass = css`
    cursor: pointer;
`;

type Props = {
    programId: string;
    /** Org unit used to query the program's events (e.g. a fixed country-level org unit) */
    orgUnitId: string | undefined;
    /**
     * Org unit used as navigation context when opening the read-only viewer, so the
     * viewer's "back to list" returns to the org unit the user came from (the enrollment's)
     * rather than the event's own org unit.
     */
    navigationOrgUnitId: string | undefined;
    /**
     * Program used as navigation context in the read-only viewer, so "back to list"
     * returns to the original (tracker) program rather than the viewed event's program.
     */
    navigationProgramId: string | undefined;
};

export const RelatedProgramEventCard = ({
    programId,
    orgUnitId,
    navigationOrgUnitId,
    navigationProgramId,
}: Props) => {
    const [open, setOpen] = useState(true);
    const { navigate } = useNavigate();
    const { title, columns, rows, isLoading } = useRelatedProgramEventData(programId, orgUnitId);

    const onRowClick = useCallback((eventId: string, eventOrgUnit?: string) => {
        const orgUnitContext = navigationOrgUnitId ?? eventOrgUnit;
        navigate(`/viewEvent?${buildUrlQueryString({
            viewEventId: eventId,
            orgUnitId: orgUnitContext,
            programId: navigationProgramId,
        })}`);
    }, [navigate, navigationOrgUnitId, navigationProgramId]);

    const header = title || i18n.t('Related events');

    const renderBody = () => {
        if (isLoading) {
            return (
                <div className={stateContainerClass} data-test="related-events-loading">
                    <CircularLoader small />
                    {i18n.t('Loading events…')}
                </div>
            );
        }

        if (!orgUnitId) {
            return (
                <div className={stateContainerClass}>
                    {i18n.t('No organisation unit selected.')}
                </div>
            );
        }

        if (rows.length === 0) {
            return (
                <div className={stateContainerClass} data-test="related-events-empty">
                    {i18n.t('No events recorded for this organisation unit.')}
                </div>
            );
        }

        return (
            <DataTable dataTest="related-events-table">
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>{i18n.t('Date')}</DataTableColumnHeader>
                        <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                        {columns.map(column => (
                            <DataTableColumnHeader key={column.id}>{column.header}</DataTableColumnHeader>
                        ))}
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {rows.map((row) => {
                        const onClick = () => onRowClick(row.id, row.orgUnit);
                        return (
                            <DataTableRow key={row.id} dataTest="related-events-row">
                                <DataTableCell className={clickableRowClass} onClick={onClick}>
                                    {row.occurredAt}
                                </DataTableCell>
                                <DataTableCell className={clickableRowClass} onClick={onClick}>
                                    {row.status}
                                </DataTableCell>
                                {columns.map(column => (
                                    <DataTableCell key={column.id} className={clickableRowClass} onClick={onClick}>
                                        {row.values[column.id]}
                                    </DataTableCell>
                                ))}
                            </DataTableRow>
                        );
                    })}
                </DataTableBody>
            </DataTable>
        );
    };

    return (
        <div data-test="related-events-widget">
            <Widget
                header={header}
                onOpen={useCallback(() => setOpen(true), [])}
                onClose={useCallback(() => setOpen(false), [])}
                open={open}
                contentClassName={contentClass}
            >
                {renderBody()}
            </Widget>
        </div>
    );
};
