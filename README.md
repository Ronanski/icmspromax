# Instant Alerts

EXECUTE DIRECTLY AND FIX NOTIFICATION REFRESH, REALTIME, & CROSS-DEVICE SYNC:

1. ENABLE REALTIME SUPABASE SUBSCRIPTION:

   - In the Notification provider/context, subscribe to real-time changes using:

     `supabase.channel('public:notifications')`

     `.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => { refetchOrUpdateState() })`

     `.subscribe()`

   - Ensures when a user marks an alert as read on PC, it instantly updates on mobile without page refresh.

2. DATABASE-FIRST FETCHING & REFRESH PERSISTENCE:

   - Always fetch notifications directly from the Supabase `notifications` table on initial page load and refresh.

   - When generating alerts dynamically from Work Orders, cross-reference existing records by `source_key` in Supabase.

   - If `is_read === true` in Supabase, preserve `is_read: true`. Never overwrite or reset read items back to unread upon refresh.

3. VISUAL STATUS & ACKNOWLEDGE BUTTON SYNC:

   - Remove the blue unread indicator dot IF `item.is_read === true`.

   - Update the "Acknowledge" / "Mark as Read" click handler to execute an explicit Supabase DB mutation:

     `await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', item.id)`

   - Ensure header counts (e.g. "0 unread") and item card visual states (blue dot & button text) stay 100% in sync across all logged-in devices.

andyan ang code, andyan ang sql na reference mo, wag mo nako tatanungin.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/704976e3-d093-47f2-a06e-7ff6d065e743).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
