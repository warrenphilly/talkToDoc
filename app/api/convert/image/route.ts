import { NextRequest, NextResponse } from "next/server";
import { createWorker } from 'tesseract.js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    const worker = await createWorker();
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();

    if (!text) {
      throw new Error('No text extracted from image');
    }

    console.log("Successfully extracted text from image");
    return NextResponse.json({ text });

  } catch (err) {
    const error = err as Error;
    console.error("Image conversion error:", error);
    return NextResponse.json(
      { 
        error: "Failed to convert image",
        details: error.message || "Unknown error occurred"
      },
      { status: 500 }
    );
  }
} 