"use client";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { getUserMessage, systemMessage } from "@/helpers/prompts";
import puter from "@heyputer/puter.js";

export default function ChatInterface() {
  const [prompt, setPrompt] = useState("");
  const [debouncedPrompt, setDebouncedPrompt] = useState("");
  const [code, setCode] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPrompt(prompt);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [prompt]);

  async function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!prompt.trim() || isLoading) return;

      const currentPrompt = prompt;
      console.log("Submitting prompt:", currentPrompt);

      setIsLoading(true);
      setCode("");
      setReasoning("");
      setPrompt("");
      setDebouncedPrompt("");

      try {
        const response = await puter.ai.chat(
          [systemMessage, getUserMessage(currentPrompt)],
          {
            model: "moonshotai/kimi-k2.5",
          },
        );
        const messageObj = response?.message as any;

        // Extract Data
        const generatedCode = messageObj?.content || "";
        const generatedReasoning =
          messageObj?.reasoning ||
          messageObj?.reasoning_details?.[0]?.text ||
          "";
        setCode(generatedCode);
        setReasoning(generatedReasoning);
      } catch (err) {
        console.error("Puter AI Error:", err);
        setCode(" Failed to generate code. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <main className="w-full h-full flex flex-row items-center justify-center p-12 gap-4 bg-neutral-950 text-white">
      <section
        className="w-1/2 h-full flex flex-col gap-4"
        id="chat-interface-section"
      >
        <div className="border-2 border-neutral-600 hover:border-neutral-500 rounded-md p-4 bg-neutral-900">
          <Input
            className="bg-neutral-800 border-none border-2 border-neutral-700 text-amber-500 h-24"
            placeholder="Enter your prompt here ....."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <div className="flex justify-between items-center mt-4">
            {prompt && (
              <div
                className={cn(
                  prompt !== debouncedPrompt
                    ? "text-sm text-emerald-500"
                    : "text-sm text-cyan-500",
                )}
              >
                {prompt !== debouncedPrompt ? "Typing..." : "Ready (Enter)"}
              </div>
            )}
            {isLoading && (
              <div className="text-sm text-amber-500 animate-pulse">
                AI is processing...
              </div>
            )}
          </div>
        </div>

        {/* Reasoning Display Box */}
        <div className="flex-1 border-2 border-neutral-800 rounded-md p-4 bg-neutral-900 overflow-y-auto">
          <p className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-tighter">
            System Reasoning
          </p>
          <div className="text-sm text-neutral-400 whitespace-pre-wrap italic">
            {isLoading && !reasoning
              ? "Analyzing 3D geometry constraints..."
              : reasoning}
          </div>
        </div>
      </section>

      {/* Code Sandbox Section */}
      <section
        className="w-1/2 h-full border-2 border-neutral-600 hover:border-neutral-500 rounded-md bg-neutral-900 p-4 overflow-auto"
        id="code-sandbox"
      >
        {isLoading && !code ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-500">
            <div className="w-6 h-6 border-2 border-t-amber-500 border-neutral-700 rounded-full animate-spin" />
            <p className="font-mono text-xs">Generating Three.js Scene...</p>
          </div>
        ) : (
          <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
            {code || "Your 3D logic will appear here after prompt."}
          </pre>
        )}
      </section>
    </main>
  );
}
