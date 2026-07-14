# ECRAAT Capture App — Rebuild Playbook

> **Instructions for a Claude Code agent** (or a human developer) tasked with re-creating the
> ECRAAT customizations on top of a fresh clone of the upstream
> [DHIS2 Capture App](https://github.com/dhis2/capture-app).
>
> **This document is the authoritative inventory of every ECRAAT customization.**
> It is intentionally *intent-focused*: it describes WHAT the final app must do and WHY,
> not exact line-by-line diffs, because the upstream code will have changed since the last cycle.

---

## 1. Context and mission

The ECRAAT app ("ECRAAT Detention Facility Risk Assessment" / display name **Data Capture**) is a
simplified fork of the DHIS2 Capture app, tailored for users who are **not DHIS2-literate**.
Compared to stock Capture, it:

- Replaces the "Get started" splash with a **simple, filterable list of detention places** (org units).
- **Removes almost all selector/filter/navigation chrome** (scope selector, working-list tabs,
  filters, column controls) so users follow one linear workflow:
  *pick a place → see its sectors/buildings → open one → fill assessment forms*.
- Strips the enrollment dashboard down to the **Stages & Events widget**, centered on the page,
  followed by **read-only cards listing events from related event programs**.
- Adds two productivity features for assessments: **"Replicate last event"** (copy the previous
  completed form) and **prefill from a companion event program**.
- Makes event **notes prominent**: the Notes section is renamed "Notes about this event" and moved
  to the top of the new/edit/view event pages.
- Adds operational guardrails: an account-security gate (email + 2FA), an environment banner,
  and mobile-friendly spacing fixes.

### Your working environment

You are in a workspace repository with this layout:

```
/                        ← this playbook file lives here
/legacy/                 ← the previous, fully working ECRAAT app (your reference implementation)
/source/                 ← a fresh clone of the latest upstream dhis2/capture-app (you modify THIS)
```

**Target DHIS2 server version: 2.43** (the previous cycle targeted 2.41). All file paths below are
relative to `source/` unless prefixed with `legacy/`.

### Definition of done

`source/` builds successfully, passes the chunk-cycle check, and reproduces every behavior in the
inventory below, verified against the smoke-test checklist in Phase 6.

---

## 2. Ground rules

1. **Intent over code.** When an upstream file has been refactored/renamed since `legacy/`, do NOT
   force the old code in. Find where the same responsibility now lives and re-apply the *intent*.
   Use `legacy/` to understand exact behavior, styling values, and IDs.
2. **Be non-invasive.** Never delete upstream code paths. Hide/replace behavior behind flags in
   `src/ecraat/ecraat-config.ts` with conditional rendering, early returns, or upstream extension
   points (`shouldHideWidget`, `withDataEntryFieldIfApplicable`, `defaultFormValues`, …).
   Every flag must restore stock behavior when set to `false`/`null`.
3. **Mark everything.** Prefix every edit in an upstream file with a `// ECRAAT:` comment
   (or `{/* ECRAAT: ... */}` in JSX). The previous cycle missed markers on a few one-line edits
   (widget-config callbacks, a `.filter()` change, a button label) — do better: *no unmarked edits*.
4. **Config first.** New toggles/IDs go in `ecraat-config.ts`, never hardcoded in upstream files.
5. **Copy self-contained files verbatim** from `legacy/` (the `src/ecraat/` module, the `Ecraat*`
   components, `StageReplicateButton/`, `scripts/analyzeChunkCycles.mjs`), then fix imports/types
   against the current upstream. These files never conflict with upstream.
6. **Verify upstream extension points still exist** before relying on them (they are listed per
   feature below). If one disappeared, find its successor; only as a last resort re-create the
   mechanism, marked with `// ECRAAT:`.
7. **Work feature by feature**, committing after each phase, so a broken step is easy to isolate.

---

## 3. Phase 0 — Baseline

- [ ] Read `source/README.md` and `source/package.json`; note the required Node version
      (check `.nvmrc` / `engines`) and install dependencies (`yarn install`).
- [ ] Build the **unmodified** upstream app once (`yarn build`) and make sure it succeeds.
      Every later failure is then attributable to our changes. If the stock upstream build has
      extra steps (workspace pre-builds etc.), record what was needed — Phase 1 script changes
      must not break them.
- [ ] Skim Appendix B (key upstream components) and Appendix C (target render trees) below to
      build a mental model of what the finished app looks like before touching code.

---

## 4. Phase 1 — App identity, tooling and build config

- [ ] **`d2.config.js`** — rebrand and detach from core-app status:
      set `name: 'ecraat-data-capture'`, `title: 'Data Capture'`; **remove** `id`,
      `coreApp: true`, and `minDHIS2Version` (the app installs as a custom app, not the bundled
      Capture replacement). Keep everything else upstream.
- [ ] **`package.json`** — set `"name": "ecraat-data-capture"` and an ECRAAT version
      (continue from legacy's `version`, e.g. `1.x` — do NOT keep upstream's `105.x`).
      Add script `"analyze:chunks": "node scripts/analyzeChunkCycles.mjs"`.
- [ ] **`package.json` scripts (optional Windows convenience, evaluate first):** legacy simplified
      `start` → `d2-app-scripts start` and `build` → `d2-app-scripts build`, dropping the
      `verifyCacheVersion`/workspace pre-build steps. Only do this if the app still builds and runs
      correctly without those steps on the current upstream; otherwise keep upstream's scripts.
- [ ] **`public/manifest.json`** — `name`/`short_name`: `"Data Capture"`.
- [ ] **`public/dhis2-app-icon.png`** — copy the ECRAAT icon from `legacy/public/dhis2-app-icon.png`.
- [ ] **`.npmrc`** — create with `legacy-peer-deps=true`.
- [ ] **`.gitignore`** — add an `/imported` entry (local working folder).
- [ ] **Windows dev-environment tweaks (optional, keep if developing on Windows):**
      `.eslintrc` → add `"linebreak-style": "off"`; `.husky/pre-push` → comment out
      `yarn linter:check && yarn tsc:check` (CRLF causes false positives). Leave these upstream
      if the team develops on Linux/macOS/CI.
- [ ] **patch-package dev-server fix** — add `patch-package` as a devDependency, prepend it to
      the postinstall script (`"postinstall": "patch-package && husky install && …"`), and copy
      `legacy/patches/@dhis2+cli-app-scripts+12.9.2.patch`. The patch stops `yarn start` from
      crashing when editors write files atomically (safe-write `*.tmp.<pid>.*` files): it makes
      the compiler's chokidar watcher ignore temp files, wait for writes to finish, and swallow
      transient ENOENT during copy. ⚠️ The patch is pinned to `@dhis2/cli-app-scripts` **12.9.2**;
      the fresh upstream will likely use a newer version. First test whether the problem still
      exists (run the dev server and save source files repeatedly); if yes, re-create the patch
      against the installed version (`npx patch-package @dhis2/cli-app-scripts` after editing
      `node_modules`); if upstream fixed the watcher, drop the patch entirely.
- [ ] **`scripts/analyzeChunkCycles.mjs`** — copy verbatim from `legacy/scripts/`. It statically
      proves the production bundle's eager chunk graph is acyclic (exit 1 if not).
- [ ] **`vite.config.mts`** — add `build.chunkSizeWarningLimit: 1500` and a
      `rollupOptions.output.manualChunks(id)` function that splits **only** the map libraries
      (`leaflet`, `leaflet-draw`, `react-leaflet`, `@react-leaflet`, `react-leaflet-draw`,
      `react-leaflet-search-unpolyfilled`) into a `vendor-maps` chunk, leaves `moment` untouched
      (per-locale dynamic chunks must keep working), and puts **all other** node_modules into a
      single `vendor` chunk. Copy the implementation and its explanatory comments from
      `legacy/vite.config.mts`.

      ⚠️ **CRITICAL:** finer vendor splits (react, dhis2, redux/rxjs, lodash…) have crashed this
      app in production with cross-chunk init-order errors ("X is not a function"). `vendor-maps`
      was the ONLY verifiably safe split. After ANY change to chunking — and once at the end of
      the rebuild — run `yarn build && yarn analyze:chunks` and require **PASS**.

---

## 5. Phase 2 — The `src/ecraat/` module (new code, copy then adapt)

Copy the whole `legacy/src/ecraat/` folder into `source/src/ecraat/`, then reconcile each file
against current upstream APIs:

- [ ] **`ecraat-config.ts`** — the single source of truth for all flags and instance-specific IDs.
      Carry over as-is. Current values that MUST be verified against the target 2.43 instance
      (they are metadata UIDs of the ECRAAT server, not upstream constants):

      | Key | Current value | Meaning |
      |---|---|---|
      | `homePage.programId` | `Bi1Zu6UjfmG` | Tracker program listing the org units on the home page |
      | `homePage.defaultTemplateId` | `Bi1Zu6UjfmG-default` | Working-list template appended to home-page links |
      | `breadcrumb.enrollmentDashboardAttributeId` | `ORpKveoai1g` | TEI attribute shown instead of "Enrollment dashboard" |
      | `prefillFromEventProgram.targetStageId` | `V8LAoeKM9LJ` | Stage whose new-event form gets prefilled |
      | `prefillFromEventProgram.sourceProgram` | `wr07HD8uWvu` | Event program supplying prefill values |
      | `prefillFromEventProgram.sourceStage` | `OAuzv6FXg9h` | Stage inside the source program |
      | `relatedEventPrograms.programs[0].programId` | `wr07HD8uWvu` | Read-only related-events card, queried at the enrollment's org unit (`orgUnitSource: 'enrollment'`) |
      | `relatedEventPrograms.programs[1].programId` | `NvYWk2CbgrJ` | Read-only related-events card, country-level program (`orgUnitSource: 'fixed'`) |
      | `relatedEventPrograms.programs[1].orgUnitId` | `JN2W3Y3t5b1` | Fixed country-level org unit for that card |

      Flag values worth knowing: `eventForm.hideNotesSection` is currently **`false`** (notes are
      shown — see 4.10; the flag exists so they can be hidden again later).

- [ ] **`ecraat-overrides.css`** — CSS safety net that hides elements by stable `data-test`/`id`
      selectors (scope-selector quick selector, template chips, filter bar, quick-actions /
      enrollment-note / enrollment widgets). Code-level hiding is primary; this is backup.
      Verify the selectors still exist in the current upstream (they are used by upstream Cypress
      tests, so they are usually stable).
- [ ] **`index.ts`** — barrel re-exporting `ecraatConfig`, `usePrefillOnEnrollmentPage`,
      `getPrefillFormValues`, `isRelatedEventProgram`.
- [ ] **`isRelatedEventProgram.ts`** — helper returning `true` when a programId is one of the
      configured `relatedEventPrograms` (used to keep their events read-only in the viewer, 4.15).
- [ ] **`RelatedProgramEvents/`** (`RelatedProgramEvents.tsx`, `RelatedProgramEventCard.tsx`,
      `useRelatedProgramEventData.ts`, `index.ts`) — the read-only related-events cards.
      Behavior contract (wiring into the dashboard is 4.15):
      - One collapsible card (upstream `Widget`) per configured program, titled with the
        program's display name.
      - Org unit per card: the enrollment's org unit (`orgUnitSource: 'enrollment'`) or a fixed
        one (`orgUnitSource: 'fixed'` + `orgUnitId`).
      - Data: program metadata (`/api/programs/{id}` — first stage's `displayInReports` data
        elements incl. option sets) + up to 50 events (`tracker/events`, `order=occurredAt:desc`,
        handling both `instances`/`events` response shapes).
      - Table columns: Date, Status, then one column per `displayInReports` data element
        (header = formName || displayName); values formatted with upstream's
        `convertServerToClient`/`convertClientToList` converters, option-set codes resolved to
        display names (incl. comma-separated multi-text), raw value as fallback.
      - Clicking a row opens `/viewEvent?viewEventId=…&orgUnitId=<enrollment org unit>&programId=<enrollment program>`
        — deliberately the *enrollment's* context, so back-navigation returns to where the user
        came from (see 4.15).
      - Loading / no-org-unit / empty states rendered inside the card.
- [ ] **`prefillStore.ts`** — tiny module-level store `{ set/getPrefillFormValues(orgUnitId) }`,
      keyed by orgUnitId so values stay correct across org-unit navigation.
- [ ] **`usePrefillOnEnrollmentPage.ts`** — hook that fetches the most recent COMPLETED event of
      the configured source program/stage for the current org unit (`tracker/events`, pageSize 1,
      `order=occurredAt:desc`, `fields=dataValues[dataElement,value]`), and stores its dataValues
      in the prefill store. Returns `{ isPrefillLoading }`. Handles both `instances` and `events`
      response shapes of the tracker API. Uses upstream's `useApiDataQuery` helper — verify that
      helper still exists (`capture-core/utils/reactQueryHelpers`), otherwise use `useDataEngine`.
- [ ] **`useProfileCheck.ts`** — hook that queries `/api/me?fields=email,userCredentials[twoFA]`
      on mount and every 20 minutes; returns `{ showWarning, emailMissing, twoFAMissing, dismiss }`.

      ⚠️ **2.43 ADAPTATION REQUIRED:** the `userCredentials[twoFA]` boolean was reworked in
      DHIS2 2.42+ (2FA became multi-type; look for fields like `twoFactorType` on `/api/me`).
      Query the actual target instance (`GET /api/me?fields=*` as a user with and without 2FA)
      and adapt the field + truthiness check. The *contract* to preserve: `twoFAMissing === true`
      iff the user has no active 2FA method; `emailMissing === true` iff `email` is absent/blank.
- [ ] **`ProfileSetupWarning/`** — blocking `@dhis2/ui` modal (title "Account Security Setup",
      app label "ECRAAT Data Capture") shown instead of the app when email and/or 2FA are
      missing. Contains deep links to `dhis-web-user-profile/#/profile` and `#/twoFactor`
      (verify these user-profile-app routes still exist on 2.43) and a "Refresh Page" button.
      **Deployment toggle:** only enforced in production builds and never on localhost
      (see Phase 4.13).
- [ ] **`TestingBanner/`** — red full-width banner: "FOR TESTING PURPOSE ONLY", or "FOR TRAINING
      PURPOSE ONLY" when the hostname matches `/training/i`. **Deployment toggle:** the constant
      `displayTestingBanner` at the top of `TestingBanner/index.jsx` (currently `true`) — set
      `false` for real production releases.
- [ ] Wire the CSS into the entry point: in `src/index.tsx`, add
      `// ECRAAT: Import UI customization overrides` + `import './ecraat/ecraat-overrides.css';`.

---

## 6. Phase 3 — New capture-core components (copy then adapt)

Copy these folders from `legacy/src/core_modules/capture-core/components/` into the same location
in `source/`, then fix imports/types against current upstream:

- [ ] **`EcraatHomePage/`** (`EcraatHomePage.component.tsx`, `useOrgUnitsForProgram.ts`, `index.ts`)
      — the replacement home page. Behavior contract:
      - Fetches org units assigned to `homePage.programId` via `/api/programs/{id}?fields=organisationUnits[id,displayName,level,parent[displayName]]`, keeps **level 3** only ("detention places"), sorted by name.
      - Renders title **"Detention places"**, a name search box, a "Filter by region" select
        (region = parent org unit), a sortable 3-column DataTable (Organisation unit / Region /
        "Open" button), client-side pagination (10/25/50/100), and a "Showing X of Y" footer.
      - "Open" navigates to the working list: `?orgUnitId=…&programId=…&selectedTemplateId=…`
        (template omitted when `defaultTemplateId` is null) using upstream's
        `useNavigate`/`buildUrlQueryString` from `capture-core/utils/routing`.
- [ ] **`EcraatRegisterButton/`** — primary button above the working list; label and "+" icon from
      `ecraatConfig.mainPage.registerButtonLabel` / `registerButtonShowPlusIcon` (currently
      **"Register new sector or building"**). Navigates to `new?programId=…&orgUnitId=…` the same
      way upstream `TopBarActions` does.
- [ ] **`WidgetStagesAndEvents/Stages/Stage/StageReplicateButton/`** (`StageReplicateButton.tsx`,
      `ReplicateEventDialog.tsx`, `useReplicateEvent.ts`, `index.ts`) — the "Replicate last event"
      feature. Behavior contract:
      - Button "**Replicate last {{eventName}} event**" with "+" icon, hidden without stage write
        access, opens a modal.
      - Modal logic (`getReplicateStatus`): if no COMPLETED non-deleted event exists → warning
        "no completed event to be replicated…"; if an ACTIVE non-deleted event exists → warning
        "already an active event… complete or delete it first"; otherwise ready, using the most
        recent COMPLETED event (by `occurredAt`) as source.
      - Ready state: CalendarInput date picker; the new report date must be **strictly after** the
        source event's date; "Confirm replication" POSTs a new event to `tracker?async=false`
        copying program/programStage/orgUnit/trackedEntity/enrollment and all dataValues, with
        `status: 'ACTIVE'` and a fresh UID (upstream `generateUID()`), then dispatches upstream's
        `addPersistedEnrollmentEvents` so the dashboard updates without reload. API validation
        errors (from `validationReport.errorReports`) are surfaced in the modal.

---

## 7. Phase 4 — Surgical edits to upstream files

Each item: intent → file(s) → change → check. Reference implementations for every item are in the
same path under `legacy/`. Add `// ECRAAT:` markers on all of them.

### 4.1 Home page swap
- **File:** `…/Pages/MainPage/MainPageBody/MainPageBody.component.tsx`
- In the `MainPageStatuses.DEFAULT` branch, render `<EcraatHomePage />` instead of
  `<NoSelectionsInfoBox />` when `ecraatConfig.homePage.enabled`.
- ✔ Opening the app with no org unit selected shows the Detention places table.

### 4.2 Scope selector → org-unit name header
- **File:** `…/ScopeSelector/ScopeSelector.component.tsx`
- When `ecraatConfig.mainPage.hideScopeSelector`: render, instead of the Program/OrgUnit/Category
  selector bar, a simple header containing only the selected org unit's display name (from the
  redux store), inside a `div` that keeps `data-test="scope-selector"`. Keep upstream rendering
  intact for the `false` case. Note: `TopBarActions` children passed to ScopeSelector must still
  render where needed — mirror `legacy/` exactly here.
