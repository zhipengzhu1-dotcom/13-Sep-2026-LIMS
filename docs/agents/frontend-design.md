# Front-end design

Benchline's workspace is React with plain CSS: semantic tokens on `:root` in `src/styles.css`, components in `src/ui/`. Design work on it goes through Emil Kowalski's design-engineering skills, bounded by Benchline's own rules.

## When this applies

Any change that designs, builds, reshapes or reviews how something looks, moves or is interacted with:

- a screen or component in `src/ui/`
- styles, tokens or motion in `src/styles.css`
- the rendered Certificate of Analysis (`certificate-view.tsx`, `certificate-renderer.ts`)

Logic-only changes in `src/laboratory/` skip it.

## Steps

1. **Invoke `emil-design-eng`** before writing UI code. It sets the bar: restraint, unseen details, colour only where it carries meaning, and the animation decision framework.
2. **Add the matching sibling skill** for the part of the change that moves:
   - `animate` to build a new transition or piece of motion;
   - `review-animations` to critique motion in a diff;
   - `find-animation-opportunities` or `improve-animations` for a survey of the workspace;
   - `apple-design` for typography (tracking, leading, hierarchy) and the design foundations;
   - `mobile-native` when the change is checked on a phone.
3. **Extend the tokens in `src/styles.css`** rather than introducing raw values. The easing (`--ease-out`), shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`), `--primary` and `--mono` are tokens like the colours.
4. **Apply the guidance under Benchline's constraints**, which win over the skills' defaults:
   - Plain CSS and the existing components in `src/ui/shared.tsx`; the stack stays free of Tailwind, component libraries and motion libraries.
   - The workspace presentation rules in spec #17 (_Implementation Decisions → Workspace presentation_): a control a role can never use is hidden; a control a rule blocks is disabled but focusable, with its reason as visible text linked for assistive technology; reasons never live in tooltips; separation-of-duties notes use the neutral style and OOS blockers the warning style.
   - Every reason shown is word for word the server's refusal.
   - Labels use `CONTEXT.md` terms.
   - A Result's value is never drawn in a verdict's colour; its Conformity statement says whether it complies.
   - Nothing animates on keyboard navigation or when a Sample opens, and a blocker reason, OOS badge or hold never fades or slides in.
   - The Certificate of Analysis keeps its own type and never animates; a workspace token change must not reach it.
   - When a skill recommendation conflicts with these, follow Benchline and say so in the commit or PR.
5. **Check before done** with the project `verify` skill (`.claude/skills/verify/SKILL.md`): tour every role before and after, compare the accessibility trees, and run its verification panel. The craft auditor applies `emil-design-eng`'s review checklist and measures contrast in light and dark. Done when every item passes, or each failing item is fixed or reported with its reason.
