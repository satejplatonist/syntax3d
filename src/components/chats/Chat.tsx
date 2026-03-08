"use client";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { getUserMessage, systemMessage } from "@/helpers/prompts";
import puter from "@heyputer/puter.js";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

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
        const rawContent = messageObj?.content || "";
        const cleanedCode = rawContent
          .replace(/^```(javascript|js|typescript|ts)?\n?/im, "")
          .replace(/```\s*$/im, "")
          .replace(/^import .*;$/gm, "")
          .trim();

        const generatedReasoning =
          messageObj?.reasoning ||
          messageObj?.reasoning_details?.[0]?.text ||
          "";

        const codeWithImports = `import * as THREE from 'three';
import gsap from 'gsap';
import { animate as motionAnimate } from 'motion';

${cleanedCode}`;

        setCode(codeWithImports);
        setReasoning(generatedReasoning);
      } catch (err) {
        console.error("Puter AI Error:", err);
        setCode("Failed to generate code. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  }

  // Trigger the download inside the Sandpack iframe
  function handleDownloadModel() {
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage("DOWNLOAD_GLTF", "*");
      }
    });
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
        className="w-1/2 h-full border-2 border-neutral-600 hover:border-neutral-500 rounded-md bg-neutral-900 overflow-hidden relative"
        id="code-sandbox"
      >
        {isLoading && !code && (
          <div className="absolute inset-0 z-10 bg-neutral-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-neutral-500">
            <div className="w-8 h-8 border-2 border-t-amber-500 border-neutral-700 rounded-full animate-spin" />
            <p className="font-mono text-xs">Generating Three.js Scene...</p>
          </div>
        )}

        <div className="absolute inset-0 w-full h-full">
          <SandpackProvider
            theme="dark"
            template="vanilla"
            customSetup={{
              dependencies: {
                three: "latest",
                gsap: "latest",
                motion: "latest",
              },
            }}
            files={{
              "/index.html": {
                code: `<!DOCTYPE html>
<html>
<head>
  <title>Three.js Sandbox</title>
  <style>
    body { margin: 0; overflow: hidden; background-color: #050505; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module" src="/index.js"></script>
</body>
</html>`,
                hidden: true,
              },
              "/index.js": {
                code:
                  code ||
                  "// Enter a prompt on the left to generate a 3D scene.\n// Code will appear here.",
                active: true,
              },
            }}
          >
            {/* Custom Layout Wrapper replacing SandpackLayout */}
            <div className="w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth snap-y snap-mandatory bg-neutral-900">
              {/* TOP SECTION (PAGE 1): Preview covers 100% of the height */}
              <div
                id="preview-container"
                className="w-full h-full relative shrink-0 snap-start bg-black"
              >
                {/* Notice we pass strict style height to the component itself */}
                <SandpackPreview
                  style={{ height: "100%", width: "100%" }}
                  showNavigator={false}
                />

                {/* Floating Down Arrow Button */}
                <button
                  onClick={() => {
                    document
                      .getElementById("editor-container")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-neutral-900/80 text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 rounded-full backdrop-blur-md shadow-xl transition-all animate-bounce text-sm font-medium cursor-pointer"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                  View Code
                </button>
              </div>

              {/* BOTTOM SECTION (PAGE 2): Editor covers 100% of the height */}
              <div
                id="editor-container"
                className="w-full h-full relative shrink-0 snap-start border-t-2 border-neutral-700 bg-neutral-900"
              >
                <SandpackCodeEditor
                  style={{ height: "100%", width: "100%" }}
                  showTabs={true}
                  showLineNumbers={true}
                />

                {/* Floating Up Arrow Button */}
                <button
                  onClick={() => {
                    document
                      .getElementById("preview-container")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="absolute bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 bg-neutral-900/80 text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 rounded-full backdrop-blur-md shadow-xl transition-all cursor-pointer"
                  title="Back to Preview"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </SandpackProvider>
        </div>
      </section>
    </main>
  );
}