- ✔ Working-list page shows just the place name as a heading; no program/org-unit pickers anywhere.

### 4.3 Working-list simplification
- **Files:** `…/WorkingLists/WorkingListsBase/TemplateSelector.component.tsx`,
  `…/ListView/Main/ListViewMain.component.tsx`
- TemplateSelector: early-return `null` when `ecraatConfig.mainPage.hideTemplateTabs`.
- ListViewMain: return `null` from the method rendering the top bar (filters + column selector +
  menu) when `ecraatConfig.mainPage.hideWorkingListFilters` — but do NOT suppress the bulk-action
  bar branch if upstream renders it from the same method.
- ✔ The list shows only the table + pagination: no Active/Completed/Cancelled tabs, no filter
  buttons, no gear/three-dot controls.

### 4.4 Register button above the working list
- **File:** `MainPageBody.component.tsx` (same as 4.1)
- In the working-list branch, render `<EcraatRegisterButton programId orgUnitId />` above the list
  (legacy conditions it on `ecraatConfig.mainPage.hideScopeSelector` since it replaces the hidden
  top-bar action).
- ✔ "Register new sector or building" button navigates to the registration form with org unit and
  program preselected.

### 4.5 Centered layouts
- **Files:** `MainPageBody.component.tsx`;
  `…/Pages/common/EnrollmentOverviewDomain/EnrollmentPageLayout/EnrollmentPageLayout.tsx`
