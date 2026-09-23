// Backend connection for the I&C Plant Desk.
// Uses the project's managed client so auth + data always point at this
// project's backend. All data protection is enforced by Row Level Security.
import { supabase } from "@/integrations/supabase/client";

export { supabase };
export default supabase;
