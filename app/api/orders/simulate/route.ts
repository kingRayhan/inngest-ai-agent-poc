import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { inngest } from "@/inngest/client";
import { resetStore, getAllOrders } from "@/inngest/vendorOrderStore";

export async function POST(request: NextRequest) {
  const { vendorId, count = 5, method = "safe" } = await request.json();

  if (!vendorId) {
    return NextResponse.json(
      { error: "vendorId is required" },
      { status: 400 }
    );
  }

  // Reset store for fresh simulation
  resetStore();

  const eventName =
    method === "safe" ? "order/create.safe" : "order/create.unsafe";

  // Fire multiple events IN PARALLEL to simulate race condition
  const events = Array.from({ length: count }, () => ({
    name: eventName,
    data: {
      vendorId,
      requestId: randomUUID(),
    },
  }));

  // Send all events at once (parallel)
  const { ids } = await inngest.send(events);

  return NextResponse.json({
    message: `Fired ${count} order creation events for vendor ${vendorId}`,
    method,
    eventIds: ids,
    note:
      method === "safe"
        ? "Using concurrency control - orders will be queued and processed one at a time per vendor"
        : "No concurrency control - race conditions may occur!",
  });
}

// GET endpoint to check results after simulation
export async function GET() {
  const orders = getAllOrders();

  // Group by vendor and check for duplicates
  const byVendor: Record<string, number[]> = {};
  for (const order of orders) {
    if (!byVendor[order.vendorId]) {
      byVendor[order.vendorId] = [];
    }
    byVendor[order.vendorId].push(order.vendorOrderId);
  }

  // Check for duplicate order IDs per vendor
  const duplicates: Record<string, number[]> = {};
  for (const [vendorId, orderIds] of Object.entries(byVendor)) {
    const seen = new Set<number>();
    const dups: number[] = [];
    for (const id of orderIds) {
      if (seen.has(id)) {
        dups.push(id);
      }
      seen.add(id);
    }
    if (dups.length > 0) {
      duplicates[vendorId] = dups;
    }
  }

  const hasDuplicates = Object.keys(duplicates).length > 0;

  return NextResponse.json({
    totalOrders: orders.length,
    orders,
    orderIdsByVendor: byVendor,
    duplicates,
    status: hasDuplicates
      ? "RACE CONDITION DETECTED - duplicate order IDs found!"
      : "OK - all order IDs are unique per vendor",
  });
}
