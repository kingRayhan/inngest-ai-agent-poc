import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/inngest/statusStore";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing id parameter" },
      { status: 400 }
    );
  }

  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ status: "not_found" });
  }

  return NextResponse.json(job);
}