- Main page (`ecraatConfig.mainPage.centerContent`): constrain the working-list container to
  `maxWidth: 900, margin: '0 auto', width: '100%'`.
- Enrollment dashboard (`ecraatConfig.enrollmentDashboard.centerContent`): suppress the right
  column entirely (`hasRightColumn = !centeredLayout && …`), center the columns, let the left
  column take full width, and apply the same 900px centering to the content container.
- ✔ Both pages render as a single centered column, ~900px wide.

### 4.6 Enrollment dashboard — hide widgets
- **Files:** `…/EnrollmentPageLayout/LayoutComponentConfig/LayoutComponentConfig.ts`,
  `…/Pages/Enrollment/EnrollmentPageDefault/EnrollmentPageDefault.container.tsx`,
  `…/EnrollmentQuickActions/EnrollmentQuickActions.component.tsx`
- Uses upstream's `shouldHideWidget` mechanism. In LayoutComponentConfig, add/extend
  `shouldHideWidget: ({ hideWidgets }) => hideWidgets?.<key>` on the **QuickActions**,
  **EnrollmentNote**, **ProfileWidget** and **EnrollmentWidget** configs (EnrollmentWidget already
  has a `shouldHideWidget` for `enrollmentId === 'AUTO'` — OR the conditions).
- In EnrollmentPageDefault.container, merge the config flags into the `hideWidgets` object passed
  down: each key = `ecraatConfig.enrollmentDashboard.hideX || ruleHideWidgets?.x`.
