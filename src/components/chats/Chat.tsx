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
      if (!prompt.trim()) return;
      console.log("Submitting prompt:", prompt);
      try {
        const response = await puter.ai.chat(
          [systemMessage, getUserMessage(prompt)],
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
      } finally {
        setIsLoading(false);
      }
      setDebouncedPrompt("");
      setPrompt("");
    }
  }

  return (
    <main className="w-full h-full flex flex-row items-center justify-center p-12 gap-2">
      <section
        className="w-1/2 h-full border-2 border-neutral-600 hover:border-neutral-500 rounded-md p-4"
        id="chat-interface-section"
      >
        <Input
          className="bg-neutral-800 border-none border-2 border-neutral-700 text-amber-500 h-24"
          placeholder="Enter your prompt here ....."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {prompt && (
          <div
            className={cn(
              prompt !== debouncedPrompt
                ? "mt-4 text-sm text-emerald-500"
                : "mt-4 text-sm text-cyan-500",
            )}
          >
            {prompt !== debouncedPrompt ? "Typing..." : "Ready"}
          </div>
        )}
      </section>
      <section
        className="w-1/2 h-full border-2 border-neutral-600 hover:border-neutral-500 rounded-md"
        id="code-sandbox"
      >
        {prompt}
      </section>
    </main>
  );
}
