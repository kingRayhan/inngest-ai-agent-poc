"use client";

import { useState } from "react";
import Link from "next/link";

interface Order {
  id: string;
  vendorId: string;
  vendorOrderId: number;
  createdAt: string;
}

interface SimulationResult {
  totalOrders: number;
  orders: Order[];
  orderIdsByVendor: Record<string, number[]>;
  duplicates: Record<string, number[]>;
  status: string;
}

export default function OrdersSimulation() {
  const [vendorId, setVendorId] = useState("vendor-A");
  const [count, setCount] = useState(5);
  const [method, setMethod] = useState<"safe" | "unsafe">("safe");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [message, setMessage] = useState("");

  const runSimulation = async () => {
    setIsRunning(true);
    setResult(null);
    setMessage("Firing events...");

    try {
      const response = await fetch("/api/orders/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, count, method }),
      });

      const data = await response.json();
      setMessage(data.note);

      // Poll for results
      let attempts = 0;
      const maxAttempts = 20;

      const pollResults = async () => {
        attempts++;
        const res = await fetch("/api/orders/simulate");
        const resultData: SimulationResult = await res.json();

        if (resultData.totalOrders >= count || attempts >= maxAttempts) {
          setResult(resultData);
          setIsRunning(false);
          setMessage("");
        } else {
          setMessage(
            `Processing... ${resultData.totalOrders}/${count} orders created`
          );
          setTimeout(pollResults, 500);
        }
      };

      // Start polling after a short delay
      setTimeout(pollResults, 1000);
    } catch (error) {
      setMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsRunning(false);
    }
  };

  const hasDuplicates = result && Object.keys(result.duplicates).length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          Order Race Condition Simulation
        </h1>
        <p className="text-gray-400 mb-8">
          Test how Inngest&apos;s concurrency controls prevent duplicate order
          IDs
        </p>

        {/* Controls */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Vendor ID
              </label>
              <input
                type="text"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isRunning}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Number of Orders
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                min={1}
                max={20}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isRunning}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Method</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMethod("safe")}
                  disabled={isRunning}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    method === "safe"
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Safe
                </button>
                <button
                  onClick={() => setMethod("unsafe")}
                  disabled={isRunning}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    method === "unsafe"
                      ? "bg-red-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Unsafe
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 p-4 rounded-lg bg-gray-800">
            <p className="text-sm">
              {method === "safe" ? (
                <span className="text-green-400">
                  <strong>Safe mode:</strong> Uses{" "}
                  <code className="bg-gray-700 px-1 rounded">
                    concurrency: {`{ limit: 1, key: "event.data.vendorId" }`}
                  </code>
                  . Orders for the same vendor are queued and processed one at a
                  time.
                </span>
              ) : (
                <span className="text-red-400">
                  <strong>Unsafe mode:</strong> No concurrency control. Multiple
                  orders for the same vendor can run in parallel, causing race
                  conditions.
                </span>
              )}
            </p>
          </div>

          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 font-medium transition-colors"
          >
            {isRunning ? "Running Simulation..." : "Run Simulation"}
          </button>

          {message && (
            <p className="mt-4 text-center text-gray-400">{message}</p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Results</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  hasDuplicates
                    ? "bg-red-500/20 text-red-400"
                    : "bg-green-500/20 text-green-400"
                }`}
              >
                {hasDuplicates ? "Duplicates Found!" : "All Unique"}
              </span>
            </div>

            <div
              className={`p-4 rounded-lg mb-6 ${
                hasDuplicates ? "bg-red-500/10" : "bg-green-500/10"
              }`}
            >
              <p className={hasDuplicates ? "text-red-400" : "text-green-400"}>
                {result.status}
              </p>
            </div>

            {/* Order IDs by Vendor */}
            <div className="mb-6">
              <h3 className="text-sm text-gray-400 mb-2">
                Order IDs by Vendor
              </h3>
              {Object.entries(result.orderIdsByVendor).map(
                ([vendor, orderIds]) => (
                  <div key={vendor} className="mb-2">
                    <span className="text-gray-300">{vendor}: </span>
                    <span className="flex flex-wrap gap-2 mt-1">
                      {orderIds.map((id, idx) => {
                        const isDuplicate =
                          result.duplicates[vendor]?.includes(id);
                        return (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded text-sm font-mono ${
                              isDuplicate
                                ? "bg-red-500/30 text-red-300"
                                : "bg-gray-800 text-gray-300"
                            }`}
                          >
                            #{id}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                )
              )}
            </div>

            {/* Orders Table */}
            <div>
              <h3 className="text-sm text-gray-400 mb-2">
                All Orders ({result.totalOrders})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="pb-2 pr-4">Request ID</th>
                      <th className="pb-2 pr-4">Vendor</th>
                      <th className="pb-2 pr-4">Order #</th>
                      <th className="pb-2">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.orders.map((order) => {
                      const isDuplicate = result.duplicates[
                        order.vendorId
                      ]?.includes(order.vendorOrderId);
                      return (
                        <tr
                          key={order.id}
                          className={`border-b border-gray-800/50 ${
                            isDuplicate ? "bg-red-500/10" : ""
                          }`}
                        >
                          <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                            {order.id.slice(0, 8)}...
                          </td>
                          <td className="py-2 pr-4">{order.vendorId}</td>
                          <td
                            className={`py-2 pr-4 font-mono ${
                              isDuplicate
                                ? "text-red-400 font-bold"
                                : "text-gray-300"
                            }`}
                          >
                            #{order.vendorOrderId}
                          </td>
                          <td className="py-2 text-gray-500 text-xs">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to AI Agent
          </Link>
        </div>
      </div>
    </div>
  );
}
