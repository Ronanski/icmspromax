# Batch 2: Dashboard and Work Order Refinements

## Scope
- Replace the starter files with the uploaded ICMS ProMax source, excluding Git metadata and generated build output.
- Preserve the established ICMS ProMax visual system and existing Batch 1 behavior.

## Dashboard overhaul
- Restore the compact Daily Accomplishment mini calendar on Today’s Focus and place it directly beside the To-Do List in a balanced responsive row.
- Add compact daily metric cards to Today’s Focus for today’s total scheduled work, open jobs, work in progress, and completed jobs.
- Move shortcut selection out of the Shortcuts card into a spacious modal-style popover with labeled checkboxes, a reset action, and a clear close/done action; keep selections persisted through the existing preference flow.
- Remove “Overdue PM Jobs” and “PM Due Within 3 Days” from corrective-maintenance Today’s Focus.
- Show those two alerts only within Preventive Maintenance views, using PM-only records and preserving their existing links/actions.

## Units and defer reasons
- Keep the current Unit 1, Unit 2, Unit 3, Unit 4, and Common choices.
- Add MH, WT, COMP, Phase 1, and Phase 2 wherever plant units are selected or filtered.
- Extend spreadsheet import normalization so all new unit values round-trip correctly through import/export.
- Add “Equipment Unavailability” to the deferred-reason selector and spreadsheet import normalization.

## Verification
- Confirm the calendar and To-Do List remain side by side on desktop/tablet and stack cleanly on mobile.
- Confirm mini metrics reflect only today’s corrective-maintenance jobs and open the expected views where applicable.
- Confirm shortcut customization opens as an overlay, checkbox changes persist, and the underlying card does not expand.
- Confirm PM alerts appear only in Preventive Maintenance views and never on corrective-maintenance screens.
- Confirm every old and new unit and every defer reason can be selected, saved, displayed, imported, filtered, and exported.
- Run the project checks and inspect the relevant desktop and mobile screens for layout or interaction regressions.
