// In-memory store for demo purposes
// In production, use a database with proper locking

export interface Order {
  id: string;
  vendorId: string;
  vendorOrderId: number;
  createdAt: string;
}

// Track the last order ID per vendor
const vendorOrderCounters = new Map<string, number>();

// Store all orders
const orders: Order[] = [];

export function getNextOrderIdForVendor(vendorId: string): number {
  const currentCount = vendorOrderCounters.get(vendorId) ?? 0;
  const nextId = currentCount + 1;
  vendorOrderCounters.set(vendorId, nextId);
  return nextId;
}

export function createOrder(
  id: string,
  vendorId: string,
  vendorOrderId: number
): Order {
  const order: Order = {
    id,
    vendorId,
    vendorOrderId,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return order;
}

export function getOrdersByVendor(vendorId: string): Order[] {
  return orders.filter((o) => o.vendorId === vendorId);
}

export function getAllOrders(): Order[] {
  return [...orders];
}

export function resetStore(): void {
  vendorOrderCounters.clear();
  orders.length = 0;
}
