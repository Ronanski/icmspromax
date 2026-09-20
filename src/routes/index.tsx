import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";

// The plant desk is a browser-only dashboard (local storage, live clock,
// charts), so it is loaded after hydration instead of during server render.
const PlantDesk = lazy(() => import("@/pages/PlantDesk.jsx"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "I&C Plant Desk | Maintenance Work Order Control" },
      {
        name: "description",
        content:
          "Plant instrumentation and control maintenance desk: work orders, break-in hub, preventive maintenance schedule, item master and shift analytics.",
      },
      { property: "og:title", content: "I&C Plant Desk | Maintenance Work Order Control" },
      {
        property: "og:description",
        content:
          "Track corrective and preventive maintenance work orders, break-ins, manpower and SLA aging in one plant control desk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="full-loader">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      <span>Loading plant desk…</span>
    </div>
  );
}

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <PlantDesk />
    </Suspense>
  );
}
