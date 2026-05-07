"use client";

import { useRef, useState, useEffect } from "react";
import NeuralNetwork3D from "./components/NeuralNetwork3D";

type PointerEvent =
  | React.MouseEvent<HTMLCanvasElement>
  | React.TouchEvent<HTMLCanvasElement>;

type Probabilities = Record<string, number>;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [probabilities, setProbabilities] = useState<Probabilities | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black";
    ctx.imageSmoothingEnabled = true;
  }, []);

  const getPosition = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPosition(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: PointerEvent) => {
    if (!isDrawing) return;

    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPosition(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setPrediction(null);
    setConfidence(null);
    setProbabilities(null);
  };

  const predictDigit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      alert("Missing NEXT_PUBLIC_API_URL in your .env.local or Vercel environment variables.");
      return;
    }

    const image = canvas.toDataURL("image/png");

    try {
      setLoading(true);

      const response = await fetch(`${apiUrl}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Prediction request failed.");
      }

      setPrediction(data.prediction);
      setConfidence(data.confidence);
      setProbabilities(data.probabilities);
    } catch (error) {
      console.error(error);
      alert("Prediction failed. Check your Render backend URL and CORS settings.");
    } finally {
      setLoading(false);
    }
  };

  const sortedProbabilities = probabilities
    ? Object.entries(probabilities)
        .map(([digit, value]) => ({
          digit,
          percent: value * 100,
        }))
        .sort((a, b) => b.percent - a.percent)
    : [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#050816_45%,#020617_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="grid w-full gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-400 sm:text-sm">
                CNN Neural Network
              </p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                Digit Classifier AI
              </h1>
              <p className="mt-2 text-sm text-gray-400">
                Draw a digit from 0 to 9 and let the TensorFlow model predict it.
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                className="h-[260px] w-[260px] touch-none cursor-crosshair rounded-2xl bg-white shadow-[0_0_40px_rgba(59,130,246,0.25)] sm:h-[280px] sm:w-[280px]"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={predictDigit}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500 disabled:opacity-60"
              >
                {loading ? "Predicting..." : "Predict"}
              </button>

              <button
                onClick={clearCanvas}
                className="rounded-xl bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/20"
              >
                Clear
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
                <p className="text-sm text-blue-200">Top Prediction</p>
                <p className="mt-3 text-7xl font-black text-blue-300 sm:text-8xl">
                  {prediction !== null ? prediction : "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm text-gray-400">Confidence</p>
                <p className="mt-3 text-4xl font-black sm:text-5xl">
                  {confidence !== null ? `${confidence}%` : "-"}
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  Higher confidence means the model is more certain about its prediction.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Probability Breakdown</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                  digits 0–9
                </span>
              </div>

              <div className="space-y-3">
                {sortedProbabilities.length > 0 ? (
                  sortedProbabilities.map((item, index) => (
                    <div key={item.digit}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold ${
                              index === 0
                                ? "bg-blue-500 text-white"
                                : "bg-white/10 text-gray-300"
                            }`}
                          >
                            {item.digit}
                          </span>
                          <span className="text-gray-300">Digit {item.digit}</span>
                        </div>

                        <span className="font-semibold text-gray-200">
                          {item.percent.toFixed(2)}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            index === 0 ? "bg-blue-400" : "bg-white/40"
                          }`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">
                    Draw a digit and click Predict to see probability bars.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-5 lg:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-400">
                Model Architecture
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                CNN 3D Neural Network View
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Shows the drawn digit flowing through the trained CNN layers to the predicted output.
              </p>
            </div>

            <span className="w-fit rounded-full bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-200">
              Input → CNN → Output
            </span>
          </div>

          <div className="h-[440px] overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:h-[560px] lg:h-[680px] xl:h-[760px]">
           <NeuralNetwork3D prediction={prediction} inputDigit={prediction} />
          </div>
        </section>
      </div>
    </main>
  );
}