- EnrollmentQuickActions: wrap its JSX in `<div data-test="widget-quick-actions">` so the CSS
  backup can target it.
- ✔ Dashboard shows only the Stages & Events widget and the related-events cards (4.15) —
  no Quick Actions, no enrollment notes, no Enrollment status widget, no Profile card.

### 4.7 Profile actions in the breadcrumb header
- **Files:** `…/WidgetProfile/WidgetProfile.component.tsx` + `widgetProfile.types.ts`;
  `EnrollmentPageLayout.tsx`
- Add an `actionsOnly?: boolean` prop to WidgetProfile: when set, render ONLY the Edit button
  (when editable) + the overflow menu + the edit modal machinery, in a small flex row with
  `data-test="profile-widget-actions-only"` — no card/widget wrapper. Keep the full-card path
  untouched.
- In EnrollmentPageLayout, wrap the breadcrumb in a `space-between` flex row and, when
  `ecraatConfig.enrollmentDashboard.showProfileActionsInHeader`, render
  `<WidgetProfile actionsOnly …/>` on the right (teiId/orgUnitId/callbacks come from the page
  props — see legacy for the exact wiring).
- ✔ Edit + "…" buttons sit on the breadcrumb line; Edit opens the same profile-edit modal as the
  stock Profile widget; delete still navigates away correctly.

### 4.8 Breadcrumb labels
- **File:** `…/Breadcrumbs/EnrollmentBreadcrumb/EnrollmentBreadcrumb.tsx`
- First crumb: replace the working-list label with `ecraatConfig.breadcrumb.mainPageLabel`
  (currently **"Sector/Building list"**; empty/null → keep upstream label).
