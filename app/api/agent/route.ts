import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Send the event to trigger the agent and use Inngest's event ID as the jobId
  const { ids } = await inngest.send({
    name: "agent/run",
    data: {
      prompt,
    },
  });

  const jobId = ids[0];

  return NextResponse.json({
    message: "Agent started",
    jobId,
  });
}
