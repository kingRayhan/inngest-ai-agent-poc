import { createAgent, createTool, openai } from "@inngest/agent-kit";
import { z } from "zod";
import { inngest } from "./client";
import { setJobCompleted, setJobError, setJobPending } from "./statusStore";

// Groq uses OpenAI-compatible API - using tool-use optimized model
const groq = openai({
  model: "openai/gpt-oss-120b",
  baseUrl: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// Define tools using AgentKit's createTool
const searchWebTool = createTool({
  name: "search_web",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  handler: async ({ query }) => {
    // Replace with actual search implementation
    return `Search results for "${query}": [Placeholder - implement actual search]`;
  },
});

const getCurrentTimeTool = createTool({
  name: "get_current_time",
  description: "Get the current date and time",
  handler: async () => {
    return new Date().toISOString();
  },
});

// Weather tool using Open-Meteo API (free, no API key required)
const getWeatherTool = createTool({
  name: "get_weather",
  description:
    "Get current weather for a city. Use this when asked about weather conditions.",
  parameters: z.object({
    city: z.string().describe("The city name to get weather for"),
  }),
  handler: async ({ city }) => {
    try {
      // First, geocode the city to get coordinates
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1`
      );
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        return `Could not find location: ${city}`;
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      // Get current weather
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius`
      );
      const weatherData = await weatherResponse.json();

      const current = weatherData.current;
      const weatherCodes: Record<number, string> = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        95: "Thunderstorm",
      };

      const condition = weatherCodes[current.weather_code] || "Unknown";

      return `Weather in ${name}, ${country}:
- Temperature: ${current.temperature_2m}°C
- Condition: ${condition}
- Humidity: ${current.relative_humidity_2m}%
- Wind Speed: ${current.wind_speed_10m} km/h`;
    } catch (error) {
      return `Error fetching weather: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  },
});

// Create the agent using AgentKit
// Note: Groq tool calling can be unreliable - remove tools array if you get errors
export const agent = createAgent({
  name: "True AI",
  system: "Your name is True AI",
  model: groq,
  tools: [searchWebTool, getCurrentTimeTool, getWeatherTool],
});

// Inngest function that runs the agent
export const aiAgent = inngest.createFunction(
  { id: "ai-agent" },
  { event: "agent/run" },
  async ({ event, step }) => {
    const { prompt } = event.data as { prompt: string };
    const jobId = event.id ?? "";

    if (jobId) {
      setJobPending(jobId);
    }

    try {
      // Run the agent with the user's prompt
      const result = await agent.run(prompt, { step });

      // Extract text content from assistant messages
      let response = result.output
        .filter((msg) => msg.role === "assistant" && "content" in msg)
        .map((msg) => ("content" in msg ? msg.content : ""))
        .filter(Boolean)
        .join("\n");

      // Fallback to tool results if no assistant message was returned
      const anyResult = result as {
        toolCalls?: Array<{
          content?: unknown;
        }>;
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

      if (jobId) {
        setJobCompleted(jobId, response, result);
      }

      return { result, response };
    } catch (error) {
      if (jobId) {
        setJobError(
          jobId,
          error instanceof Error ? error.message : "Unknown error"
        );
      }
      throw error;
    }
  }
);
