"use client";

import { useState } from "react";

interface ConversionResponse {
  success: boolean;
  text?: string;
  pageCount?: number;
  error?: string;
}

export default function Home() {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      const data: ConversionResponse = await response.json();

      if (data.success && data.text) {
        setText(data.text);
      } else {
        alert("Conversion failed: " + data.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred during conversion");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    alert("Text copied to clipboard!");
  };

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">PDF to Text Converter</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <input
          type="file"
          name="file"
          accept=".pdf"
          required
          className="mb-4 block"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Converting..." : "Convert PDF"}
        </button>
      </form>

      {text && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Extracted Text:</h2>
            <button
              onClick={handleCopyText}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Copy Text
            </button>
          </div>
          <pre className="bg-gray-100 p-4 rounded overflow-auto whitespace-pre-wrap text-sm">
            {text}
          </pre>
        </div>
      )}
    </main>
  );
}

