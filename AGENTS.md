<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# ICMS ProMax UI rules

The existing ICMS ProMax Design System is the visual source of truth. Read `docs/ICMS-DESIGN-SYSTEM.md` before making UI changes.

- Reuse existing shared components before creating new ones.
- Do not introduce arbitrary colors, typography, border radii, shadows, gradients, or page-specific visual patterns.
- Use Inter for normal UI and JetBrains Mono for technical identifiers.
- Preserve the existing industrial-enterprise visual language.
- Do not redesign unrelated pages when implementing a feature.
- Preserve business logic, routes, permissions, database behavior, and workflows unless explicitly requested.
