import React, { useState, useCallback } from 'react';
import { css } from '@emotion/css';
import { spacersNum } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { Widget } from '../Widget';
import { Stages } from './Stages';
import type { Props } from './stagesAndEvents.types';

const stagesAndEventsContentClass = css`
    margin-bottom: ${spacersNum.dp32}px;
`;

export const WidgetStagesAndEvents = ({ className, stages, events, ...passOnProps }: Props) => {
    const [open, setOpenStatus] = useState(true);
    return (
        <div
            data-test="stages-and-events-widget"
            className={className}
        >
            <Widget
                header={i18n.t('Stages and Events')}
                onOpen={useCallback(() => setOpenStatus(true), [setOpenStatus])}
                onClose={useCallback(() => setOpenStatus(false), [setOpenStatus])}
                open={open}
                contentClassName={stagesAndEventsContentClass}
            >
                <Stages
                    stages={stages}
                    ready={events !== undefined && stages !== undefined}
                    events={events}
                    {...passOnProps}
                />
            </Widget>
        </div>
    );
};
