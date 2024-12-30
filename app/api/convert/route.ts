import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

// You should store this in your environment variables
const API_KEY = process.env.PDF_CO_API_KEY as string;

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" });
    }

    // 1. Get presigned URL for upload
    const presignedUrlResponse = await fetch(
      `https://api.pdf.co/v1/file/upload/get-presigned-url?contenttype=application/octet-stream&name=${file.name}`,
      {
        method: "GET",
        headers: new Headers({
          "x-api-key": API_KEY,
        }),
      }
    );

    const presignedData = await presignedUrlResponse.json();

    if (presignedData.error) {
      throw new Error(presignedData.message);
    }

    // 2. Upload the file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await fetch(presignedData.presignedUrl, {
      method: "PUT",
      headers: new Headers({
        "content-type": "application/octet-stream",
        "x-api-key": API_KEY,
      }),
      body: buffer,
    });

    // 3. Convert PDF to Text using the simple endpoint
    const convertResponse = await fetch(
      "https://api.pdf.co/v1/pdf/convert/to/text-simple",
      {
        method: "POST",
        headers: new Headers({
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          url: presignedData.url,
          inline: true,
          async: false,
        }),
      }
    );

    const convertData = await convertResponse.json();

    if (convertData.error) {
      throw new Error(convertData.message);
    }

    return NextResponse.json({
      success: true,
      text: convertData.body,
      pageCount: convertData.pageCount,
    });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Conversion failed",
    });
  }
}