- "Enrollment dashboard" crumb: when `breadcrumb.enrollmentDashboardAttributeId` is set and the
  TEI has a value for that attribute (from the enrollment domain redux state), show that value
  (e.g. the building's name) instead.
- ✔ Breadcrumb reads like: *Sector/Building list / Main building / …*

### 4.9 Stages & events adjustments
- **Files:** `…/WidgetStagesAndEvents/Stages/Stages.component.tsx`,
  `…/Stage/StageCreateNewButton/StageCreateNewButton.tsx`, `…/Stage/Stage.component.tsx`,
  `…/Stage/StageDetail/StageDetail.component.tsx`
- Stages: filter stages by `stage.dataAccess.read && stage.dataAccess.write` (stock shows
  read-only stages greyed out; we hide them completely).
- StageCreateNewButton: label becomes **"New blank {{ eventName }} event"** ("blank" distinguishes
  it from Replicate).
- Wire `StageReplicateButton` next to the create button in BOTH places: the stage's empty state
  (`Stage.component.tsx`, flex row, 8px gap; write access via `stage.dataAccess.write`) and the
  stage detail footer (`StageDetail.component.tsx`, flex row with gap+wrap; write access via
  `stage?.access?.data?.write` there — the two components model stage access differently).
- ✔ A user without write access to a stage doesn't see it at all; stages show both "New blank …"
  and "Replicate last …" buttons whether or not events exist.

### 4.10 Event forms — hide Schedule tab & OrgUnit field; make Notes prominent
- **Files:** `…/Pages/EnrollmentAddEvent/NewEventWorkspace/NewEventWorkspace.component.tsx`,
  `…/WidgetEventEdit/EditEventDataEntry/EditEventDataEntry.component.tsx`,
  `…/WidgetEnrollmentEventNew/DataEntry/DataEntry.component.tsx`,
  `…/DataEntries/SingleEventRegistrationEntry/DataEntryWrapper/DataEntry/DataEntry.component.tsx`,
  `…/Pages/EnrollmentEditEvent/PageLayout/DefaultPageLayout.constants.ts`,
  `…/Pages/ViewEvent/EventDetailsSection/EventDetailsSection.component.tsx`,
  `…/Pages/ViewEvent/RightColumn/RightColumnWrapper.component.tsx`,
  `…/Pages/ViewEvent/RightColumn/NotesSection/NotesSection.component.tsx`
- Schedule tab (`eventForm.hideScheduleTab`): wrap the Schedule `<Tab>` in both the new-event
  workspace and the edit-event data entry.
- Org unit field (`eventForm.hideOrgUnitField`): in both new-event and edit-event compose chains,
  replace `withDataEntryField(buildOrgUnitSettingsFn())` with `withDataEntryFieldIfApplicable({
  ...buildOrgUnitSettingsFn(), isApplicable: () => !ecraatConfig.eventForm.hideOrgUnitField })`
  (the `IfApplicable` HOC is upstream, already used for geometry/assignee).
- Notes toggle (`eventForm.hideNotesSection`, currently **`false`** = notes shown): same
  `IfApplicable` treatment for `buildNotesSettingsFn()` in the new-event DataEntry compose chain.
  *History:* an earlier iteration hid notes entirely; June 2026 reversed that — notes are wanted,
  and prominent. Keep the flag wired but leave it `false`.
- Notes made prominent — **"Notes about this event", at the TOP of every event page**:
  - New-event form (`WidgetEnrollmentEventNew/DataEntry`) and single-event form
    (`SingleEventRegistrationEntry/…/DataEntry`): change the notes section placement from
    `placements.BOTTOM` to `placements.TOP` (both in `buildNotesSettingsFn().getMeta` and in
    `dataEntrySectionDefinitions`, listing NOTES first) and rename the section from "Notes" to
    **"Notes about this event"**.
  - Edit-event page layout constants (`EnrollmentEditEvent/PageLayout`): make sure the `EventNote`
    widget is registered and placed at the **top of the left column, before `EditEventWorkspace`**
    (upstream places it lower).
  - View-event page: remove `NotesSection` from the right column (`RightColumnWrapper`) and render
    it instead at the top of `EventDetailsSection`'s main column (give the container a vertical
    flex layout with a 16px gap); rename its header to **"Notes about this event"**. Notes are
    suppressed there for read-only related-program events — see 4.15.
- ✔ New/edit/view event pages show no Schedule tab and no Organisation unit field; a
  "Notes about this event" section appears at the top of each of these pages.

### 4.11 Prefill from the companion event program
- **Files:** `EnrollmentPageDefault.container.tsx` (again),
  `…/WidgetEnrollmentEventNew/DataEntry/helpers/getOpenDataEntryActions.ts`
- On the enrollment dashboard, call `usePrefillOnEnrollmentPage(orgUnitId)` and pass
  `events={isPrefillLoading ? undefined : enrollment?.events}` to the page layout so the Stages
  widget waits for prefill data (prevents opening the form before values are ready).
- In `getOpenDataEntryActions`, pass a 5th argument to `loadNewDataEntry`: when the current URL's
  `stageId` equals `ecraatConfig.prefillFromEventProgram?.targetStageId` and an `orgUnitId` is
  present, `getPrefillFormValues(orgUnitId)`, else `undefined`. This uses upstream's
  `defaultFormValues` parameter of `loadNewDataEntry` — verify the parameter still exists; if it
  was removed, find how default form values are injected now.
- ✔ Opening a "New blank event" form for the target stage arrives pre-populated with the values of
  the org unit's latest completed event from the source program; other stages are unaffected.

### 4.12 Testing/training banner (deployment toggle)
- **Files (7 top bars):** `…/Pages/MainPage/TopBar/TopBar.container.tsx`,
  `…/Pages/Enrollment/TopBar.container.tsx`, `…/Pages/EnrollmentEditEvent/TopBar.container.tsx`,
  `…/Pages/EnrollmentAddEvent/TopBar/TopBar.component.tsx`, `…/Pages/New/TopBar.container.tsx`,
  `…/Pages/Search/TopBar.container.tsx`, `…/Pages/ViewEvent/TopBar.container.tsx`
