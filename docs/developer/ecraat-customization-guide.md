# ECRAAT Capture App – Customization Guide

> **For developers and AI agents** working on the ECRAAT fork of the DHIS2 Capture App.

---

## Overview

This project is a fork of the [DHIS2 Capture App](https://github.com/dhis2/capture-app). The goal is to reuse the data-collection features while simplifying the UI for ECRAAT end users.

**Core principle:** All ECRAAT customizations must be as non-invasive as possible so that pulling upstream changes causes minimal merge conflicts.

---

## Architecture of Customizations

All ECRAAT-specific code lives in a small, well-defined set of files:

### 1. `src/ecraat/ecraat-config.ts` — Central configuration

A single TypeScript object (`ecraatConfig`) containing **feature flags** that control all custom behavior. Every ECRAAT-specific conditional in the codebase reads from this config.

```ts
export const ecraatConfig = {
    mainPage: {
        hideScopeSelector: true,         // Hide Program/OrgUnit top bar
        hideTemplateTabs: true,          // Hide enrollment category tabs
        hideWorkingListFilters: true,    // Hide filter dropdowns
        hideListViewControls: true,      // Hide column-selector & menu
        registerButtonLabel: 'Register new sector or building',
        registerButtonShowPlusIcon: true,
    },
};
```

**To disable any customization**, just set the flag to `false` — no other file changes needed for CSS-based overrides.

### 2. `src/ecraat/ecraat-overrides.css` — CSS backup for element hiding

A safety-net CSS file using `data-test` attributes and HTML `id`s to hide elements. The **primary** hiding mechanism is code-level (conditional rendering), but this CSS provides a fallback.

| CSS Selector | What it hides |
|---|---|
| `[data-test="workinglists-template-selector-chips-container"]` | Enrollment tabs (Active, Completed, Cancelled) |
| `#top-bar-container-list-view-main` | Filter buttons row (Enrollment status, date, etc.) |

**Imported once** in `src/index.tsx`.

### 3. `src/core_modules/capture-core/components/EcraatRegisterButton/` — Register button

A standalone button component that:
- Reads its label and icon settings from `ecraatConfig`
- Replicates the navigation logic from `TopBarActions` (navigates to `new?programId=...&orgUnitId=...`)
- Is rendered conditionally above the working list in `MainPageBody`

### 4. Modified upstream files (minimal changes)

**4 upstream files** have small code changes:

| File | Change | Lines affected |
|---|---|---|
| `src/index.tsx` | Added `import './ecraat/ecraat-overrides.css'` | 1 line added |
| `ScopeSelector.component.tsx` | Added ECRAAT early return to render org unit name instead of full selector bar | ~15 lines added (import + conditional block) |
| `TemplateSelector.component.tsx` | Added early return to hide template tabs | ~4 lines added |
| `ListViewMain.component.tsx` | Added early return to hide filter/controls bar | ~4 lines added |
| `MainPageBody.component.tsx` | Added conditional render of `<EcraatRegisterButton>` | ~5 lines added |

---

## File Inventory

```
src/ecraat/                              ← NEW: All ECRAAT-specific code
├── ecraat-config.ts                     ← Feature flags
├── ecraat-overrides.css                 ← CSS backup overrides
└── index.ts                             ← Re-exports

src/core_modules/capture-core/components/
└── EcraatRegisterButton/                ← NEW: Register button component
    ├── EcraatRegisterButton.component.tsx
    └── index.ts

src/index.tsx                                    ← MODIFIED: +1 CSS import
src/.../ScopeSelector/ScopeSelector.component.tsx ← MODIFIED: +15 lines (org unit name header)
src/.../WorkingListsBase/TemplateSelector.component.tsx ← MODIFIED: +4 lines
src/.../ListView/Main/ListViewMain.component.tsx  ← MODIFIED: +4 lines
src/.../MainPageBody/MainPageBody.component.tsx   ← MODIFIED: +5 lines
```

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

3. **Resolve conflicts** — files likely to conflict:
   - `src/index.tsx` → Keep both: upstream imports + our CSS import
   - `ScopeSelector.component.tsx` → Keep both: upstream code + our early-return block at top of `render()`
   - `TemplateSelector.component.tsx` → Keep both: upstream code + our early-return
   - `ListViewMain.component.tsx` → Keep both: upstream code + our early-return
   - `MainPageBody.component.tsx` → Keep both: upstream JSX + our `<EcraatRegisterButton>` block

   **All ECRAAT changes** are clearly marked with `// ECRAAT:` comments, making them easy to identify and re-apply.

4. **New ECRAAT files never conflict** — `src/ecraat/` and `EcraatRegisterButton/` are entirely our own.

---

## How to Add New Customizations

### Hiding an element (CSS approach — preferred)

1. Inspect the element in browser DevTools
2. Find its `data-test` attribute or `id`
3. Add a CSS rule in `src/ecraat/ecraat-overrides.css`:
   ```css
   [data-test="some-attribute"] {
       display: none !important;
   }
   ```
4. Optionally add a feature flag in `ecraat-config.ts` if you want runtime control

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
- If it's an i18n key, consider overriding in `src/locales/` or using the config approach above
- Avoid modifying upstream component files for text changes when possible

---

## Key Upstream Components Reference

Understanding these helps when adding new customizations:

| Component | Path | What it renders |
|---|---|---|
| **MainPage** | `.../Pages/MainPage/MainPage.component.tsx` | Top-level: TopBar + MainPageBody |
| **TopBar** | `.../Pages/MainPage/TopBar/TopBar.container.tsx` | ScopeSelector + TopBarActions |
| **ScopeSelector** | `.../ScopeSelector/ScopeSelector.component.tsx` | Program/OrgUnit/Category selectors |
| **TopBarActions** | `.../TopBarActions/TopBarActions.component.tsx` | "Create new" + "Search" buttons |
| **MainPageBody** | `.../Pages/MainPage/MainPageBody/MainPageBody.component.tsx` | Renders working list or search box |
| **WorkingListsType** | `.../MainPageBody/WorkingListsType/` | Routes to Event or Tracker working list |
| **TemplateSelector** | `.../WorkingListsBase/TemplateSelector.component.tsx` | Template tabs (Active/Completed/Cancelled) |
| **ListViewMain** | `.../ListView/Main/ListViewMain.component.tsx` | Filter bar + data table + pagination |
| **Filters** | `.../ListView/Filters/Filters.component.tsx` | Individual filter button components |

### Render Tree (Main Page with Working List)

```
MainPage
├── TopBar (ScopeSelector + TopBarActions)     ← HIDDEN by CSS
└── MainPageBody
    └── [SHOW_WORKING_LIST]
        └── div.container
            └── div.leftColumn
                ├── EcraatRegisterButton       ← ADDED by ECRAAT
                └── WorkingListsType
                    └── WorkingListsBase
                        └── TemplatesManager
                            ├── TemplateSelector (tabs)  ← HIDDEN by CSS
                            └── ListViewConfig
                                └── ListViewMain
                                    ├── TopBar (filters)  ← HIDDEN by CSS
                                    ├── OnlineList (table)
                                    └── ListPagination
```

---

## Conventions

1. **Prefix all ECRAAT additions** with `Ecraat` in component/folder names or `ecraat` in file names
2. **Comment all ECRAAT changes** in upstream files with `// ECRAAT:` so they're easy to find via grep
3. **Never remove upstream code** — only add conditional blocks around it or use CSS to hide it
4. **Keep `ecraat-config.ts` as the single source of truth** for all customization settings
5. **Use `data-test` selectors** in CSS — they are stable across upstream versions

---

## Searching for All ECRAAT Changes

To find every ECRAAT modification in the codebase:

```bash
# Find all ECRAAT-specific files
find src -path "*/ecraat*" -o -path "*/Ecraat*"

# Find all ECRAAT comments in upstream files
grep -r "ECRAAT" src/ --include="*.tsx" --include="*.ts" --include="*.css"
```
