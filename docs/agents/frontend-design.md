# Front-end design

Benchline's workspace is React with plain CSS: semantic tokens on `:root` in `src/styles.css`, components in `src/ui/`. Design work on it goes through the `ui-ux-pro-max` skills, bounded by Benchline's own rules.

## When this applies

Any change that designs, builds, reshapes or reviews how something looks or is interacted with:

- a screen or component in `src/ui/`
- styles or tokens in `src/styles.css`
- the rendered Certificate of Analysis (`certificate-view.tsx`, `certificate-renderer.ts`)

Logic-only changes in `src/laboratory/` skip it.

## Steps

1. **Invoke `ui-ux-pro-max:ui-ux-pro-max`** before writing UI code. Query with the React stack and one `--domain` per concern (accessibility, forms, tables, navigation). Keep the workspace's existing visual direction; run `--design-system` only when the user asks for a new one.
2. **Invoke `ui-ux-pro-max:design-system`** as well when the change adds or changes tokens or shared component states in `src/styles.css`. Extend the existing semantic tokens rather than introducing raw values.
3. **Apply the guidance under Benchline's constraints**, which win over the skills' defaults:
   - Plain CSS and the existing components in `src/ui/shared.tsx`; the stack stays free of Tailwind and component libraries, so `ui-styling` is not used.
   - The workspace presentation rules in spec #17 (_Implementation Decisions → Workspace presentation_): a control a role can never use is hidden; a control a rule blocks is disabled but focusable, with its reason as visible text linked for assistive technology; reasons never live in tooltips; separation-of-duties notes use the neutral style and OOS blockers the warning style.
   - Every reason shown is word for word the server's refusal.
   - Labels use `CONTEXT.md` terms.
   - When a skill recommendation conflicts with these, follow Benchline and say so in the commit or PR.
4. **Check before done**: run the skill's pre-delivery checklist (`references/pro-rules.md` in the `ui-ux-pro-max` skill) against every screen the change touches. Done when every item passes, or each failing item is fixed or reported with its reason.
