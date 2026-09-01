import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [/* decision-step functions are registered here starting Phase 3 */],
});
