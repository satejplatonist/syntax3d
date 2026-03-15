"use client";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import puter from "@heyputer/puter.js";
import { getUserMessage, systemMessage } from "@/helpers/prompts";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

// --- GUARDRAIL CONFIGURATION ---
const MAX_PROMPT_LENGTH = 600;
const FORBIDDEN_KEYWORDS = [
  "ignore previous",
  "ignore all",
  "system prompt",
  "jailbreak",
  "bypass",
  "write an essay",
  "write a poem",
  "nsfw",
];

export default function ChatInterface() {
  const [prompt, setPrompt] = useState("");
  const [debouncedPrompt, setDebouncedPrompt] = useState("");
  const [code, setCode] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPrompt(prompt);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [prompt]);

  // Client-Side Input Validation
  function validateInput(input: string): string | null {
    if (input.length > MAX_PROMPT_LENGTH) {
      return `Prompt is too long. Please keep it under ${MAX_PROMPT_LENGTH} characters.`;
    }

    const lowerInput = input.toLowerCase();
    for (const word of FORBIDDEN_KEYWORDS) {
      if (lowerInput.includes(word)) {
        return "Your prompt contains restricted keywords or off-topic requests.";
      }
    }

    return null;
  }

  function handleDownloadModel() {
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage("DOWNLOAD_GLTF", "*");
      }
    });
  }

  async function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!prompt.trim() || isLoading) return;

      const currentPrompt = prompt;
      setErrorMessage(null);

      const validationError = validateInput(currentPrompt);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

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

        if (!cleanedCode.includes("THREE") && !cleanedCode.includes("scene")) {
          throw new Error(
            "AI returned conversational text instead of valid 3D scene code.",
          );
        }

        const generatedReasoning =
          messageObj?.reasoning ||
          messageObj?.reasoning_details?.[0]?.text ||
          "";

        const codeWithImports = `import * as THREE from 'three';
import gsap from 'gsap';
import { animate as motionAnimate } from 'motion';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

${cleanedCode}

// --- INJECTED DOWNLOAD LISTENER ---
window.addEventListener('message', (event) => {
  if (event.data === 'DOWNLOAD_GLTF') {
    if (!window.scene) {
      console.error('Scene not found! Ensure window.scene = scene; is set by the AI.');
      return;
    }
    
    const exporter = new GLTFExporter();
    exporter.parse(
      window.scene,
      (gltf) => {
        const blob = new Blob([gltf], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ai-generated-scene.glb';
        link.click();
        URL.revokeObjectURL(url);
      },
      (error) => console.error('GLTF export error:', error),
      { binary: true }
    );
  }
});`;

        setCode(codeWithImports);
        setReasoning(generatedReasoning);
      } catch (err: any) {
        console.error("Generation Error:", err);
        setErrorMessage(
          err.message ||
            "Failed to generate code. Please ensure your prompt is about 3D shapes.",
        );
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
            className={cn(
              "bg-neutral-800 border-none border-2 text-amber-500 h-24",
              errorMessage ? "border-red-500" : "border-neutral-700",
            )}
            placeholder="Enter your prompt here to generate a 3D scene..."
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            maxLength={MAX_PROMPT_LENGTH + 50}
          />

          <div className="flex flex-col mt-4 gap-2">
            {errorMessage && (
              <div className="text-sm text-red-400 font-medium">
                ⚠️ {errorMessage}
              </div>
            )}
            <div className="flex justify-between items-center">
              {prompt && !errorMessage && (
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
        </div>

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
        {/* 🔥 FIX: Force Sandpack internal containers to inherit 100% height */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .sp-preview, .sp-preview-container, .sp-preview-iframe { height: 100% !important; min-height: 100% !important; }
          .sp-editor, .cm-editor, .cm-scroller { height: 100% !important; min-height: 100% !important; }
        `,
          }}
        />

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
            {/* 🔥 FIX: Changed to absolute inset-0 to prevent SandpackProvider from breaking the height chain */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden scroll-smooth snap-y snap-mandatory bg-neutral-900">
              {/* PAGE 1: PREVIEW (ON TOP) */}
              <div
                id="preview-container"
                className="w-full h-full relative shrink-0 snap-start bg-black"
              >
                {/* Wrapped Preview in absolute inset-0 to force bounds */}
                <div className="absolute inset-0">
                  <SandpackPreview
                    style={{ height: "100%", width: "100%" }}
                    showNavigator={false}
                  />
                </div>

                <button
                  onClick={handleDownloadModel}
                  disabled={!code || isLoading}
                  className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-neutral-900/80 text-amber-500 hover:text-amber-400 hover:bg-neutral-800 border border-neutral-600 hover:border-amber-500 rounded-md backdrop-blur-md shadow-xl transition-all font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download 3D Model (.glb)"
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download .glb
                </button>

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

              {/* PAGE 2: EDITOR (ON BOTTOM) */}
              <div
                id="editor-container"
                className="w-full h-full relative shrink-0 snap-start border-t-2 border-neutral-700 bg-neutral-900"
              >
                {/* Wrapped CodeEditor in absolute inset-0 to force bounds */}
                <div className="absolute inset-0">
                  <SandpackCodeEditor
                    style={{ height: "100%", width: "100%" }}
                    showTabs={true}
                    showLineNumbers={true}
                  />
                </div>

                <button
                  onClick={() => {
                    document
                      .getElementById("preview-container")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-neutral-900/80 text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 rounded-full backdrop-blur-md shadow-xl transition-all animate-bounce text-sm font-medium cursor-pointer"
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
                  View Model
                </button>
              </div>
            </div>
          </SandpackProvider>
        </div>
      </section>
    </main>
  );
}