- Render `<TestingBanner />` immediately above the `<ScopeSelector>` in each (wrap in a fragment).
  If upstream has added/removed page top bars since, cover ALL of them — the banner must appear on
  every page.
- ✔ Red banner on every page; toggled centrally via `displayTestingBanner` in
  `src/ecraat/TestingBanner/index.jsx` (**decide the correct value for this deployment**).

### 4.13 Account-security gate (deployment toggle)
- **File:** `src/components/App/AppContents.component.tsx`
- Call `useProfileCheck()`; when `showWarning && process.env.NODE_ENV === 'production'` **and the
  hostname does not start with `localhost`**, render `<ProfileSetupWarning emailMissing
  twoFAMissing />` INSTEAD of the app content (blocking). Dev builds and localhost never block.
- ✔ In a deployed production build, a user without email or 2FA sees only the security-setup
  modal; compliant users see the app; a production build served on localhost is never blocked.
  (Remember the 2.43 API adaptation in Phase 2 / `useProfileCheck`.)

### 4.14 Mobile & spacing fixes
- **Files:** `AppContents.component.tsx` (again), `…/Widget/WidgetCollapsible.component.tsx` +
  `widgetCollapsible.types.ts`, `…/WidgetStagesAndEvents/WidgetStagesAndEvents.component.tsx`,
  `StageDetail.component.tsx` (again)
- App container: add `paddingBottom: 96px` to the `app` style — body/html use `overflow: hidden`,
  so without a spacer the last content can't scroll into view on mobile browsers.
- WidgetCollapsible: add an optional `contentClassName` prop applied to the contents div, and
  `marginBottom: dp16` on the children style.
- WidgetStagesAndEvents: pass a `contentClassName` adding `margin-bottom: 32px` (emotion css).
- StageDetail: add `paddingBottom: 25px` to the footer that holds the bottom buttons.
- ✔ On a mobile browser, the bottom buttons of the last widget are fully reachable; collapsible
  widgets have breathing room below their content.

### 4.15 Related event programs — read-only cards on the enrollment dashboard
- **Files:** `…/Pages/Enrollment/EnrollmentPageDefault/DefaultPageLayout/DefaultPageLayout.constants.ts`,
  `…/EnrollmentPageLayout/DefaultEnrollmentLayout.types.ts`,
  `…/Pages/ViewEvent/EventDetailsSection/EventDetailsSection.component.tsx`,
  `…/Pages/ViewEvent/ViewEventComponent/ViewEvent.component.tsx` + `viewEvent.actions.ts`,
  `…/Pages/ViewEvent/epics/viewEvent.epics.ts`
- **Dashboard wiring:** in the enrollment-dashboard page-layout constants, register a
  `RelatedProgramEvents` widget config — `Component` from `src/ecraat/RelatedProgramEvents`,
  `shouldHideWidget: () => !ecraatConfig.relatedEventPrograms.enabled`, `getProps` mapping the
  page's `orgUnitId`/`program.id` to `enrollmentOrgUnitId`/`enrollmentProgramId` — and add it to
  the left column **right after `StagesAndEvents`**. Add `'RelatedProgramEvents'` to the
  `DefaultComponents` type union.
- **Read-only viewer:** in `EventDetailsSection`, compute `isRelatedEventProgram(programId)`;
  when true, hide the Edit button and do not render the notes section (these events belong to
  other programs and must stay view-only here).
- **Back navigation:** the card rows open `/viewEvent` with the *enrollment's* `orgUnitId` and
  `programId` in the URL. Extend `startGoBackToMainPage` to accept and carry a `programIdFromUrl`
  payload, and make the back-to-main-page epic prefer it over the store's current program, so
  "Back to all events" returns the user to the sector/building working list they came from —
  not to the related event program's own context.
- ✔ Below Stages & Events, one card per configured program shows a table of that program's events
  (Date, Status, report columns with human-readable values); rows open the event read-only
  (no Edit button, no notes); "back" from the viewer returns to the original working list;
  setting `relatedEventPrograms.enabled = false` removes the cards entirely.

---

## 8. Phase 5 — i18n

- [ ] Regenerate the translation template so the new/changed strings ("New blank … event",
      "Replicate last … event", dialog texts, home-page labels…) are extracted:
      `yarn i18n:add` (runs `d2-app-scripts i18n extract`). Do NOT hand-edit `i18n/en.pot`.

---

## 9. Phase 6 — Verification

Build gates (all must pass):

- [ ] `yarn tsc:check` (or the upstream type-check script) — clean.
- [ ] `yarn build` — succeeds.
- [ ] `yarn analyze:chunks` — prints **PASS** (acyclic eager chunk graph). FAIL = the app can
      crash at load in production; fix chunking before anything else.
- [ ] `grep -r "ECRAAT" src/` — every feature in Phase 4 is represented; use this playbook's
      inventory (not grep alone) as the completeness reference.

Smoke tests against the 2.43 instance (run the app with `yarn start`, connect to the target server):

- [ ] **Home page:** Detention places table loads (level-3 org units of the configured program);
      search, region filter, sorting and pagination work; "Open" lands on the working list.
- [ ] **Working list:** only org-unit name header + register button + plain table; no scope
      selector, tabs, filters, or column controls.
- [ ] **Register:** button opens the pre-scoped registration form; a new TEI can be created.
- [ ] **Enrollment dashboard:** centered single column; breadcrumb shows custom labels (place
      attribute as second crumb); Edit + overflow next to breadcrumb work; only Stages & Events
      widget visible; stages without write access absent.
- [ ] **Replicate:** with no completed event → warning; with an active event → warning; happy path
      creates a copy dated strictly after the source, dashboard updates without reload.
