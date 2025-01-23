import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.PDF_CO_API_KEY as string;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const base64PDF = pdfBuffer.toString('base64');
    
    // First, upload the file to PDF.co
    const uploadPayload = {
      file: base64PDF
    };

    console.log("Uploading file to PDF.co...");
    
    const uploadResponse = await fetch(
      'https://api.pdf.co/v1/file/upload/base64',
      {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(uploadPayload)
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${await uploadResponse.text()}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log("Upload result:", uploadResult);

    if (!uploadResult.url) {
      throw new Error('No URL in upload response');
    }

    // Now convert the uploaded file to text with updated payload
    const convertPayload = {
      url: uploadResult.url,
      async: false,
      name: file.name,
      password: "",
      pages: "",
      ocr: true,
      ocrLanguage: "eng",
      ocrResolution: 300,
      outputFormat: "text"
    };

    console.log("Converting uploaded file to text...");
    
    const response = await fetch(
      'https://api.pdf.co/v1/pdf/convert/to/text',
      {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(convertPayload)
      }
    );

    const result = await response.json();
    console.log("API Response:", result);

    if (!response.ok || result.error) {
      console.error("PDF conversion error:", result);
      throw new Error(result.message || 'PDF conversion failed');
    }

    let text = '';
    // Get text from the result URL
    if (result.url) {
      const textResponse = await fetch(result.url);
      if (!textResponse.ok) {
        throw new Error('Failed to fetch text from result URL');
      }
      text = await textResponse.text();
      
      if (!text.trim()) {
        throw new Error('No text content extracted from PDF');
      }
    } else {
      throw new Error('No text URL in response');
    }

    console.log("Successfully extracted text from PDF");
    return NextResponse.json({ 
      text,
      success: true 
    });

  } catch (err) {
    const error = err as Error;
    console.error("PDF conversion error:", error);
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