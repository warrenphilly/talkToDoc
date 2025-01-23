import { NextRequest, NextResponse } from "next/server";
import * as mammoth from 'mammoth';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    console.log("Converting Word document...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let text = '';
    try {
      // First try extracting raw text
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      text = result.value.trim();
    } catch (extractError) {
      console.warn("First extraction attempt failed, trying alternative method...");
      
      // If that fails, try with buffer
      const result = await mammoth.extractRawText({ buffer: buffer });
      text = result.value.trim();
    }

    if (!text) {
      throw new Error("No text content found in Word document");
    }

    // OPTIONAL: upload buffer to Firebase Storage or your server's bucket
    // const { url, path } = await uploadBuffer(buffer, file.name);

    console.log("Successfully extracted text from Word document");
    return NextResponse.json({
      text,
      // optionalBucketURL: url,
    });

  } catch (err) {
    const error = err as Error;
    console.error("Word document conversion error:", error);
    return NextResponse.json(
      { 
        error: "Failed to convert Word document",
        details: error.message || "Unknown error occurred"
      },
      { status: 500 }
    );
  }
} 