# ExamWise AI — Visual Design Specification

## 1. Purpose and scope

This document is a **visual-only redesign specification** for the existing ExamWise AI frontend.

The goal is to make the interface feel like a carefully designed, credible academic SaaS product—not a generic AI-generated dashboard—while preserving the current application exactly as it works.

Use the 21st.dev community theme below as the visual reference:

- **Theme:** ProMotor Wow
- **Author:** `@profitsalesorg-crypto`
- **Reference:** https://21st.dev/@profitsalesorg-crypto/themes/promotor-wow-1784919270278

Treat the reference as the source of visual direction. Inspect its actual preview and available theme tokens before implementation. Do not substitute a different 21st.dev theme just because the reference preview takes time to load.

## 2. Non-negotiable preservation rules

This is not a product redesign or a feature-generation task.

**Do not change:**
- Any feature, workflow, business rule, or user journey.
- Student or teacher role selection, role persistence, or role-specific navigation.
- Routes, route paths, page visibility, or navigation destinations.
- API calls, request/response shapes, backend integration, data models, or state management.
- Upload, OCR, question ranking, prediction, paper generation, evaluation, marking, history, or reporting logic.
- Form fields, validation, defaults, button actions, table columns, filters, sorting, or modal behavior.
- Existing page content, labels, terminology, or information hierarchy, except tiny copy corrections that are strictly necessary for visual consistency (prefer none).
- Authentication/authorization assumptions or local-storage keys.
- Dependencies, framework, build setup, or project architecture unless a strictly visual change cannot be achieved otherwise.

Do not remove, hide, replace, mock, or disable any existing UI element. Do not add fake data, fake metrics, placeholder features, decorative charts, or new product capabilities.

## 3. Desired visual character

Create a restrained, premium, professional academic workspace.

The interface should feel:
- Deliberate, mature, and human-designed.
- Clear and information-first, with a calm visual hierarchy.
- Compact enough for real academic workflows, but not cramped.
- Consistent across student and teacher workspaces.
- Credible for a university or institution—not a flashy AI landing page.

Avoid:
- Generic AI-dashboard styling.
- Large glowing gradients, neon outlines, excessive blur, glassmorphism, and floating decorative blobs.
- Oversized rounded cards and pill-shaped controls everywhere.
- Excessive shadows, arbitrary accent colors, and colorful gradients on every section.
- Emoji as icons.
- Unnecessary animation, parallax, or motion.
- Huge hero headings and excessive empty space that push useful content below the fold.

## 4. Theme and color direction

Use the ProMotor Wow reference as the authority for its palette. Inspect the linked theme and reproduce its actual color values/tokens wherever they are available. Do not invent a different palette and claim it is the reference.

Apply the theme consistently to:
- Application shell and page background.
- Header and sidebar.
- Cards, panels, tables, forms, dropdowns, dialogs, and upload surfaces.
- Primary, secondary, tertiary, hover, active, disabled, focus, success, warning, error, and informational states.
- Ant Design components and custom React/Tailwind elements.

Keep color roles semantic and centralized through CSS variables/design tokens. Avoid hard-coded one-off colors scattered across components.

If the reference is primarily dark, preserve its dark character without making every surface the same shade. Use restrained surface layering and subtle borders to distinguish content. Maintain strong text contrast and accessible focus states.

If the reference includes both light and dark modes, implement both only if the existing app already supports the corresponding theme behavior. Do not add a new theme switcher or remove the existing theme selector. Preserve all existing theme-selection behavior and persisted values.

## 5. Typography

Use a restrained, highly legible sans-serif family suitable for a professional productivity application. Prefer a consistent family already available in the project; if adding a font is necessary, use one dependable family and provide sensible system fallbacks.

Establish a clear hierarchy:
- Page title: prominent but not oversized.
- Section title: compact and clearly differentiated.
- Card/panel title: medium weight.
- Body text: comfortable reading size and line height.
- Labels and helper text: smaller, still readable.
- Numeric values: clear and aligned, especially in tables and evaluation summaries.

Avoid mixing many font families, excessive uppercase labels, exaggerated letter spacing, or thin low-contrast text.

## 6. Surfaces, borders, and spacing

- Use consistent spacing increments and align page content to a shared grid.
- Prefer subtle 1px borders and restrained surface contrast over heavy shadows.
- Use a small, consistent radius scale. Do not make every element a large rounded pill.
- Use shadows only where they clarify elevation (menus, dialogs, floating elements).
- Keep cards visually quiet so the information inside them remains primary.
- Maintain consistent padding across cards, forms, tables, and page sections.
- Preserve existing responsive behavior and ensure layouts remain usable on laptop, tablet, and mobile widths.

## 7. Component-specific guidance

