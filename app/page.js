"use client";

import { useState } from "react";

const MODELS = [
  { id: "us.anthropic.claude-haiku-4-5-20251001-v1:0", name: "Claude Haiku 4.5" },
  { id: "us.meta.llama3-1-8b-instruct-v1:0", name: "Llama 3.1 8B" },
  { id: "us.amazon.nova-2-lite-v1:0", name: "Nova 2 Lite" },
  { id: "mistral.mistral-7b-instruct-v0:2", name: "Mistral 7B" },
  { id: "us.deepseek.r1-v1:0", name: "DeepSeek R1" },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  async function handleRun() {
    if (!prompt.trim()) return;

    const newLoading = {};
    const newResults = {};
    MODELS.forEach((m) => {
      newLoading[m.id] = true;
      newResults[m.id] = null;
    });
    setLoading(newLoading);
    setResults(newResults);

    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim() }),
    });

    const data = await res.json();

    const finalResults = {};
    const finalLoading = {};
    MODELS.forEach((m) => {
      const modelResult = data.results.find((r) => r.modelId === m.id);
      if (modelResult) {
        finalResults[m.id] = modelResult;
      }
      finalLoading[m.id] = false;
    });

    setResults(finalResults);
    setLoading(finalLoading);
  }

  return (
    <main className="flex flex-col min-h-screen p-6 gap-6 max-w-[1800px] mx-auto w-full">
      <div className="text-center">
        <h1 className="text-5xl font-bold">
          Bedrock Model Compare{" "}
          <span className="text-lg font-normal text-yellow-400 border border-yellow-400/40 rounded px-2 py-1 ml-2 align-middle">
            Beta - 5 Models Only
          </span>
        </h1>
        <p className="mt-3 text-base text-zinc-400 bg-zinc-800/50 border border-zinc-700 rounded-md px-4 py-2.5 inline-block">
          ⚠ Results may vary due to prompt phrasing, network conditions, and other factors. Do not use as an absolute benchmark.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="flex gap-2 w-full max-w-xl">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleRun();
              }
            }}
          />
          <button
            onClick={handleRun}
            disabled={!prompt.trim() || Object.values(loading).some(Boolean)}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            Run All Models
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1">
        {MODELS.map((model) => (
          <div
            key={model.id}
            className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-medium text-sm">{model.name}</span>
              {results[model.id]?.time != null && (
                <span className="text-xs text-zinc-400">
                  {(results[model.id].time / 1000).toFixed(2)}s
                </span>
              )}
            </div>

            <div className="flex-1 p-3 text-sm overflow-auto min-h-[200px]">
              {loading[model.id] ? (
                <div className="flex items-center justify-center h-full">
                  <svg
                    className="spinner h-6 w-6 text-zinc-500"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                </div>
              ) : results[model.id]?.error ? (
                <p className="text-red-400 text-xs">{results[model.id].error}</p>
              ) : results[model.id]?.text ? (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
                  {results[model.id].text}
                </pre>
              ) : (
                <p className="text-zinc-600 text-xs italic">
                  Waiting for prompt...
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
