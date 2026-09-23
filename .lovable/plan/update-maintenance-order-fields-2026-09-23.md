# Update maintenance order fields

## Scope
- Replace the placeholder project with the uploaded ICMS ProMax source, excluding any repository metadata and generated dependencies.
- Standardize PM add/edit forms and order details to show: Work Order Number, Description, Unit, Location/Tag, Priority (P1 Critical through P5 Shutdown Item), Status, Planned Start, and Planned Finish.
- Keep the extended execution fields editable only for CM and Break-In orders: Action Taken, As Found, As Left, Status/Remarks, PTW Number, Assigned Manpower, Actual Start, and Actual Finish.
- Rename every order-table header currently shown as “System” to “Location/Tag” across PM, CM, and Break-In views.

## Implementation details
- Update shared field rendering so PM and CM/Break-In layouts remain consistent wherever add or edit forms appear.
- Update `OrderDrawer` read-only labels and conditional sections to match the same rules.
- Preserve existing stored field keys where possible so current records remain compatible; only the displayed terminology changes from System to Location/Tag.
- Check the fast Break-In entry form and all order-table instances for matching labels and field availability.
- Verify the app compiles and inspect the affected screens at desktop and mobile widths.
