# Complete the six ICMS Promax UI refinements

## Outcome
The application name will be editable and synchronized in both upper-left title locations, navigation will be cleaner and reliable, Preventive Maintenance will expose the Master Data Hub, table date filtering will use the compact calendar control, and edit failures will appear as short-lived minimalist notifications.

## Implementation
1. **Editable application title**
   - Turn the sidebar brand title and the header’s upper-left title into the same compact inline-edit control for workspace administrators.
   - Keep the current page name visible as secondary context in the header.
   - Save edits through the existing workspace settings action, refresh workspace data after saving, and show success/error notifications.
   - Keep the title read-only for field users so workspace-wide branding cannot be changed without permission.

2. **Header and sidebar navigation**
   - Keep Corrective Maintenance and Preventive Maintenance only in the existing sidebar selector; remove any remaining duplicate header/top-layout controls.
   - Make the hamburger the single explicit toggle for open and closed states, with accurate accessible labels and expanded state.
   - Preserve desktop content resizing and mobile drawer/backdrop behavior; closing by backdrop, close icon, or navigation selection will continue to work.

3. **Preventive Maintenance access to master data**
   - Keep the administrator-only Master Data Hub section visible in both maintenance modes.
   - Add an administrator-only Master Data Hub shortcut from the Preventive Maintenance page that opens Item Master, without exposing admin tools to field users.

4. **Minimal table date picker**
   - Replace the native Target Date input in Work Order tables with the existing compact calendar button.
   - Support exact-date filtering and retain date-range selection and clearing.
   - Reset pagination when the date filter changes and update the footer’s filtered-state text.

5. **Minimal, self-dismissing error notifications**
   - Route work-order edits, bulk updates, workspace/profile changes, imports, calendar rescheduling, and master-data updates through the existing minimalist toast system.
   - Remove duplicate persistent red error banners where a toast already communicates the failure.
   - Keep destructive-action confirmations intact because they prevent irreversible deletion.

## Validation
- Check the app at desktop and mobile widths.
- Verify inline title editing updates both title locations and survives refresh.
- Verify hamburger open/close behavior, PM-to-Master-Data navigation, exact/range date filtering, and automatic toast dismissal.
- Confirm the development build and relevant browser console remain error-free.
