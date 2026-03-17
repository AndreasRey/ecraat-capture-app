/**
 * ECRAAT Customization Configuration
 * ====================================
 * This file controls all ECRAAT-specific UI customizations applied on top of
 * the upstream DHIS2 Capture App. All customizations are centralized here so
 * they are easy to review, toggle, and maintain when merging upstream changes.
 *
 * HOW IT WORKS:
 * - Feature flags below toggle visibility of upstream UI elements.
 * - CSS overrides in `ecraat-overrides.css` use `data-test` and `id` selectors
 *   (stable upstream attributes) to hide elements via `display: none`.
 * - Minimal code changes reference this config to add/modify behavior.
 *
 * MAINTENANCE:
 * When pulling upstream changes, if a merge conflict appears in a file that
 * imports from this module, the resolution is usually to keep both: the upstream
 * code AND the ECRAAT conditional wrapper around it.
 */

export const ecraatConfig = {
    /**
     * Home Page — replaces the default "Get started" splash screen
     * with a filterable table of organisation units for the program.
     */
    homePage: {
        /** Show the custom OrgUnit table instead of the default splash */
        enabled: true,

        /** Program ID whose org units populate the table */
        programId: 'Bi1Zu6UjfmG',

        /** Template ID appended to navigation links (set null to omit) */
        defaultTemplateId: 'Bi1Zu6UjfmG-default',
    },

    /**
     * Main Page customizations
     */
    mainPage: {
        /** Hide the top ScopeSelector bar (Program, OrgUnit, Search, Clear) */
        hideScopeSelector: true,

        /** Hide the enrollment template tabs (Active, Completed, Cancelled) */
        hideTemplateTabs: true,

        /** Hide the working list filter buttons (Enrollment status, date, etc.) */
        hideWorkingListFilters: true,

        /** Hide the column selector gear icon and list view menu (three dots) */
        hideListViewControls: true,

        /** Custom label for the "Create new" / registration button */
        registerButtonLabel: 'Register new sector or building',

        /** Show a "+" icon prefix on the register button */
        registerButtonShowPlusIcon: true,

        /**
         * Center the working list content with a max-width constraint
         * to match the narrower, centered enrollment dashboard layout.
         */
        centerContent: true,
    },

    /**
     * Enrollment Dashboard customizations
     * Uses the upstream `shouldHideWidget` pattern in LayoutComponentConfig.ts
     * and merges flags into the `hideWidgets` prop in EnrollmentPageDefault.container.tsx.
     */
    enrollmentDashboard: {
        /** Hide the Quick Actions widget (New event / Schedule an event) */
        hideQuickActions: true,

        /** Hide the Notes about this enrollment widget */
        hideEnrollmentNotes: true,

        /** Hide the Enrollment widget (status, dates, org unit, actions) */
        hideEnrollmentWidget: true,

        /** Hide the Profile widget card from the right column */
        hideProfileWidget: true,

        /** Show the Profile Edit + overflow buttons in the breadcrumb header area */
        showProfileActionsInHeader: true,

        /**
         * Center the page content when no meaningful side column is visible.
         * When true, the right column is suppressed and the left column is
         * centered with a max-width constraint.
         */
        centerContent: true,
    },

    /**
     * Event Form customizations
     * Controls visibility of elements in the new/edit event data entry forms.
     */
    eventForm: {
        /** Hide the "Schedule" tab in the new/edit event workspace */
        hideScheduleTab: true,

        /** Hide the "Organisation unit" field (pre-filled, not editable) */
        hideOrgUnitField: true,
    },

    /**
     * Prefill from Event Program
     * When creating a new blank event for the target stage, automatically
     * fetch data values from the most recent completed event in a separate
     * event program (for the same organisation unit) and prefill matching
     * data elements in the new event form.
     */
    prefillFromEventProgram: {
        /** Stage ID that triggers prefill when creating a new blank event */
        targetStageId: 'V8LAoeKM9LJ',

        /** Event program ID to fetch the last completed event from */
        sourceProgram: 'wr07HD8uWvu',

        /** Program stage ID within the source event program */
        sourceStage: 'OAuzv6FXg9h',
    },

    /**
     * Breadcrumb customizations
     */
    breadcrumb: {
        /** Custom label to replace "Program overview" in the breadcrumb */
        mainPageLabel: 'Sector/Building list',

        /**
         * TEI attribute ID whose value will replace "Enrollment dashboard"
         * in the breadcrumb. Set to null to keep the default label.
         * e.g. 'ORpKveoai1g' → shows "Main building" (= the value of that attribute)
         */
        enrollmentDashboardAttributeId: 'ORpKveoai1g',
    },
};
