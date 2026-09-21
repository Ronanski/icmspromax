import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";

import supabase from "@/lib/supabaseClient";

// The plant desk is a browser-only dashboard (live clock, charts), so it is
// loaded after hydration instead of during server render.
const PlantDesk = lazy(() => import("@/pages/PlantDesk.jsx"));
const AuthPage = lazy(() => import("@/pages/AuthPage.jsx"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ICMS ProMax | Maintenance Operations" },
      {
        name: "description",
        content:
          "Plant instrumentation and control maintenance desk: work orders, break-in hub, preventive maintenance schedule, item master and shift analytics.",
      },
      { property: "og:title", content: "ICMS ProMax | Maintenance Operations" },
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
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      setSignedIn(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      {signedIn ? <PlantDesk /> : <AuthPage />}
    </Suspense>
  );
}