- [ ] **Prefill:** "New blank event" on the target stage opens pre-filled from the source program's
      latest completed event for that org unit.
- [ ] **Event forms:** no Schedule tab, no Organisation unit field; "Notes about this event"
      section at the TOP of the new-event, edit-event and view-event pages.
- [ ] **Related events cards:** below Stages & Events, one card per configured program with
      Date/Status/report columns and readable values (option-set names, formatted dates);
      the fixed-org-unit card shows country-level events regardless of the current place;
      clicking a row opens the event read-only (no Edit button, no notes) and "back" returns
      to the original sector/building list.
- [ ] **Banner:** shows on every page; "TRAINING" variant on a hostname containing "training".
- [ ] **Security gate (production build, non-localhost only):** test with a user lacking
      email/2FA → blocking modal with working profile/2FA links; compliant user passes through;
      localhost is never blocked. Confirm the 2FA detection works against **2.43's** `/api/me`
      shape.
- [ ] **Mobile:** on a phone-sized viewport, bottom-most buttons are reachable.

---

## 10. Maintenance loop (how this document stays alive)

1. This playbook is **the key artifact of the ECRAAT maintenance process**. It must be carried
   into the rebuilt repo and updated there.
2. **Every future customization** must be added here as a new checklist item (intent, files,
   change, acceptance check) at the time it's made — plus a `// ECRAAT:` marker in the code and,
   if it's a toggle, a flag in `ecraat-config.ts`.
3. When a rebuild cycle completes: the new repo becomes the next cycle's `legacy/`; update the
   "Target DHIS2 server version" and instance-ID table at that time; retire items that upstream
   has made obsolete (note them in a "Retired" section rather than deleting them silently).
4. Deployment toggles to review at every release: `TestingBanner` (`displayTestingBanner`),
   `ProfileSetupWarning` (production-only gate), and every flag in `ecraat-config.ts`.

---

## Appendix A — Inventory summary

**New files (never conflict with upstream — copy from `legacy/`):**
`src/ecraat/**` (config, CSS overrides, barrel, prefill store + hook, profile-check hook,
ProfileSetupWarning, TestingBanner, RelatedProgramEvents, isRelatedEventProgram),
`…/components/EcraatHomePage/**`, `…/components/EcraatRegisterButton/**`,
`…/Stage/StageReplicateButton/**`, `scripts/analyzeChunkCycles.mjs`,
`patches/@dhis2+cli-app-scripts+*.patch`, `.npmrc`.

**Modified upstream files (re-apply intent):** `src/index.tsx`,
`src/components/App/AppContents.component.tsx`, `d2.config.js`, `package.json`,
`public/manifest.json`, `public/dhis2-app-icon.png`, `vite.config.mts`, `.gitignore`, `.eslintrc`,
`.husky/pre-push`, plus the capture-core files listed per feature in Phase 4:
MainPageBody, ScopeSelector, TemplateSelector, ListViewMain, LayoutComponentConfig,
EnrollmentPageDefault.container, EnrollmentQuickActions, EnrollmentPageLayout,
EnrollmentBreadcrumb, WidgetProfile (+types), Stages, StageCreateNewButton, Stage, StageDetail,
NewEventWorkspace, EditEventDataEntry, DataEntry (WidgetEnrollmentEventNew),
DataEntry (SingleEventRegistrationEntry), getOpenDataEntryActions,
DefaultPageLayout.constants (EnrollmentEditEvent + EnrollmentPageDefault),
DefaultEnrollmentLayout.types, EventDetailsSection, NotesSection, RightColumnWrapper,
ViewEvent.component (+ viewEvent.actions, viewEvent.epics),
WidgetCollapsible (+types), WidgetStagesAndEvents, and the seven page TopBar containers.

---

## Appendix B — Key upstream components and utilities

Paths are under `src/core_modules/capture-core/components/` unless noted; they may have moved
since the last cycle — search by component name if a path is stale.

| Component | Path | What it renders |
|---|---|---|
| **MainPage** | `Pages/MainPage/MainPage.component.tsx` | Top-level: TopBar + MainPageBody |
| **ScopeSelector** | `ScopeSelector/ScopeSelector.component.tsx` | Program/OrgUnit/Category selectors |
| **MainPageBody** | `Pages/MainPage/MainPageBody/MainPageBody.component.tsx` | Home page or working list |
| **TemplateSelector** | `WorkingLists/WorkingListsBase/TemplateSelector.component.tsx` | Template tabs (Active/Completed/…) |
| **ListViewMain** | `ListView/Main/ListViewMain.component.tsx` | Filter bar + data table + pagination |
| **EnrollmentPageDefault** | `Pages/Enrollment/EnrollmentPageDefault/EnrollmentPageDefault.container.tsx` | Enrollment dashboard container |
| **EnrollmentPageLayout** | `Pages/common/EnrollmentOverviewDomain/EnrollmentPageLayout/EnrollmentPageLayout.tsx` | Dashboard layout (columns, breadcrumb, widgets) |
| **LayoutComponentConfig** | `…/EnrollmentPageLayout/LayoutComponentConfig/LayoutComponentConfig.ts` | Widget visibility configuration (`shouldHideWidget`) |
| **EnrollmentBreadcrumb** | `Breadcrumbs/EnrollmentBreadcrumb/EnrollmentBreadcrumb.tsx` | Breadcrumb navigation |
| **Stages / Stage / StageDetail** | `WidgetStagesAndEvents/Stages/…` | Program stage list, single stage, event table + footer |
| **StageCreateNewButton** | `…/Stage/StageCreateNewButton/StageCreateNewButton.tsx` | "+ New blank event" button |
| **NewEventWorkspace** | `Pages/EnrollmentAddEvent/NewEventWorkspace/NewEventWorkspace.component.tsx` | New event form (Report/Schedule tabs) |
| **EditEventDataEntry** | `WidgetEventEdit/EditEventDataEntry/EditEventDataEntry.component.tsx` | Edit event form (tabs + OrgUnit field) |
| **DataEntry (New)** | `WidgetEnrollmentEventNew/DataEntry/DataEntry.component.tsx` | New event data entry compose chain |
| **WidgetProfile** | `WidgetProfile/WidgetProfile.component.tsx` | Profile card (gets `actionsOnly` mode) |
| **EventDetailsSection** | `Pages/ViewEvent/EventDetailsSection/EventDetailsSection.component.tsx` | Read-only event viewer main column (notes, edit button) |
| **RightColumnWrapper / NotesSection** | `Pages/ViewEvent/RightColumn/…` | ViewEvent side widgets (notes moved out — 4.10) |
| **ViewEvent + actions/epics** | `Pages/ViewEvent/ViewEventComponent/…`, `Pages/ViewEvent/epics/…` | Event viewer shell, back-navigation (4.15) |
| **WidgetCollapsible** | `Widget/WidgetCollapsible.component.tsx` | Collapsible widget shell (gets `contentClassName`) |
| **AppContents** | `src/components/App/AppContents.component.tsx` | App shell (security gate, bottom padding) |

