import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { scheduledTask } from "@/inngest/functions";
import { aiAgent } from "@/inngest/agent";
import { createOrderUnsafe, createOrderSafe } from "@/inngest/orderFunctions";

// Create an API route to serve Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduledTask, aiAgent, createOrderUnsafe, createOrderSafe],
});
