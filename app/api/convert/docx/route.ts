import { NextRequest, NextResponse } from "next/server";
import * as mammoth from 'mammoth';

interface ConversionError {
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    console.log("Starting Word document conversion for file:", file.name);
    console.log("File type:", file.type);
    console.log("File size:", file.size);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("Buffer created successfully, size:", buffer.length);
    
    let text = '';
    let extractionError: ConversionError | null = null;

    // Try different extraction methods
    try {
      console.log("Attempting first extraction method with buffer...");
      const result = await mammoth.extractRawText({ buffer: buffer });
      console.log("First extraction attempt result:", result);
      text = result.value.trim();
      console.log("Extracted text length:", text.length);
    } catch (error) {
      console.warn("First extraction attempt failed:", error);
      extractionError = error as ConversionError;
      
      try {
        console.log("Attempting second extraction method with arrayBuffer...");
        const result = await mammoth.extractRawText({
          arrayBuffer: arrayBuffer
        });
        console.log("Second extraction attempt result:", result);
        text = result.value.trim();
        console.log("Extracted text length:", text.length);
      } catch (error2) {
        const conversionError = error2 as ConversionError;
        console.error("All extraction attempts failed:", {
          secondError: conversionError,
          originalError: extractionError
        });
        throw new Error(
          `Document conversion failed: ${conversionError.message || 'Unknown error'}. ` +
          `Original error: ${extractionError?.message || 'Unknown error'}`
        );
      }
    }

    if (!text) {
      console.warn("No text content extracted from document");
      throw new Error("No text content found in Word document");
    }

    // OPTIONAL: upload buffer to Firebase Storage or your server's bucket
    // const { url, path } = await uploadBuffer(buffer, file.name);

    console.log("Successfully extracted text from Word document");
    return NextResponse.json({
      text,
      success: true
    });

  } catch (err) {
    const error = err as Error;
    console.error("Word document conversion error:", {
      error,
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: true,
        details: error.message || "Unknown error occurred",
        text: null
      },
      { status: 500 }
    );
  }
} 