import { NextRequest, NextResponse } from "next/server";
import { agent } from "@/inngest/agent";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Run the agent directly (without Inngest step for synchronous response)
    const result = await agent.run(prompt);

    // Extract text content from assistant messages
    let response = result.output
      .filter((msg) => msg.role === "assistant" && "content" in msg)
      .map((msg) => ("content" in msg ? msg.content : ""))
      .filter(Boolean)
      .join("\n");

    // Fallback: if the model only called tools and didn't return an assistant message,
    // surface the tool results (e.g. weather data) as the response.
    const anyResult = result as {
      toolCalls?: Array<{
        content?: unknown;
      }>;
      output: unknown;
    };

    if (!response && Array.isArray(anyResult.toolCalls)) {
      const toolText = anyResult.toolCalls
        .map((toolCall) => {
          const content = toolCall.content as
            | string
            | { data?: unknown }
            | undefined;
          if (!content) return "";
          if (typeof content === "string") return content;
          if (typeof content.data === "string") return content.data;
          return "";
        })
        .filter(Boolean)
        .join("\n\n");

      if (toolText) {
        response = toolText;
      }
    }

    return NextResponse.json({
      response: response || "No response generated",
      output: result.output,
      toolCalls: anyResult.toolCalls ?? [],
    });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent failed" },
      { status: 500 }
    );
  }
}