### Application shell
- Make the header, sidebar, and main content feel like one cohesive product.
- Keep branding visible but restrained.
- Clearly distinguish active navigation from inactive navigation without loud decoration.
- Preserve the current workspace indicator, role change action, and theme selector.

### Role selection
- Retain the exact student and teacher choices and their existing descriptions.
- Improve visual balance, typography, card surfaces, and interaction states only.
- Do not add onboarding steps or alter role-selection behavior.

### Dashboards
- Preserve every existing metric, data point, chart, action, and section.
- Improve hierarchy and alignment; do not invent or reinterpret metrics.
- Use restrained visual emphasis for important values.

### Forms and upload flows
- Keep every field, validation rule, accepted file type, helper text, and action unchanged.
- Make labels, inputs, upload drop zones, errors, and focus states visually consistent.
- Ensure disabled and loading states remain obvious.

### Tables, evaluations, and scripts
- Preserve all columns, row data, actions, sorting, and selection behavior.
- Improve readability through alignment, row spacing, subtle dividers, and clear status styling.
- Do not hide dense information merely to make the screen look cleaner.

### Menus, dialogs, and notifications
- Apply the same palette, typography, borders, and radius system.
- Preserve all existing interactions and keyboard accessibility.

## 8. Interaction and accessibility

- Keep hover transitions subtle and fast.
- Provide visible keyboard focus.
- Ensure text and controls have sufficient contrast.
- Do not communicate success, warning, or failure through color alone.
- Respect reduced-motion preferences.
- Maintain usable touch targets and responsive navigation.
- Do not introduce motion that delays or obstructs task completion.

## 9. Implementation constraints for this codebase

The frontend is an existing React + TypeScript + Vite application using Ant Design, Tailwind CSS, React Router, and Lucide icons.

Important existing files include:
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/theme.css`
- `frontend/src/hooks/useTheme.ts`
- `frontend/src/components/PageLayout.tsx`
- `frontend/src/pages/*.tsx`

Use the current theme-token mechanism where practical. Keep Ant Design `ConfigProvider` theme values synchronized with the CSS tokens so Ant Design controls do not look like a separate application.

Do not replace the UI library, router, page architecture, or theme hook. Do not rewrite every page if a coherent token and component-style update is sufficient. If a page-level visual adjustment is necessary, make the smallest possible presentational change.

Do not blindly overwrite `theme.css` or `index.css`; inspect how the existing theme hook and all page styles consume their variables first.

## 10. Existing frontend observations to account for

These are findings from the supplied source archive. Use them to guide a careful visual-only implementation:

- The app already has a five-option theme selector: `midnight`, `graphite`, `arctic`, `emerald`, and `warm`.
- `useTheme.ts` stores the selected theme under `examwise_theme`, applies `data-theme` to the document root, and maps a subset of tokens into Ant Design `ConfigProvider`. Preserve this behavior and storage key.
- The current default is `midnight`. The existing theme selector is part of the UI and must remain.
- `theme.css` contains theme variables plus utility styles, but the `warm` theme block appears incomplete: its declaration begins and is not closed before global typography/utility rules. Inspect and correct CSS structure only as needed for a valid visual theme implementation; do not remove existing utilities or alter their intended behavior.
- `index.css` currently declares a separate hard-coded dark/light base palette. Ensure it does not override the active `data-theme` token system.
- Several page components use hard-coded Tailwind color classes such as slate/indigo and white text. These can bypass theme tokens and create inconsistent pages. Replace only presentational color classes with semantic theme styling; do not change component logic or content.
- The app combines Ant Design components with custom CSS/Tailwind. Make both systems visually consistent rather than restyling only the custom components.

## 11. Acceptance checklist

The work is complete only when all of the following are true:

- [ ] The visual direction clearly follows the linked ProMotor Wow theme.
- [ ] The app looks like a polished, intentionally designed academic SaaS product.
- [ ] Student and teacher workspaces retain all current functionality.
- [ ] Every route and navigation destination still works.
- [ ] All existing forms, fields, buttons, uploads, tables, dialogs, and actions remain present and functional.
- [ ] API/backend behavior and data handling are untouched.
- [ ] Existing theme selection and persistence still work.
- [ ] Ant Design and custom components share the same visual system.
- [ ] Responsive layouts remain usable.
- [ ] No fake data, features, or decorative content has been introduced.
- [ ] TypeScript/lint and production build pass.
- [ ] Any visual-only files changed are listed in the final summary.

## 12. Required final report

After implementation, report:
1. The files changed.
2. Confirmation that no features, workflows, routes, API behavior, or business logic were changed.
3. Confirmation that the existing theme selector and persistence still work.
4. Build/lint results.
5. Any visual issue that could not be resolved without changing functionality.
