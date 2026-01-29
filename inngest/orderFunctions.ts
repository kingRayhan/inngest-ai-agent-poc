import { inngest } from "./client";
import { getNextOrderIdForVendor, createOrder } from "./vendorOrderStore";

/**
 * BAD: No concurrency control - will have race conditions
 * Multiple parallel events for the same vendor can get the same orderId
 */
export const createOrderUnsafe = inngest.createFunction(
  { id: "create-order-unsafe" },
  { event: "order/create.unsafe" },
  async ({ event, step }) => {
    const { vendorId, requestId } = event.data as {
      vendorId: string;
      requestId: string;
    };

    // Simulate some async work (e.g., validation)
    await step.sleep("simulate-delay", "100ms");

    // Get next order ID - RACE CONDITION can happen here!
    const vendorOrderId = await step.run("get-order-id", async () => {
      return getNextOrderIdForVendor(vendorId);
    });

    // Create the order
    const order = await step.run("create-order", async () => {
      return createOrder(requestId, vendorId, vendorOrderId);
    });

    return { order, method: "unsafe" };
  }
);

/**
 * GOOD: With concurrency control - no race conditions
 * Only ONE event per vendor can run at a time
 */
export const createOrderSafe = inngest.createFunction(
  {
    id: "create-order-safe",
    // This is the key! Limit to 1 concurrent execution per vendor
    concurrency: {
      limit: 1,
      key: "event.data.vendorId",
    },
  },
  { event: "order/create.safe" },
  async ({ event, step }) => {
    const { vendorId, requestId } = event.data as {
      vendorId: string;
      requestId: string;
    };

    // Simulate some async work (e.g., validation)
    await step.sleep("simulate-delay", "100ms");

    // Get next order ID - Safe because only one runs at a time per vendor
    const vendorOrderId = await step.run("get-order-id", async () => {
      return getNextOrderIdForVendor(vendorId);
    });

    // Create the order
    const order = await step.run("create-order", async () => {
      return createOrder(requestId, vendorId, vendorOrderId);
    });

    return { order, method: "safe" };
  }
);
