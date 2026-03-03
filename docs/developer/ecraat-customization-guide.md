# ECRAAT Capture App – Customization Guide

> **For developers and AI agents** working on the ECRAAT fork of the DHIS2 Capture App.
>
> **This document is the single source of truth** for re-implementing every ECRAAT customization on a fresh clone of the upstream project.

---

## Overview

This project is a fork of the [DHIS2 Capture App](https://github.com/dhis2/capture-app). The goal is to reuse the data-collection features while simplifying the UI for ECRAAT end users.

**Core principle:** All ECRAAT customizations must be as non-invasive as possible so that pulling upstream changes causes minimal merge conflicts.

---

## Architecture of Customizations

All ECRAAT-specific code lives in a small, well-defined set of files, with minimal surgical changes to upstream components.

### 1. `src/ecraat/ecraat-config.ts` — Central configuration

A single TypeScript object (`ecraatConfig`) containing **feature flags** that control all custom behavior. Every ECRAAT-specific conditional in the codebase reads from this config.

```ts
export const ecraatConfig = {
    homePage: {
        enabled: true,
        programId: 'Bi1Zu6UjfmG',
        defaultTemplateId: 'Bi1Zu6UjfmG-default',
    },
    mainPage: {
        hideScopeSelector: true,
        hideTemplateTabs: true,
        hideWorkingListFilters: true,
        hideListViewControls: true,
        registerButtonLabel: 'Register new sector or building',
        registerButtonShowPlusIcon: true,
        centerContent: true,
    },
    enrollmentDashboard: {
        hideQuickActions: true,
        hideEnrollmentNotes: true,
        hideEnrollmentWidget: true,
        hideProfileWidget: true,
        showProfileActionsInHeader: true,
        centerContent: true,
    },
    eventForm: {
        hideScheduleTab: true,
        hideOrgUnitField: true,
    },
    breadcrumb: {
        mainPageLabel: 'Sector/Building list',
        enrollmentDashboardAttributeId: 'ORpKveoai1g',
    },
};
```

**To disable any customization**, just set the flag to `false` (or `null`/empty string for label overrides) — no other file changes needed.

### 2. `src/ecraat/ecraat-overrides.css` — CSS element hiding (safety net)

Uses `data-test` attributes and HTML `id`s to hide elements. Acts as a **backup** for the code-level hiding. All primary hiding is done via code (conditional returns / `shouldHideWidget` callbacks).

| CSS Selector | What it hides | Page |
|---|---|---|
| `[data-test="scope-selector"] > div:has([data-test="org-unit-field"])` | QuickSelector bar inside scope-selector | Main |
| `[data-test="workinglists-template-selector-chips-container"]` | Enrollment tabs (Active, Completed, Cancelled) | Main |
| `#top-bar-container-list-view-main` | Filter buttons row (Enrollment status, date, etc.) | Main |
| `[data-test="widget-quick-actions"]` | Quick Actions widget (New event / Schedule) | Enrollment Dashboard |
| `[data-test="enrollment-note-widget"]` | Notes about this enrollment widget | Enrollment Dashboard |
| `[data-test="widget-enrollment"]` | Enrollment widget (status, dates, actions) | Enrollment Dashboard |
| `[data-test="profile-widget"]` | Profile widget card (backup for code-level hiding) | Enrollment Dashboard |

**Imported once** in `src/index.tsx`:
```tsx
import './ecraat/ecraat-overrides.css';
```

### 3. `src/ecraat/index.ts` — Re-exports

Barrel file that re-exports `ecraatConfig` so upstream files import from `'../../ecraat'` (adjust depth as needed).

---

## Customization Details

### A. Home Page — Custom OrgUnit table

**Config flags:** `homePage.enabled`, `homePage.programId`, `homePage.defaultTemplateId`

**New files:**
- `src/core_modules/capture-core/components/EcraatHomePage/EcraatHomePage.component.tsx` — A filterable table of organisation units for the configured program. Renders when `ecraatConfig.homePage.enabled === true` instead of the default "Get started" splash screen.
- `src/core_modules/capture-core/components/EcraatHomePage/index.ts` — Barrel export.

**Upstream change:**
- `src/core_modules/capture-core/components/Pages/MainPage/MainPageBody/MainPageBody.component.tsx` — In the `mainPageStatus === MainPageStatuses.DEFAULT` branch, wrap existing `<NoSelectionsInfoBox />` in a conditional:
  ```tsx
  {mainPageStatus === MainPageStatuses.DEFAULT && (
      ecraatConfig.homePage.enabled
          ? <EcraatHomePage />
          : <NoSelectionsInfoBox />
  )}
  ```

---

### B. Main Page — Hide ScopeSelector bar

**Config flag:** `mainPage.hideScopeSelector`

**Upstream change:**
- `src/core_modules/capture-core/components/ScopeSelector/ScopeSelector.component.tsx` — Add an early return at the top of the component that renders **only the org unit name as a header** instead of the full Program/OrgUnit/Category selectors. The org unit display name is fetched from the redux store (`useSelector`).

  ```tsx
  // ECRAAT: replace scope selector with a simple org-unit name header
  if (ecraatConfig.mainPage.hideScopeSelector) {
      return (
          <div data-test="scope-selector">
              <h2 style={{ margin: '8px 16px' }}>{selectedOrgUnitName || ''}</h2>
          </div>
      );
  }
  ```

---

### C. Main Page — Hide template tabs, filters, list controls

**Config flags:** `mainPage.hideTemplateTabs`, `mainPage.hideWorkingListFilters`, `mainPage.hideListViewControls`

**Upstream changes:**
- `src/core_modules/capture-core/components/WorkingListsBase/TemplateSelector.component.tsx` — Early return `null` when `ecraatConfig.mainPage.hideTemplateTabs` is truthy.
  ```tsx
  // ECRAAT: hide enrollment template tabs
  if (ecraatConfig.mainPage.hideTemplateTabs) return null;
  ```

- `src/core_modules/capture-core/components/ListView/Main/ListViewMain.component.tsx` — Two changes:
  1. Early return `null` for the filter bar when `ecraatConfig.mainPage.hideWorkingListFilters` is truthy.
  2. Hide the column selector gear icon and three-dot menu when `ecraatConfig.mainPage.hideListViewControls` is truthy.

  Both guarded by `// ECRAAT:` comments.

---

### D. Main Page — Custom register button

**Config flags:** `mainPage.registerButtonLabel`, `mainPage.registerButtonShowPlusIcon`, `mainPage.hideScopeSelector` (used as display condition)

**New files:**
- `src/core_modules/capture-core/components/EcraatRegisterButton/EcraatRegisterButton.component.tsx` — Reads label & icon settings from `ecraatConfig`. Navigates to `new?programId=...&orgUnitId=...` using the same routing utility as `TopBarActions`.
- `src/core_modules/capture-core/components/EcraatRegisterButton/index.ts` — Barrel export.

**Upstream change:**
- `MainPageBody.component.tsx` — Inside the `SHOW_WORKING_LIST` branch, before `<WorkingListsType>`, conditionally render the button:
  ```tsx
  {/* ECRAAT: Show register button above the working list */}
  {ecraatConfig.mainPage.hideScopeSelector && (
      <EcraatRegisterButton programId={programId} orgUnitId={orgUnitId} />
  )}
  ```

---

### E. Main Page — Center working list content

**Config flag:** `mainPage.centerContent`

**Upstream change:**
- `MainPageBody.component.tsx` — On the `div` with `data-test="main-page-working-list"`, apply an inline style:
  ```tsx
  <div
      className={classes.container}
      data-test={'main-page-working-list'}
      style={ecraatConfig.mainPage.centerContent
          ? { maxWidth: 900, margin: '0 auto', width: '100%' }
          : undefined
      }
  >
  ```

---

### F. Enrollment Dashboard — Hide widgets (QuickActions, Notes, Enrollment, Profile)

**Config flags:** `enrollmentDashboard.hideQuickActions`, `enrollmentDashboard.hideEnrollmentNotes`, `enrollmentDashboard.hideEnrollmentWidget`, `enrollmentDashboard.hideProfileWidget`

Uses DHIS2's upstream `shouldHideWidget` pattern (same mechanism used for FeedbackWidget / IndicatorWidget):

**Upstream changes:**
1. **`LayoutComponentConfig.ts`** (full path: `src/core_modules/capture-core/components/Pages/common/EnrollmentOverviewDomain/EnrollmentPageLayout/LayoutComponentConfig/LayoutComponentConfig.ts`) — Add `shouldHideWidget` callbacks to `QuickActions`, `EnrollmentNote`, and `EnrollmentWidget` widget configs:
   ```ts
   shouldHideWidget: ({ hideWidgets }) => hideWidgets?.quickActions,
   shouldHideWidget: ({ hideWidgets }) => hideWidgets?.enrollmentNote,
   shouldHideWidget: ({ hideWidgets }) => hideWidgets?.enrollmentWidget,
   ```

2. **`EnrollmentPageDefault.container.tsx`** (full path: `src/core_modules/capture-core/components/Pages/Enrollment/EnrollmentPageDefault/EnrollmentPageDefault.container.tsx`) — Import `ecraatConfig` and merge ECRAAT flags into the `hideWidgets` prop:
   ```tsx
   import { ecraatConfig } from '../../../../../../ecraat';
   // ... inside the component, where hideWidgets is computed:
   const hideWidgets = {
       ...ruleBasedHiding,
       quickActions: ecraatConfig.enrollmentDashboard.hideQuickActions,
       enrollmentNote: ecraatConfig.enrollmentDashboard.hideEnrollmentNotes,
       enrollmentWidget: ecraatConfig.enrollmentDashboard.hideEnrollmentWidget,
   };
   ```

3. **Profile widget hiding** — The profile widget uses a different mechanism. In `WidgetProfile`'s type definitions and component:
   - Type file (`src/core_modules/capture-core/components/WidgetProfile/WidgetProfile.types.js`) — Add `actionsOnly?: boolean` prop.
   - Component — When `actionsOnly` rendering mode is on, only render the edit/overflow buttons (not the full profile card).
   - The profile widget's `shouldHideWidget` callback in `LayoutComponentConfig.ts` checks `hideWidgets?.profileWidget`.

---

### G. Enrollment Dashboard — Center content layout

**Config flag:** `enrollmentDashboard.centerContent`

**Upstream change:**
- `EnrollmentPageLayout.tsx` (full path: `src/core_modules/capture-core/components/Pages/common/EnrollmentOverviewDomain/EnrollmentPageLayout/EnrollmentPageLayout.tsx`) — Import `ecraatConfig` and apply centering:
  ```tsx
  import { ecraatConfig } from '../../../../../../../ecraat';

  // Inside the component:
  const centeredLayout = !!ecraatConfig.enrollmentDashboard.centerContent;
  const hasRightColumn = !centeredLayout && pageLayout.rightColumn && !!rightColumnWidgets?.length;

  // On the contentContainer div:
  style={{
      ...(!mainContentVisible ? { display: 'none' } : undefined),
      ...(centeredLayout ? { maxWidth: 900, margin: '0 auto', width: '100%' } : undefined),
  }}

  // On the columns div:
  style={centeredLayout ? { justifyContent: 'center' } : undefined}

  // On the leftColumn div:
  style={centeredLayout ? { minWidth: 'unset', flexBasis: 'auto', width: '100%' } : undefined}
  ```

---

### H. Enrollment Dashboard — Profile actions in breadcrumb header

**Config flag:** `enrollmentDashboard.showProfileActionsInHeader`

**Upstream change:**
- `EnrollmentPageLayout.tsx` — Render `<WidgetProfile actionsOnly>` next to the breadcrumb:
  ```tsx
  {/* ECRAAT: Profile Edit + overflow actions in the breadcrumb header */}
  {ecraatConfig.enrollmentDashboard.showProfileActionsInHeader && (
      <WidgetProfile
          teiId={...}
          programId={program.id}
          orgUnitId={...}
          onUpdateTeiAttributeValues={...}
          onDeleteSuccess={...}
          actionsOnly
      />
  )}
  ```
  This is placed inside a flex container (`display: 'flex', alignItems: 'center', justifyContent: 'space-between'`) wrapping the `<EnrollmentBreadcrumb>` component.

---

### I. Breadcrumb — Custom labels

**Config flags:** `breadcrumb.mainPageLabel`, `breadcrumb.enrollmentDashboardAttributeId`

**Upstream change:**
- `EnrollmentBreadcrumb.tsx` (full path: `src/core_modules/capture-core/components/Breadcrumbs/EnrollmentBreadcrumb/EnrollmentBreadcrumb.tsx`) — Import `ecraatConfig` and:
  1. Override the first breadcrumb item label:
     ```tsx
     // ECRAAT: override breadcrumb labels
     const label = ecraatConfig.breadcrumb.mainPageLabel || workingListLabel;
     ```
  2. Replace "Enrollment dashboard" with a TEI attribute value:
     ```tsx
     const enrollmentDashboardLabel = useMemo(() => {
         const attrId = ecraatConfig.breadcrumb.enrollmentDashboardAttributeId;
         if (attrId && attributeValues) {
             const attr = attributeValues.find((a: any) => a.id === attrId);
             if (attr?.value) return attr.value;
         }
         return i18n.t('Enrollment dashboard');
     }, [attributeValues]);
     ```
     This reads TEI attribute values from the redux store (`state.enrollmentDomain?.attributeValues`) and uses the value of the specified attribute as the breadcrumb label.

---

### J. Enrollment Dashboard QuickActions — data-test wrapper

**Upstream change:**
- `EnrollmentQuickActions.component.tsx` — Wrap the entire return JSX in a `<div data-test="widget-quick-actions">` so the CSS override can target it. _(~2 lines added)_

---

### K. Stages — Hide stages without write access

**Upstream change:**
- `Stages.component.tsx` (full path: `src/core_modules/capture-core/components/WidgetStagesAndEvents/Stages/Stages.component.tsx`) — Change the stage filter from `stage.dataAccess.read` to `stage.dataAccess.read && stage.dataAccess.write`:
  ```tsx
  // BEFORE (upstream):
  .filter(stage => stage.dataAccess.read)

  // AFTER (ECRAAT):
  .filter(stage => stage.dataAccess.read && stage.dataAccess.write)
  ```
  This completely hides program stage sections from the enrollment dashboard when the current user does not have write access, instead of showing them with a greyed-out "New event" button.

---

### L. Stages — Rename "New event" button to "New blank event"

**Upstream change:**
- `StageCreateNewButton.tsx` (full path: `src/core_modules/capture-core/components/WidgetStagesAndEvents/Stages/Stage/StageCreateNewButton/StageCreateNewButton.tsx`) — Change the button label:
  ```tsx
  // BEFORE (upstream):
  {i18n.t('New {{ eventName }} event', {
      eventName, interpolation: { escapeValue: false },
  })}

  // AFTER (ECRAAT):
  {i18n.t('New blank {{ eventName }} event', {
      eventName, interpolation: { escapeValue: false },
  })}
  ```
  The word "blank" differentiates this button from the new "Replicate" button.

---

### M. Stages — "Replicate last event" feature

This is a completely new feature that allows users to create a new event by copying all data values from the most recent completed event.

**New files (all under `src/core_modules/capture-core/components/WidgetStagesAndEvents/Stages/Stage/StageReplicateButton/`):**

#### `index.ts`
Barrel export:
```ts
export { StageReplicateButton } from './StageReplicateButton';
```

#### `StageReplicateButton.tsx`
A button component that:
- Renders `"+ Replicate last {eventName} event"` with `@dhis2/ui` `<Button>` and `<IconAdd16>`
- Returns `null` when `stageWriteAccess` is `false`
- Opens the `<ReplicateEventDialog>` on click
- **Props:** `events: Array<ApiEnrollmentEvent>`, `eventName: string`, `stageWriteAccess?: boolean`

```tsx
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
```

#### `useReplicateEvent.ts`
Exports two things:

1. **`getReplicateStatus(events)`** — Pure function that analyses the event list and returns one of:
   - `{ type: 'no-completed', message: '...' }` — No completed events exist to replicate.
   - `{ type: 'active-exists', message: '...' }` — An ACTIVE event already exists; must complete/delete it first.
   - `{ type: 'ready', sourceEvent, minDate }` — Ready to replicate. `sourceEvent` is the most-recent COMPLETED event (sorted by `occurredAt` descending). `minDate` is `sourceEvent.occurredAt.slice(0, 10)`.

2. **`useReplicateEvent()`** — React hook that returns `{ replicate, loading, error }`:
   - `replicate(sourceEvent, newDate)` creates a new event via the DHIS2 Tracker API:
     - Generates a new UID using `generateUID()` from `src/core_modules/capture-core/utils/uid/generateUID.ts`
     - Copies `program`, `programStage`, `orgUnit`, `trackedEntity`, `enrollment` from source
     - Sets `status: 'ACTIVE'`, `occurredAt` and `scheduledAt` to the selected date
     - Copies all `dataValues` (only `dataElement` + `value`)
     - POSTs to `tracker?async=false` using `useDataEngine().mutate()`
     - On success, dispatches `addPersistedEnrollmentEvents({ events: [newEvent] })` to update the Redux store
   - Error handling extracts validation messages from `details.validationReport.errorReports`

```ts
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

export const getReplicateStatus = (
    events: Array<ApiEnrollmentEvent>,
): ReplicateStatus => {
    const completedEvents = events.filter(e => e.status === 'COMPLETED' && !e.deleted);
    if (completedEvents.length === 0) {
        return {
            type: 'no-completed',
            message:
                'There is no completed event to be replicated to this program stage, '
                + 'please fill and complete a blank form to enable replication',
        };
    }
    const activeEvents = events.filter(e => e.status === 'ACTIVE' && !e.deleted);
    if (activeEvents.length > 0) {
        return {
            type: 'active-exists',
            message:
                'There is already an "active" (non completed) event attached to the '
                + 'current program stage, please complete it or delete it before running '
                + 'the form replication',
        };
    }
    const sorted = [...completedEvents].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    const sourceEvent = sorted[0];
    return { type: 'ready', sourceEvent, minDate: sourceEvent.occurredAt.slice(0, 10) };
};

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
```

#### `ReplicateEventDialog.tsx`
A modal dialog (`@dhis2/ui` `<Modal>`) with three states:
1. **No completed events** → `<NoticeBox warning>` with message.
2. **Active event exists** → `<NoticeBox warning>` with message.
3. **Ready** → Shows info text, a `<CalendarInput>` date picker (min date = source event date, format `YYYY-MM-DD`), and a "Confirm replication" primary button.

Date validation: the selected date must be strictly **after** the source event's report date.

```tsx
import React, { useState, useMemo } from 'react';
import i18n from '@dhis2/d2-i18n';
import {
    Modal, ModalTitle, ModalContent, ModalActions,
    ButtonStrip, Button, NoticeBox, CalendarInput, CircularLoader,
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
            const minDate = status.minDate;
            if (calendarDateString <= minDate) {
                setDateError(
                    i18n.t('The date must be after {{ minDate }}', {
                        minDate, interpolation: { escapeValue: false },
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
        if (success) onClose();
    };

    const renderBody = () => {
        if (!status) return null;
        if (status.type === 'no-completed') {
            return (<NoticeBox warning title={i18n.t('Cannot replicate')}>{status.message}</NoticeBox>);
        }
        if (status.type === 'active-exists') {
            return (<NoticeBox warning title={i18n.t('Cannot replicate')}>{status.message}</NoticeBox>);
        }
        return (
            <div>
                <p style={{ marginTop: 0 }}>
                    {i18n.t(
                        'A new event will be created by replicating the most recent '
                        + 'completed {{ eventName }} event (report date: {{ date }}). '
                        + 'All data values will be copied.',
                        { eventName, date: status.sourceEvent.occurredAt.slice(0, 10),
                          interpolation: { escapeValue: false } },
                    )}
                </p>
                <p>
                    {i18n.t('Select a report date for the new event (must be after {{ minDate }}):', {
                        minDate: status.minDate, interpolation: { escapeValue: false },
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
                    {...(dateError ? { error: true, validationText: dateError } : {})}
                />
                {apiError && (<NoticeBox error title={i18n.t('Error')}>{apiError}</NoticeBox>)}
            </div>
        );
    };

    const canConfirm = status?.type === 'ready' && !!selectedDate && !dateError && !loading;
    return (
        <Modal onClose={onClose} position="middle">
            <ModalTitle>
                {i18n.t('Replicate last {{ eventName }} event', {
                    eventName, interpolation: { escapeValue: false },
                })}
            </ModalTitle>
            <ModalContent>{renderBody()}</ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={onClose} disabled={loading}>{i18n.t('Cancel')}</Button>
                    {status?.type === 'ready' && (
                        <Button primary onClick={handleConfirm} disabled={!canConfirm}
                            icon={loading ? <CircularLoader small /> : undefined}>
                            {i18n.t('Confirm replication')}
                        </Button>
                    )}
                </ButtonStrip>
            </ModalActions>
        </Modal>
    );
};
```

**Upstream changes to wire the replicate button into the UI:**

1. **`Stage.component.tsx`** (full path: `src/core_modules/capture-core/components/WidgetStagesAndEvents/Stages/Stage/Stage.component.tsx`):
   - Import `StageReplicateButton` from `'./StageReplicateButton'`
   - Add `buttonRow` style: `{ display: 'flex', alignItems: 'center' }`
   - In the **empty state** (when `events.length === 0`), render both buttons in a flex row:
     ```tsx
     <div className={classes.buttonRow}>
         <StageCreateNewButton ... />
         <div style={{ marginLeft: 8 }}>
             <StageReplicateButton
                 events={events}
                 eventName={name}
                 stageWriteAccess={stage.dataAccess.write}
             />
         </div>
     </div>
     ```

2. **`StageDetail.component.tsx`** (full path: `src/core_modules/capture-core/components/WidgetStagesAndEvents/Stages/Stage/StageDetail/StageDetail.component.tsx`):
   - Import `StageReplicateButton` from `'../StageReplicateButton'`
   - In the `renderCreateNewButton()` method, wrap both buttons in a flex container:
     ```tsx
     const renderCreateNewButton = () => (
         <div className={classes.newButton}
              style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
             <StageCreateNewButton ... />
             <StageReplicateButton
                 events={events}
                 eventName={eventName}
                 stageWriteAccess={stage?.access?.data?.write}
             />
         </div>
     );
     ```
   Note: In `StageDetail`, the stage data access is via `stage?.access?.data?.write` (obtained from `getProgramAndStageForProgram`), whereas in `Stage.component.tsx` it's `stage.dataAccess.write` (from the props type).

---

### N. Event Forms — Hide "Schedule" tab

**Config flag:** `eventForm.hideScheduleTab`

**Upstream changes:**

1. **`NewEventWorkspace.component.tsx`** (full path: `src/core_modules/capture-core/components/Pages/EnrollmentAddEvent/NewEventWorkspace/NewEventWorkspace.component.tsx`):
   - Import: `import { ecraatConfig } from '../../../../../../ecraat';`
   - Wrap the Schedule `<Tab>` in a conditional:
     ```tsx
     {!ecraatConfig.eventForm.hideScheduleTab && (
         <Tab key="schedule-tab" ...>{i18n.t('Schedule')}</Tab>
     )}
     ```

2. **`EditEventDataEntry.component.tsx`** (full path: `src/core_modules/capture-core/components/WidgetEventEdit/EditEventDataEntry/EditEventDataEntry.component.tsx`):
   - Import: `import { ecraatConfig } from '../../../../../ecraat';`
   - In the `renderScheduleView()` method, wrap the Schedule `<Tab>` in the same conditional:
     ```tsx
     {!ecraatConfig.eventForm.hideScheduleTab && (
         <Tab key="schedule-tab" ...>{i18n.t('Schedule')}</Tab>
     )}
     ```

---

### O. Event Forms — Hide "Organisation unit" field

**Config flag:** `eventForm.hideOrgUnitField`

Uses the upstream `withDataEntryFieldIfApplicable` HOC pattern (same mechanism used for geometry and assignee fields).

**Upstream changes:**

1. **`DataEntry.component.tsx` (New Event)** (full path: `src/core_modules/capture-core/components/WidgetEnrollmentEventNew/DataEntry/DataEntry.component.tsx`):
   - Import: `import { ecraatConfig } from '../../../../../ecraat';`
   - In the `WrappedDataEntry` compose chain, change:
     ```tsx
     // BEFORE (upstream):
     withDataEntryField(buildOrgUnitSettingsFn()),

     // AFTER (ECRAAT):
     withDataEntryFieldIfApplicable({
         ...buildOrgUnitSettingsFn(),
         isApplicable: () => !ecraatConfig.eventForm.hideOrgUnitField,
     }),
     ```
   Note: `withDataEntryFieldIfApplicable` is already imported in this file (used for geometry).

2. **`EditEventDataEntry.component.tsx` (Edit Event)**:
   - Same pattern. In the HOC chain:
     ```tsx
     // BEFORE (upstream):
     const OrgUnitField = withDataEntryFieldIfApplicable(buildOrgUnitSettingsFn())(GeometryField);

     // AFTER (ECRAAT):
     const OrgUnitField = withDataEntryFieldIfApplicable({
         ...buildOrgUnitSettingsFn(),
         isApplicable: () => !ecraatConfig.eventForm.hideOrgUnitField,
     })(GeometryField);
     ```
   Note: `withDataEntryFieldIfApplicable` is already imported in this file.

---

## Complete File Inventory

### New ECRAAT-specific files

```
src/ecraat/
├── ecraat-config.ts                     ← Feature flags (all sections)
├── ecraat-overrides.css                 ← CSS overrides to hide elements
└── index.ts                             ← Re-exports ecraatConfig

src/core_modules/capture-core/components/
├── EcraatHomePage/                      ← Custom OrgUnit table home page
│   ├── EcraatHomePage.component.tsx
│   ├── EcraatHomePage.module.css
│   └── index.ts
├── EcraatRegisterButton/               ← Custom register button
│   ├── EcraatRegisterButton.component.tsx
│   └── index.ts
└── WidgetStagesAndEvents/Stages/Stage/
    └── StageReplicateButton/            ← Event replication feature
        ├── index.ts
        ├── StageReplicateButton.tsx
        ├── ReplicateEventDialog.tsx
        └── useReplicateEvent.ts
```

### Modified upstream files

| # | File | Customization | Section |
|---|---|---|---|
| 1 | `src/index.tsx` | `import './ecraat/ecraat-overrides.css'` | CSS import |
| 2 | `ScopeSelector.component.tsx` | Early return showing org unit name instead of full selector | B |
| 3 | `TemplateSelector.component.tsx` | Early return `null` to hide template tabs | C |
| 4 | `ListViewMain.component.tsx` | Early return to hide filters + controls | C |
| 5 | `MainPageBody.component.tsx` | EcraatHomePage, EcraatRegisterButton, centered layout style | A, D, E |
| 6 | `EnrollmentQuickActions.component.tsx` | `data-test` wrapper div | J |
| 7 | `LayoutComponentConfig.ts` | `shouldHideWidget` callbacks | F |
| 8 | `EnrollmentPageDefault.container.tsx` | Merge ECRAAT flags into `hideWidgets` | F |
| 9 | `EnrollmentPageLayout.tsx` | Centered layout + profile actions in header | G, H |
| 10 | `EnrollmentBreadcrumb.tsx` | Custom breadcrumb labels | I |
| 11 | `WidgetProfile` types + component | `actionsOnly` prop | H |
| 12 | `Stages.component.tsx` | Filter: `stage.dataAccess.read && stage.dataAccess.write` | K |
| 13 | `StageCreateNewButton.tsx` | Button text: "New blank {{ eventName }} event" | L |
| 14 | `Stage.component.tsx` | Import + render `StageReplicateButton` | M |
| 15 | `StageDetail.component.tsx` | Import + render `StageReplicateButton` in footer | M |
| 16 | `NewEventWorkspace.component.tsx` | Conditional Schedule tab hiding | N |
| 17 | `EditEventDataEntry.component.tsx` | Conditional Schedule tab + OrgUnit field hiding | N, O |
| 18 | `DataEntry.component.tsx` (WidgetEnrollmentEventNew) | OrgUnit field conditional via `withDataEntryFieldIfApplicable` | O |

---

## How to Pull Upstream Changes

1. **Add upstream remote** (one-time):
   ```bash
   git remote add upstream https://github.com/dhis2/capture-app.git
   ```

2. **Fetch and merge**:
   ```bash
   git fetch upstream
   git merge upstream/master
   ```

3. **Resolve conflicts** — files likely to conflict are listed in the Modified upstream files table above. For each:
   - Keep both: upstream code **AND** the ECRAAT conditional wrapper
   - All ECRAAT changes are marked with `// ECRAAT:` comments for easy identification

4. **New ECRAAT files never conflict** — `src/ecraat/`, `EcraatHomePage/`, `EcraatRegisterButton/`, and `StageReplicateButton/` are entirely our own.

5. **If re-implementing from scratch** after cloning upstream:
   1. Create `src/ecraat/` directory with `ecraat-config.ts`, `ecraat-overrides.css`, `index.ts`
   2. Create `EcraatHomePage/`, `EcraatRegisterButton/`, `StageReplicateButton/` component folders
   3. Apply each upstream modification from Sections A–O above
   4. Import `'./ecraat/ecraat-overrides.css'` in `src/index.tsx`

---

## How to Add New Customizations

### Hiding an element (CSS approach)

1. Inspect the element in browser DevTools
2. Find its `data-test` attribute or `id`
3. Add a CSS rule in `src/ecraat/ecraat-overrides.css`:
   ```css
   [data-test="some-attribute"] {
       display: none !important;
   }
   ```
4. Optionally add a feature flag in `ecraat-config.ts` if you want runtime control

### Hiding a data entry field (HOC approach)

Use `withDataEntryFieldIfApplicable` instead of `withDataEntryField`:
```tsx
withDataEntryFieldIfApplicable({
    ...buildFieldSettingsFn(),
    isApplicable: () => !ecraatConfig.someSection.hideThisField,
})
```

### Adding/modifying a component (code approach)

1. **Prefer wrapping over editing**: Create a new component in `src/core_modules/capture-core/components/Ecraat*/` or `src/ecraat/`
2. **Add a feature flag** in `ecraatConfig`
3. **Conditionally render** in the upstream component:
   ```tsx
   {ecraatConfig.someFeature.enabled && <EcraatCustomComponent />}
   ```
4. Keep the upstream code intact — just add the conditional block next to it

### Renaming/relabeling (text changes)

- If it's a static label, use the config: `ecraatConfig.mainPage.registerButtonLabel`
- If it's an i18n key, consider overriding via the config approach above
- Avoid modifying upstream component files for text changes when possible

---

## Key Upstream Components Reference

| Component | Path | What it renders |
|---|---|---|
| **MainPage** | `.../Pages/MainPage/MainPage.component.tsx` | Top-level: TopBar + MainPageBody |
| **ScopeSelector** | `.../ScopeSelector/ScopeSelector.component.tsx` | Program/OrgUnit/Category selectors |
| **MainPageBody** | `.../Pages/MainPage/MainPageBody/MainPageBody.component.tsx` | Renders working list or search box |
| **TemplateSelector** | `.../WorkingListsBase/TemplateSelector.component.tsx` | Template tabs (Active/Completed/Cancelled) |
| **ListViewMain** | `.../ListView/Main/ListViewMain.component.tsx` | Filter bar + data table + pagination |
| **EnrollmentPageDefault** | `.../Enrollment/EnrollmentPageDefault/EnrollmentPageDefault.container.tsx` | Enrollment dashboard container |
| **EnrollmentPageLayout** | `.../EnrollmentOverviewDomain/EnrollmentPageLayout/EnrollmentPageLayout.tsx` | Dashboard layout (columns, breadcrumb, widgets) |
| **EnrollmentBreadcrumb** | `.../Breadcrumbs/EnrollmentBreadcrumb/EnrollmentBreadcrumb.tsx` | Breadcrumb navigation |
| **LayoutComponentConfig** | `.../EnrollmentPageLayout/LayoutComponentConfig/LayoutComponentConfig.ts` | Widget visibility configuration |
| **Stages** | `.../WidgetStagesAndEvents/Stages/Stages.component.tsx` | List of program stages |
| **Stage** | `.../WidgetStagesAndEvents/Stages/Stage/Stage.component.tsx` | Single stage widget |
| **StageDetail** | `.../WidgetStagesAndEvents/Stages/Stage/StageDetail/StageDetail.component.tsx` | Event table + footer |
| **StageCreateNewButton** | `.../Stages/Stage/StageCreateNewButton/StageCreateNewButton.tsx` | "+ New blank event" button |
| **NewEventWorkspace** | `.../EnrollmentAddEvent/NewEventWorkspace/NewEventWorkspace.component.tsx` | New event form (Report/Schedule tabs) |
| **EditEventDataEntry** | `.../WidgetEventEdit/EditEventDataEntry/EditEventDataEntry.component.tsx` | Edit event form (Report/Schedule tabs + OrgUnit field) |
| **DataEntry (New)** | `.../WidgetEnrollmentEventNew/DataEntry/DataEntry.component.tsx` | New event data entry form (OrgUnit field) |
| **WidgetProfile** | `.../WidgetProfile/WidgetProfile.component.tsx` | Profile card (supports `actionsOnly` mode) |

### Key Utilities

| Utility | Path | Purpose |
|---|---|---|
| `generateUID()` | `src/core_modules/capture-core/utils/uid/generateUID.ts` | Generates 11-char DHIS2 UIDs |
| `addPersistedEnrollmentEvents` | `.../EnrollmentOverviewDomain/enrollment.actions.ts` | Redux action to add events to store |
| `withDataEntryFieldIfApplicable` | `.../DataEntry/dataEntryField/withDataEntryFieldIfApplicable.tsx` | HOC for conditional field rendering |
| `useDataEngine` | `@dhis2/app-runtime` | DHIS2 API client hook |

---

## Render Trees

### Main Page with Working List

```
MainPage
├── TopBar
│   └── ScopeSelector                          ← Shows only org unit name (B)
└── MainPageBody
    ├── [DEFAULT] → EcraatHomePage             ← Custom home page (A)
    └── [SHOW_WORKING_LIST]
        └── div.container (centered, max-width 900) ← (E)
            └── div.leftColumn
                ├── EcraatRegisterButton       ← Custom register button (D)
                └── WorkingListsType
                    └── WorkingListsBase
                        └── TemplatesManager
                            ├── TemplateSelector   ← HIDDEN (C)
                            └── ListViewConfig
                                └── ListViewMain
                                    ├── TopBar (filters)  ← HIDDEN (C)
                                    ├── OnlineList (table)
                                    └── ListPagination
```

### Enrollment Dashboard

```
EnrollmentPageDefault
└── EnrollmentPageLayout (centered, max-width 900)  ← (G)
    ├── Breadcrumb row (flex, space-between)
    │   ├── EnrollmentBreadcrumb               ← Custom labels (I)
    │   └── WidgetProfile (actionsOnly)        ← Edit/overflow buttons (H)
    └── Columns (left only, centered)
        └── LeftColumn
            ├── WidgetStagesAndEvents
            │   └── Stages (write-access filter)  ← (K)
            │       └── Stage
            │           ├── StageCreateNewButton ("New blank") ← (L)
            │           └── StageReplicateButton  ← (M)
            ├── [QuickActions]                 ← HIDDEN (F)
            ├── [EnrollmentNote]               ← HIDDEN (F)
            ├── [EnrollmentWidget]             ← HIDDEN (F)
            └── [ProfileWidget]                ← HIDDEN (F)
```

### Event Form (New / Edit)

```
NewEventWorkspace / EditEventDataEntry
├── TabBar
│   ├── Tab "Report"                           ← Always visible
│   └── Tab "Schedule"                         ← HIDDEN (N)
└── DataEntry (compose chain)
    ├── ReportDate field                       ← Always visible
    ├── OrgUnit field                          ← HIDDEN via isApplicable (O)
    ├── Geometry field                         ← Conditional (upstream)
    ├── Notes field                            ← Always visible
    └── Assignee field                         ← Conditional (upstream)
```

---

## Conventions

1. **Prefix all ECRAAT additions** with `Ecraat` in component/folder names or `ecraat` in file names
2. **Comment all ECRAAT changes** in upstream files with `// ECRAAT:` so they're easy to find via grep
3. **Never remove upstream code** — only add conditional blocks around it or use CSS to hide it
4. **Keep `ecraat-config.ts` as the single source of truth** for all customization settings
5. **Use `data-test` selectors** in CSS — they are stable across upstream versions
6. **Use `withDataEntryFieldIfApplicable`** for hiding data entry fields — not CSS (class names are hashed)

---

## Searching for All ECRAAT Changes

```bash
# Find all ECRAAT-specific files
find src -path "*/ecraat*" -o -path "*/Ecraat*" -o -path "*/StageReplicateButton*"

# Find all ECRAAT comments in upstream files
grep -r "ECRAAT" src/ --include="*.tsx" --include="*.ts" --include="*.css"

# Find the config imports in upstream files
grep -r "from.*ecraat" src/ --include="*.tsx" --include="*.ts"
```
