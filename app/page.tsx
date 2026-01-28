"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // On mount, resume any in-progress job from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedJobId = window.localStorage.getItem("currentJobId");
    if (savedJobId) {
      setCurrentJobId(savedJobId);
      setIsLoading(true);
    }
  }, []);

  // Poll job status while a job is in progress
  useEffect(() => {
    if (!currentJobId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/agent/status?id=${currentJobId}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.status === "pending" || data.status === "not_found") {
          // Keep polling
          setTimeout(poll, 2000);
          return;
        }

        if (data.status === "completed") {
          const assistantMessage = data.response || "No response";
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: assistantMessage },
          ]);
        } else if (data.status === "error") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${data.error ?? "Unknown error"}`,
            },
          ]);
        }

        setIsLoading(false);
        setCurrentJobId(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("currentJobId");
        }
      } catch (error) {
        if (cancelled) return;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error while checking status: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ]);
        setIsLoading(false);
        setCurrentJobId(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("currentJobId");
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [currentJobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      setIsLoading(true);
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
        setIsLoading(false);
        return;
      }

      if (data.jobId) {
        setCurrentJobId(data.jobId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("currentJobId", data.jobId);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "No jobId returned from server.",
          },
        ]);
        setIsLoading(false);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${
            error instanceof Error ? error.message : "Something went wrong"
          }`,
        },
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-white">AI Agent</h1>
        <p className="text-sm text-gray-400">Powered by Inngest AgentKit</p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm mt-2">
                Try asking about the weather or the current time
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3 font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
