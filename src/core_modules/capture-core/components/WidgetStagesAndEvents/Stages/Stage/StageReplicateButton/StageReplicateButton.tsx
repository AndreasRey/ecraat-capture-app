import React, { useState } from 'react';
import { Button, IconAdd16 } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import type { ApiEnrollmentEvent } from 'capture-core-utils/types/api-types';
import { ReplicateEventDialog } from './ReplicateEventDialog';

type Props = {
    events: Array<ApiEnrollmentEvent>;
    eventName: string;
    stageWriteAccess?: boolean;
};

export const StageReplicateButton = ({ events, eventName, stageWriteAccess }: Props) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    if (!stageWriteAccess) return null;

    return (
        <>
            <Button
                small
                secondary
                icon={<IconAdd16 />}
                onClick={() => setDialogOpen(true)}
                dataTest="replicate-event-button"
            >
                {i18n.t('Replicate last {{ eventName }} event', {
                    eventName,
                    interpolation: { escapeValue: false },
                })}
            </Button>
            {dialogOpen && (
                <ReplicateEventDialog
                    events={events}
                    eventName={eventName}
                    onClose={() => setDialogOpen(false)}
                />
            )}
        </>
    );
};
