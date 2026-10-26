"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MAX_SIZE = 5 * 1024 * 1024;

const ANALYSIS_FIELDS = [
  "DETECTED ITEM",
  "WASTE CATEGORY",
  "MATERIAL",
  "DISPOSAL INSTRUCTIONS",
  "REUSE TIP",
  "ENVIRONMENTAL IMPACT",
  "CONFIDENCE",
] as const;

function parseAnalysis(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  let currentField = "";

  for (const line of text.split(/\r?\n/)) {
    // Remove bold markers but keep bullets for body lines
    const stripped = line.replace(/\*\*/g, "").trim();

    // Only for heading detection: also strip bullets, hashes, numbering
    const headingCandidate = stripped
      .replace(/^[\s>*#\-•\d.)]+/, "")
      .trim();

    const heading = ANALYSIS_FIELDS.find((field) =>
      headingCandidate.toUpperCase().startsWith(field + ":")
    );

    if (heading) {
      currentField = heading;
      result[currentField] = headingCandidate.slice(heading.length + 1).trim();
    } else if (currentField && stripped) {
      result[currentField] = result[currentField]
        ? result[currentField] + "\n" + stripped
        : stripped;
    }
  }

  return result;
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const parsedAnalysis = useMemo(() => parseAnalysis(analysis), [analysis]);
  const hasStructuredResult = Object.keys(parsedAnalysis).length > 0;

  const fileInput = useRef<HTMLInputElement>(null);
  const imageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
    };
  }, []);

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG, WEBP, or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("Please choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    imageUrlRef.current = url;

    setError("");
    setAnalysis("");
    setCopied(false);
    setFileName(file.name);
    setSelectedFile(file);
    setImage(url);
  }

  async function analyzeImage() {
    if (!selectedFile) {
      setError("Please choose a waste photo first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis("");
    setCopied(false);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      let data: {
        success?: boolean;
        analysis?: unknown;
        error?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Server returned an unexpected response (status ${response.status}).`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to analyze this image. Please try again."
        );
      }

      const result =
        typeof data.analysis === "string"
          ? data.analysis
          : JSON.stringify(data.analysis, null, 2);

      setAnalysis(
        result || "The AI did not return an analysis. Please try again."
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetImage() {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
    }

    imageUrlRef.current = null;

    setImage(null);
    setFileName("");
    setSelectedFile(null);
    setAnalysis("");
    setError("");
    setCopied(false);

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  async function copyReport() {
    const text = hasStructuredResult
      ? ANALYSIS_FIELDS.map(
          (field) => `${field}: ${parsedAnalysis[field] || "Not provided"}`
        ).join("\n\n")
      : analysis;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7ef] text-[#203b2b]">
      <nav className="flex items-center justify-between border-b border-green-900/10 bg-white px-6 py-5 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-800 text-2xl text-white">
            ♻
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight">EcoSort AI</h1>
            <p className="text-xs text-gray-500">Waste less. Live greener.</p>
          </div>
        </div>

        <span className="rounded-full border border-green-200 px-4 py-2 text-sm font-medium">
          AI-powered recycling
        </span>
      </nav>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-5 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
            A smarter way to sort waste
          </p>

          <h2 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Small actions.
            <span className="block text-green-700"> Cleaner planet.</span>
          </h2>

          <p className="mt-6 max-w-lg text-lg leading-8 text-gray-600">
            Confused about where your waste belongs? Start with a photo.
            EcoSort AI will help you take the next step toward responsible
            waste disposal.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-xl bg-white px-4 py-3 shadow-sm">
              ♻ Recycling guidance
            </span>

            <span className="rounded-xl bg-white px-4 py-3 shadow-sm">
              🌍 Greener choices
            </span>
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Your journey toward better waste sorting starts here.
          </p>
        </div>

        <div className="rounded-3xl border border-green-900/10 bg-white p-6 shadow-xl shadow-green-900/5 md:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-green-700">
              Try it out
            </p>

            <h3 className="mt-2 text-2xl font-bold">Identify your waste</h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Upload a clear photo of a single waste item to get started.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-green-300 bg-green-50 p-6 text-center transition hover:border-green-600 hover:bg-green-100"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt="Selected waste item"
                className="max-h-56 max-w-full rounded-xl object-contain"
              />
            ) : (
              <>
                <span className="mb-4 text-5xl">📸</span>
                <span className="text-lg font-bold">Upload a waste photo</span>
                <span className="mt-2 text-sm text-gray-500">
                  Click here to select an image from your computer
                </span>
                <span className="mt-5 rounded-xl bg-green-800 px-6 py-3 font-semibold text-white">
                  Choose image
                </span>
              </>
            )}
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImage}
            className="hidden"
          />

          {image && (
            <div className="mt-4">
              <p className="break-all text-sm text-green-800">
                Selected: {fileName}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={analyzeImage}
                  disabled={loading}
                  className="rounded-xl bg-green-800 px-6 py-3 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Analyzing image..." : "Analyze my waste"}
                </button>

                <button
                  type="button"
                  onClick={resetImage}
                  disabled={loading}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  Choose another photo
                </button>
              </div>
            </div>
          )}

          {loading && (
            <p className="mt-5 text-sm text-green-700" role="status">
              🌱 EcoSort AI is examining your image. Please wait...
            </p>
          )}

          {error && (
            <div
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {analysis && (
            <section
              className="mt-6 rounded-2xl border border-green-200 bg-white p-5 shadow-sm"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-2xl">
                    ♻️
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-green-900">
                      Waste Analysis Report
                    </h4>
                    <p className="text-sm text-gray-500">
                      AI-powered waste identification
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyReport}
                  className="rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-800 transition hover:bg-green-50"
                >
                  {copied ? "✓ Copied" : "Copy report"}
                </button>
              </div>

              {hasStructuredResult ? (
                <>
                  {/* Detected item */}
                  <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                      🔍 Detected Item
                    </p>

                    <p className="mt-2 text-lg font-bold text-gray-800">
                      {parsedAnalysis["DETECTED ITEM"] ||
                        "Item identification unavailable"}
                    </p>
                  </div>

                  {/* Waste category */}
                  <div className="mt-4 rounded-xl border border-gray-100 p-4">
                    <p className="text-sm font-semibold text-gray-500">
                      ♻️ WASTE CATEGORY
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
                      {parsedAnalysis["WASTE CATEGORY"] || "Not classified"}
                    </span>
                  </div>

                  {/* Material */}
                  <div className="mt-4 rounded-xl border border-gray-100 p-4">
                    <p className="text-sm font-semibold text-gray-500">
                      🧱 MATERIAL
                    </p>

                    <p className="mt-2 text-base font-semibold text-gray-800">
                      {parsedAnalysis["MATERIAL"] || "Not identified"}
                    </p>
                  </div>

                  {/* Disposal instructions */}
                  <div className="mt-4 rounded-xl border border-gray-100 p-4">
                    <h5 className="font-bold text-green-900">
                      🗑️ Disposal Instructions
                    </h5>

                    <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                      {parsedAnalysis["DISPOSAL INSTRUCTIONS"] ||
                        "No disposal instructions were returned."}
                    </div>
                  </div>

                  {/* Reuse tip and environmental impact */}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                      <h5 className="font-bold text-green-900">🌱 Reuse Tip</h5>

                      <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                        {parsedAnalysis["REUSE TIP"] ||
                          "No reuse tip was returned."}
                      </div>
                    </div>

                    <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                      <h5 className="font-bold text-green-900">
                        🌍 Environmental Impact
                      </h5>

                      <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                        {parsedAnalysis["ENVIRONMENTAL IMPACT"] ||
                          "No environmental impact information was returned."}
                      </div>
                    </div>
                  </div>

                  {/* AI confidence */}
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h5 className="font-bold text-green-900">
                        🎯 AI Confidence
                      </h5>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                        {parsedAnalysis["CONFIDENCE"] || "Not provided"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      This is the AI&apos;s own estimate of its confidence in
                      the identification. It is not a scientifically
                      calibrated probability, so it should not be treated as a
                      guarantee that the result is correct.
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-green-100 bg-green-50 p-4 text-sm leading-7 text-gray-700">
                  {analysis}
                </div>
              )}

              <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-500">
                AI-generated guidance may not always be correct. Check local
                recycling rules, especially for hazardous waste.
              </p>
            </section>
          )}

          <p className="mt-5 text-xs leading-5 text-gray-400">
            Upload a photo to receive AI-generated waste identification and
            disposal guidance.
          </p>
        </div>
      </section>

      <footer className="border-t border-green-900/10 bg-white px-6 py-6 text-center text-sm text-gray-500">
        Built for a cleaner tomorrow · EcoSort AI
      </footer>
    </main>
  );
}