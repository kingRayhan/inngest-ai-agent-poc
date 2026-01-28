import { inngest } from "./client";

// Example scheduled function (cron)
export const scheduledTask = inngest.createFunction(
  { id: "scheduled-task" },
  { cron: "0 * * * *" }, // Every hour
  async ({ step }) => {
    const result = await step.run("do-something", async () => {
      // Your scheduled task logic here
      return { processed: true };
    });

    return result;
  }
);
