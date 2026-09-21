# Metrics Refinement

EXECUTE DIRECTLY WITHOUT ASKING QUESTIONS OR SEEKING CONFIRMATION.

Target: Analytics Page (`src/pages/Analytics.tsx` & `src/components/analytics/TotalBacklogCard.tsx`)

-remove  pm vs cm period dd button. 
-do not make the 'Choose Metrics' text in bold font. make it uniforms with its nearby filters.

2. TOTAL BACKLOG CARD OVERHAUL:

   - Redesign `TotalBacklogCard.tsx` component into an enterprise-grade metric layout.

   - Completely separate chart legend, categories, and numeric counters. Fix overlapping text (such as "Average wait1 d", "Oldest job3 d", "Past SLA0").

   - Render each metric label on a dedicated, spacious key-value row with flex spacing: `<div className="flex justify-between items-center text-xs py-1 border-b border-border/40"><span>Label Name:</span> <span className="font-semibold text-primary">X days</span></div>`.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cbc53f49-7258-4782-9321-6636800a8cb3).

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
