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
    <main className="w-full h-full flex flex-row items-center justify-center p-8 gap-6 bg-[#09090b] text-white selection:bg-amber-500/30">
      <section
        className="w-1/2 h-full flex flex-col gap-6"
        id="chat-interface-section"
      >
        {/* --- SLEEK INPUT CARD --- */}
        <div 
          className={cn(
            "relative flex flex-col bg-[#121214] border border-white/10 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-500",
            "focus-within:border-amber-500/40 focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:shadow-[0_0_40px_-10px_rgba(245,158,11,0.15)]",
            errorMessage && "border-red-500/50 focus-within:border-red-500/50 focus-within:ring-red-500/10"
          )}
        >
          <Input
            className="bg-transparent border-none text-neutral-100 placeholder:text-neutral-600 focus-visible:ring-0 text-lg h-24 p-0 shadow-none"
            placeholder="Describe a 3D scene to generate..."
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            maxLength={MAX_PROMPT_LENGTH + 50}
          />

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 min-h-[28px]">
            {errorMessage ? (
              <div className="text-sm text-red-400 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                {errorMessage}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span 
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-300",
                    isLoading ? "bg-amber-500 animate-pulse" : (prompt ? "bg-emerald-500" : "bg-neutral-600")
                  )}
                />
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
                  {isLoading ? "Synthesizing 3D Geometry..." : (prompt !== debouncedPrompt ? "Typing..." : "Ready")}
                </span>
              </div>
            )}
            
            <div className="text-xs text-neutral-600 font-mono">
              {prompt.length} / {MAX_PROMPT_LENGTH}
            </div>
          </div>
        </div>

        {/* --- SLEEK REASONING CARD --- */}
        <div className="flex-1 bg-[#121214] border border-white/10 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden flex flex-col relative group">
          {/* Subtle top inner glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-1.5 bg-neutral-800/50 rounded-md border border-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            </div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              System Reasoning
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap font-mono custom-scrollbar pr-2">
            {isLoading && !reasoning ? (
              <span className="text-neutral-600 animate-pulse">Initializing spatial analysis...</span>
            ) : (
              <span className="text-neutral-300">{reasoning || "Awaiting instructions."}</span>
            )}
          </div>
        </div>
      </section>

      {/* Code Sandbox Section */}
      <section
        className="w-1/2 h-full border border-white/10 rounded-2xl bg-[#0d0d0f] shadow-[0_8px_30px_rgb(0,0,0,0.6)] overflow-hidden relative"
        id="code-sandbox"
      >
        {/* Force Sandpack internal containers and custom scrollbar */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .sp-preview, .sp-preview-container, .sp-preview-iframe { height: 100% !important; min-height: 100% !important; }
          .sp-editor, .cm-editor, .cm-scroller { height: 100% !important; min-height: 100% !important; }
          
          /* Custom Scrollbar for Reasoning */
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `,
          }}
        />

        {isLoading && !code && (
          <div className="absolute inset-0 z-20 bg-[#09090b]/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-amber-500 transition-all duration-500">
            <div className="relative flex items-center justify-center w-12 h-12">
              <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="font-mono text-xs tracking-widest uppercase">Rendering Scene...</p>
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
    body { margin: 0; overflow: hidden; background-color: #09090b; }
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
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden scroll-smooth snap-y snap-mandatory bg-black">
              
              {/* PAGE 1: PREVIEW (ON TOP) */}
              <div
                id="preview-container"
                className="w-full h-full relative shrink-0 snap-start bg-[#09090b]"
              >
                <div className="absolute inset-0">
                  <SandpackPreview
                    style={{ height: "100%", width: "100%" }}
                    showNavigator={false}
                  />
                </div>

                <button
                  onClick={handleDownloadModel}
                  disabled={!code || isLoading}
                  className="absolute top-6 right-6 z-50 flex items-center gap-2 px-5 py-2.5 bg-black/40 text-amber-500 hover:text-amber-400 hover:bg-black/60 border border-white/10 hover:border-amber-500/50 rounded-full backdrop-blur-xl shadow-2xl transition-all duration-300 text-sm font-semibold tracking-wide cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
                  title="Download 3D Model (.glb)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-y-0.5 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export .glb
                </button>

                <button
                  onClick={() => {
                    document.getElementById("editor-container")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-full backdrop-blur-xl shadow-2xl transition-all duration-300 animate-bounce cursor-pointer group"
                  title="View Source Code"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100">
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* PAGE 2: EDITOR (ON BOTTOM) */}
              <div
                id="editor-container"
                className="w-full h-full relative shrink-0 snap-start border-t border-white/10 bg-[#121214]"
              >
                <div className="absolute inset-0">
                  <SandpackCodeEditor
                    style={{ height: "100%", width: "100%" }}
                    showTabs={true}
                    showLineNumbers={true}
                  />
                </div>

                <button
                  onClick={() => {
                    document.getElementById("preview-container")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-12 h-12 bg-black/40 hover:bg-black/60 text-white border border-white/10 hover:border-white/20 rounded-full backdrop-blur-xl shadow-2xl transition-all duration-300 animate-bounce cursor-pointer group"
                  title="Back to Preview"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100">
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