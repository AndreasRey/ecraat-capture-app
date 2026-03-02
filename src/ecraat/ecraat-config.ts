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
    },
};
