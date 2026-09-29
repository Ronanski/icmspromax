# ICMS ProMax Design System

This document is the visual source of truth for ICMS ProMax.

## Product character

ICMS ProMax is an industrial maintenance management system. The UI should feel:

- professional
- operational
- technical
- clean
- information-dense
- restrained

Avoid generic SaaS decoration, neon/cyberpunk styling, excessive gradients, glassmorphism, oversized rounded cards, and page-specific visual languages.

## Typography

- Primary: **Inter**
- Technical identifiers: **JetBrains Mono**

Use JetBrains Mono for work-order numbers, equipment/instrument tags, system IDs, and other technical identifiers.

## Core palette

### Light

| Token | Value |
|---|---|
| Background | `#F6F8FA` |
| Surface | `#FFFFFF` |
| Surface 2 | `#F1F4F7` |
| Primary | `#0A6ED1` |
| Text | `#17212B` |
| Secondary text | `#526273` |
| Muted text | `#718096` |
| Border | `#D7DDE4` |
| Success | `#2E7D32` |
| Warning | `#ED6C02` |
| Danger | `#C62828` |

### Dark

| Token | Value |
|---|---|
| Background | `#0D141B` |
| Surface | `#151E27` |
| Surface 2 | `#1D2833` |
| Primary | `#4DA3E8` |
| Text | `#E8EEF3` |
| Secondary text | `#B5C0CA` |
| Border | `#30404E` |

## Semantic color rules

Color communicates state, priority, or hierarchy. Do not introduce colors only for decoration.

- Blue: primary action / active / information
- Green: completed / healthy / operational
- Amber: warning / attention / due soon
- Red: critical / overdue / failed
- Neutral: inactive / cancelled / archived

## Geometry

- Small controls: 6px radius
- Buttons and inputs: 6–8px
- Cards and panels: 8–10px
- Avoid 20px+ radius for normal application UI

## Components

Reuse existing shared components before creating a new visual pattern.

Buttons: primary, secondary, outline/low-emphasis, ghost, danger.

Forms: shared label, input, select, textarea, focus, error, and help-text treatment.

Tables: compact, readable, subtle borders, consistent headers, semantic badges, technical IDs in JetBrains Mono.

Cards: use only for meaningful information grouping. Avoid card overload.

Dialogs: use consistent width, padding, title hierarchy, actions, and focus behavior.

## Charts

Charts use the centralized chart tokens:

- `--chart-1`: primary blue
- `--chart-2`: secondary blue/cyan
- `--chart-3`: success green
- `--chart-4`: warning amber
- `--chart-5`: danger red

Do not hardcode purple, pink, or unrelated colors in individual charts.

## Change rules for future work

1. Reuse an existing component when one exists.
2. Prefer changing the shared component over creating a page-specific duplicate.
3. Do not introduce arbitrary colors, radius values, shadows, or typography.
4. Do not redesign unrelated pages when implementing a feature.
5. Preserve existing business logic, routes, permissions, database behavior, and workflows.
6. New modules must visually belong to the existing ICMS ProMax system.