| Utility | Path | Purpose |
|---|---|---|
| `generateUID()` | `capture-core/utils/uid/generateUID.ts` | 11-char DHIS2 UIDs (replicate feature) |
| `addPersistedEnrollmentEvents` | `…/EnrollmentOverviewDomain/enrollment.actions.ts` | Redux action to add events to the store |
| `withDataEntryFieldIfApplicable` | `…/DataEntry/dataEntryField/withDataEntryFieldIfApplicable.tsx` | HOC for conditional data-entry fields |
| `loadNewDataEntry(…, defaultFormValues)` | `…/DataEntry/actions/dataEntryLoadNew.actions.ts` | 5th param injects prefill form values |
| `useNavigate` / `buildUrlQueryString` | `capture-core/utils/routing` | Navigation used by home page / register button |
| `useApiDataQuery` | `capture-core/utils/reactQueryHelpers` | React-query wrapper used by the prefill hook |

---

## Appendix C — Target render trees (what "done" looks like)

### Main page

```
MainPage
├── TopBar
│   ├── TestingBanner                          ← red env banner (4.12)
│   └── ScopeSelector → org-unit name only     ← (4.2)
└── MainPageBody
    ├── [no selection] → EcraatHomePage        ← Detention places table (4.1)
    └── [working list]
        └── centered container, max-width 900  ← (4.5)
            ├── EcraatRegisterButton           ← (4.4)
            └── WorkingLists
                ├── TemplateSelector           ← HIDDEN (4.3)
                └── ListViewMain
                    ├── filter/controls bar    ← HIDDEN (4.3)
                    ├── data table
                    └── pagination
```

### Enrollment dashboard

```
EnrollmentPageDefault (waits for prefill fetch — 4.11)
└── EnrollmentPageLayout (centered, max-width 900)      ← (4.5)
    ├── Breadcrumb row (flex, space-between)
    │   ├── EnrollmentBreadcrumb (custom labels)        ← (4.8)
    │   └── WidgetProfile actionsOnly (Edit + ⋯)        ← (4.7)
    └── single centered column
        ├── WidgetStagesAndEvents (bottom margin — 4.14)
        │   └── Stages (write-access filter — 4.9)
        │       └── Stage
        │           ├── "New blank … event"             ← (4.9)
        │           └── "Replicate last … event"        ← (4.9)
        ├── RelatedProgramEvents (1 card/program)       ← read-only cards (4.15)
        │   └── rows → read-only ViewEvent page
        ├── [QuickActions]                              ← HIDDEN (4.6)
        ├── [EnrollmentNote]                            ← HIDDEN (4.6)
        ├── [EnrollmentWidget]                          ← HIDDEN (4.6)
        └── [ProfileWidget card]                        ← HIDDEN (4.6)
```

### Event form (new / edit)

```
NewEventWorkspace / EditEventDataEntry
├── TabBar
│   ├── "Report"                               ← visible
│   └── "Schedule"                             ← HIDDEN (4.10)
└── DataEntry compose chain
    ├── "Notes about this event"               ← at TOP, renamed (4.10)
    ├── Report date                            ← visible (prefilled on target stage — 4.11)
    ├── Organisation unit                      ← HIDDEN via isApplicable (4.10)
    └── Geometry / Assignee                    ← upstream conditionals, untouched

Edit-event page: EventNote widget at TOP of left column, before the workspace (4.10)

ViewEvent page (also used read-only by 4.15)
└── EventDetailsSection
    ├── "Notes about this event"               ← moved from right column (4.10);
    │                                            hidden for related-program events (4.15)
    └── Event details (Edit button hidden for related-program events — 4.15)
```

---

## Appendix D — Conventions for future customizations

1. **Prefix additions** with `Ecraat` (components/folders) or `ecraat` (files); **comment every
   upstream edit** with `// ECRAAT:` so `grep -r "ECRAAT" src/` finds them.
2. **Never remove upstream code** — add conditional blocks around it. (Small relocations are
   acceptable when the intent is repositioning, e.g. the notes section moves in 4.10 — keep the
   upstream component intact and marked.)
3. **Every toggle/ID lives in `ecraat-config.ts`**; setting a flag to `false`/`null` must restore
   stock behavior.
4. **Hiding elements:** prefer code-level conditionals via upstream extension points; use
   `ecraat-overrides.css` with `data-test`/`id` selectors only as a backup (never hashed class
   names). For data-entry fields use `withDataEntryFieldIfApplicable`, not CSS.
5. **Text changes:** drive labels from config where possible instead of editing upstream strings.
6. **And always:** add the new customization to this playbook (intent, files, change, acceptance
   check) in the same commit.
