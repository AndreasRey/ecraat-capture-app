import {
    QuickActions,
    StagesAndEvents,
    EnrollmentNote,
    DefaultWidgetsForEnrollmentOverview,
    WidgetTypes,
} from '../../../common/EnrollmentOverviewDomain/EnrollmentPageLayout';
import type {
    PageLayoutConfig,
    WidgetConfig,
} from '../../../common/EnrollmentOverviewDomain/EnrollmentPageLayout/DefaultEnrollmentLayout.types';
// ECRAAT: read-only cards listing events from separate event programs
import { ecraatConfig } from '../../../../../../../ecraat';
import { RelatedProgramEvents as RelatedProgramEventsComponent } from '../../../../../../../ecraat/RelatedProgramEvents';

const RelatedProgramEvents: WidgetConfig = {
    Component: RelatedProgramEventsComponent,
    shouldHideWidget: () => !ecraatConfig.relatedEventPrograms.enabled,
    getProps: ({ orgUnitId, program }: any) => ({
        enrollmentOrgUnitId: orgUnitId,
        enrollmentProgramId: program?.id,
    }),
};

export const WidgetsForEnrollmentPageDefault: Readonly<Record<string, WidgetConfig>> = Object.freeze({
    QuickActions,
    StagesAndEvents,
    RelatedProgramEvents,
    EnrollmentNote,
    ...DefaultWidgetsForEnrollmentOverview,
});

export const DefaultPageLayout: PageLayoutConfig = {
    leftColumn: [
        {
            type: WidgetTypes.COMPONENT,
            name: 'QuickActions',
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'StagesAndEvents',
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'RelatedProgramEvents',
        },
    ],
    rightColumn: [
        {
            type: WidgetTypes.COMPONENT,
            name: 'ErrorWidget',
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'WarningWidget',
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'EnrollmentNote',
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'FeedbackWidget',
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'IndicatorWidget',
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'TrackedEntityRelationship',
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'ProfileWidget',
            settings: { readOnlyMode: false },
        },
        {
            type: WidgetTypes.COMPONENT,
            name: 'EnrollmentWidget',
            settings: { readOnlyMode: false },
        },
    ],
} as const;
