import React, { useState, useMemo } from 'react';
import i18n from '@dhis2/d2-i18n';
import {
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    ButtonStrip,
    Button,
    NoticeBox,
    CalendarInput,
    CircularLoader,
} from '@dhis2/ui';
import type { ApiEnrollmentEvent } from 'capture-core-utils/types/api-types';
import { getReplicateStatus, useReplicateEvent } from './useReplicateEvent';

type Props = {
    events: Array<ApiEnrollmentEvent>;
    eventName: string;
    onClose: () => void;
};

export const ReplicateEventDialog = ({ events, eventName, onClose }: Props) => {
    const status = useMemo(() => getReplicateStatus(events), [events]);
    const { replicate, loading, error: apiError } = useReplicateEvent();

    const [selectedDate, setSelectedDate] = useState<string>('');
    const [dateError, setDateError] = useState<string>('');

    const handleDateSelect = (
        { calendarDateString, validation }:
        { calendarDateString: string; validation?: { validationText?: string } },
    ) => {
        if (validation?.validationText) {
            setDateError(validation.validationText);
            setSelectedDate('');
            return;
        }

        if (status?.type === 'ready') {
            const minDate = status.minDate; // YYYY-MM-DD
            if (calendarDateString <= minDate) {
                setDateError(
                    i18n.t('The date must be after {{ minDate }}', {
                        minDate,
                        interpolation: { escapeValue: false },
                    }),
                );
                setSelectedDate('');
                return;
            }
        }

        setDateError('');
        setSelectedDate(calendarDateString);
    };

    const handleConfirm = async () => {
        if (!status || status.type !== 'ready' || !selectedDate) return;
        const success = await replicate(status.sourceEvent, selectedDate);
        if (success) {
            onClose();
        }
    };

    const renderBody = () => {
        if (!status) return null;

        if (status.type === 'no-completed') {
            return (
                <NoticeBox warning title={i18n.t('Cannot replicate')}>
                    {status.message}
                </NoticeBox>
            );
        }

        if (status.type === 'active-exists') {
            return (
                <NoticeBox warning title={i18n.t('Cannot replicate')}>
                    {status.message}
                </NoticeBox>
            );
        }

        // status.type === 'ready'
        return (
            <div>
                <p style={{ marginTop: 0 }}>
                    {i18n.t(
                        'A new event will be created by replicating the most recent ' +
                        'completed {{ eventName }} event (report date: {{ date }}). ' +
                        'All data values will be copied.',
                        {
                            eventName,
                            date: status.sourceEvent.occurredAt.slice(0, 10),
                            interpolation: { escapeValue: false },
                        },
                    )}
                </p>
                <p>
                    {i18n.t('Select a report date for the new event (must be after {{ minDate }}):', {
                        minDate: status.minDate,
                        interpolation: { escapeValue: false },
                    })}
                </p>
                <CalendarInput
                    label={i18n.t('Report date')}
                    // @ts-expect-error CalendarInput typing mismatch
                    onDateSelect={handleDateSelect}
                    date={selectedDate}
                    calendar="gregory"
                    format="YYYY-MM-DD"
                    width="300px"
                    inputWidth="300px"
                    minDate={status.minDate}
                    {...(dateError
                        ? { error: true, validationText: dateError }
                        : {}
                    )}
                />
                {apiError && (
                    <NoticeBox error title={i18n.t('Error')}>
                        {apiError}
                    </NoticeBox>
                )}
            </div>
        );
    };

    const canConfirm = status?.type === 'ready' && !!selectedDate && !dateError && !loading;

    return (
        <Modal onClose={onClose} position="middle">
            <ModalTitle>
                {i18n.t('Replicate last {{ eventName }} event', {
                    eventName,
                    interpolation: { escapeValue: false },
                })}
            </ModalTitle>
            <ModalContent>{renderBody()}</ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={onClose} disabled={loading}>
                        {i18n.t('Cancel')}
                    </Button>
                    {status?.type === 'ready' && (
                        <Button
                            primary
                            onClick={handleConfirm}
                            disabled={!canConfirm}
                            icon={loading ? <CircularLoader small /> : undefined}
                        >
                            {i18n.t('Confirm replication')}
                        </Button>
                    )}
                </ButtonStrip>
            </ModalActions>
        </Modal>
    );
};
