"use client"
import React, { useState, useEffect } from "react";
import puter from "@heyputer/puter.js";
import { getUserMessage, systemMessage } from "@/helpers/prompts";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { Send, Download, Sparkles, AlertCircle, Code2, Eye, Terminal, Zap, Box, Palette } from "lucide-react";

// --- GUARDRAIL CONFIGURATION ---
const MAX_PROMPT_LENGTH = 600;
const FORBIDDEN_KEYWORDS = [
  "ignore previous", "ignore all", "system prompt", "jailbreak",
  "bypass", "write an essay", "write a poem", "nsfw",
];

function validateInput(input: string): string | null {
  if (input.length > MAX_PROMPT_LENGTH) return `Max ${MAX_PROMPT_LENGTH} characters.`;
  const lower = input.toLowerCase();
  for (const word of FORBIDDEN_KEYWORDS) {
    if (lower.includes(word)) return "Your prompt contains restricted content.";
  }
  return null;
}

const EXAMPLES = [
  { label: "Rotating galaxy", icon: Sparkles },
  { label: "Low-poly forest", icon: Palette },
  { label: "Neon wireframe city", icon: Box },
  { label: "Floating crystals", icon: Zap },
];

export default function ChatInterface() {
  const [prompt, setPrompt] = useState("");
  const [debouncedPrompt, setDebouncedPrompt] = useState("");
  const [code, setCode] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [view, setView] = useState<"preview" | "code">("preview");

  // Debounce the prompt for typing indicators
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPrompt(prompt);
    }, 500);
    return () => clearTimeout(handler);
  }, [prompt]);

  function handleDownloadModel() {
    document.querySelectorAll("iframe").forEach((iframe) => {
      iframe.contentWindow?.postMessage("DOWNLOAD_GLTF", "*");
    });
  }

  async function handleSubmit() {
    if (!prompt.trim() || isLoading) return;
    const currentPrompt = prompt;
    setErrorMessage(null);
    const validationError = validateInput(currentPrompt);
    if (validationError) { setErrorMessage(validationError); return; }

    setIsLoading(true);
    setCode("");
    setReasoning("");
    setPrompt("");
    setDebouncedPrompt("");

    try {
      const response = await puter.ai.chat(
        [systemMessage, getUserMessage(currentPrompt)],
        { model: "moonshotai/kimi-k2.5" },
      );
      
      const messageObj = response?.message as any;
      const rawContent = messageObj?.content || "";
      const cleanedCode = rawContent
        .replace(/^```(javascript|js|typescript|ts)?\n?/im, "")
        .replace(/```\s*$/im, "")
        .replace(/^import .*;$/gm, "")
        .trim();

      if (!cleanedCode.includes("THREE") && !cleanedCode.includes("scene")) {
        throw new Error("AI returned conversational text instead of valid 3D scene code.");
      }

      const generatedReasoning = messageObj?.reasoning || messageObj?.reasoning_details?.[0]?.text || "";

      // Wraps the generated code with standard imports and the GLTF download listener
      const codeWithImports = `import * as THREE from 'three';
import gsap from 'gsap';
import { animate as motionAnimate } from 'motion';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

${cleanedCode}

// --- INJECTED DOWNLOAD LISTENER ---
window.addEventListener('message', (event) => {
  if (event.data === 'DOWNLOAD_GLTF') {
    if (!window.scene) { console.error('Scene not found! Ensure window.scene = scene; is set by the AI.'); return; }
    const exporter = new GLTFExporter();
    exporter.parse(window.scene,
      (gltf) => {
        const blob = new Blob([gltf], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'scene.glb'; link.click();
        URL.revokeObjectURL(url);
      },
      (error) => console.error('Export error:', error),
      { binary: true }
    );
  }
});`;

      setCode(codeWithImports);
      setReasoning(generatedReasoning);
    } catch (err: any) {
      console.error("Generation Error:", err);
      setErrorMessage(err.message || "Failed to generate code. Please ensure your prompt is about 3D shapes.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  const statusLabel = isLoading ? "Generating…" : errorMessage ? "Error" : prompt !== debouncedPrompt ? "Typing..." : prompt.trim() ? "Press Enter ↵ to generate" : code ? "Complete ✓" : "Ready — type a prompt";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-0">
      {/* LEFT — Controls */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 flex flex-col p-5 lg:p-8 lg:h-screen lg:overflow-y-auto scrollbar-thin">
        
        {/* Hero / Brand */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Box className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
              Syntax<span className="text-gradient-warm">3D</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            Describe any 3D scene in plain English — AI builds it instantly with Three.js. Preview, edit the code, and export as <strong className="text-foreground">.glb</strong>.
          </p>
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-2 mb-5">
          {EXAMPLES.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => { setPrompt(label); setErrorMessage(null); }} className="chip">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Prompt Card */}
        <div className="soft-card p-5">
          <label htmlFor="prompt-input" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Your Prompt
          </label>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); if (errorMessage) setErrorMessage(null); }}
            onKeyDown={handleKeyDown}
            placeholder="A floating crystal that refracts rainbow light, spinning slowly in space…"
            disabled={isLoading}
            rows={3}
            maxLength={MAX_PROMPT_LENGTH}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm resize-none outline-none disabled:opacity-50 leading-relaxed"
            aria-describedby="char-count"
          />
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className={isLoading ? "status-loading" : errorMessage ? "status-error" : prompt.trim() ? "status-typing" : "status-ready"} />
              <span className="text-xs font-medium text-muted-foreground">{statusLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <span id="char-count" className="text-xs font-mono text-muted-foreground">
                {prompt.length}/{MAX_PROMPT_LENGTH}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="btn-primary text-xs !px-4 !py-2"
                aria-label="Generate 3D scene"
              >
                <Send className="w-3.5 h-3.5" />
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mt-3 flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/8 border border-destructive/20 animate-slide-up" role="alert">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Reasoning Panel */}
        <div className="mt-5 soft-card flex-1 min-h-[120px] flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
            <Terminal className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Reasoning</span>
          </div>
          <div className="p-5 flex-1 overflow-y-auto scrollbar-thin">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {isLoading && !reasoning ? "Initializing spatial analysis..." : reasoning || "Awaiting instructions."}
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { step: "1", title: "Describe", desc: "Type your 3D idea" },
            { step: "2", title: "Generate", desc: "AI writes the code" },
            { step: "3", title: "Export", desc: "Download as .glb" },
          ].map((s) => (
            <div key={s.step} className="soft-card p-3 text-center">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-heading font-bold text-xs flex items-center justify-center mx-auto mb-2">
                {s.step}
              </div>
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Preview / Editor */}
      <div className="flex-1 flex flex-col lg:h-screen p-2 lg:p-3">
        <div className="soft-card flex-1 flex flex-col overflow-hidden relative">
          
          {/* Loader Overlay matching the dark mode style but adapted for light UI container */}
          {isLoading && !code && (
            <div className="absolute inset-0 z-20 bg-card/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-primary transition-all duration-500">
              <div className="relative flex items-center justify-center w-12 h-12">
                <div className="absolute inset-0 border-2 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="font-mono text-xs tracking-widest uppercase">Rendering Scene...</p>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border z-10 bg-card">
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setView("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={() => setView("code")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "code" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code
              </button>
            </div>

            {code && (
              <button onClick={handleDownloadModel} className="btn-primary text-xs !px-3.5 !py-1.5" aria-label="Export .glb">
                <Download className="w-3.5 h-3.5" />
                Export .glb
              </button>
            )}
          </div>

          {/* Sandpack - Absolute Position Fix for Full Height */}
          <div className="flex-1 relative min-h-0 bg-[#09090b]">
            <SandpackProvider
              template="vanilla"
              theme="dark" // Usually best to keep Sandpack dark so the 3D scene pops
              customSetup={{
                dependencies: { three: "latest", gsap: "latest", motion: "latest" },
              }}
              files={{
                "/index.html": {
                  // INJECTED <canvas id="canvas"> TO PREVENT NULL ERRORS
                  code: `<!DOCTYPE html>
<html>
<head>
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
                  code: code || "// Describe a 3D scene on the left to get started.\n// Your generated Three.js code will appear here.",
                  active: true,
                },
              }}
            >
              {/* Preview Tab */}
              <div className={`absolute inset-0 [&_.sp-preview]:!h-full [&_.sp-preview-container]:!h-full [&_iframe]:!h-full ${view === "preview" ? "block" : "hidden"}`}>
                <SandpackPreview
                  showNavigator={false}
                  showRefreshButton={false}
                />
              </div>

              {/* Code Tab */}
              <div className={`absolute inset-0 [&_.sp-code-editor]:!h-full [&_.cm-editor]:!h-full [&_.cm-scroller]:!h-full ${view === "code" ? "block" : "hidden"}`}>
                <SandpackCodeEditor
                  showLineNumbers
                  showTabs={false}
                />
              </div>
            </SandpackProvider>
          </div>
        </div>
      </div>
    </div>
  );
}