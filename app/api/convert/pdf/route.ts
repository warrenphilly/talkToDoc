import { adminStorage } from "@/lib/firebase/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.PDF_CO_API_KEY as string;
const MAX_UPLOAD_SIZE = 3 * 1024 * 1024; // 3MB limit for safety

// Create a temporary storage for chunks
const chunkStore: Record<string, Buffer[]> = {};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const isChunk = formData.get("isChunk") === "true";
    const isFinal = formData.get("isFinal") === "true";
    const chunkId = formData.get("chunkId") as string; // Add a unique ID for each file being processed

    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    // Check file size before attempting upload
    if (pdfBuffer.length > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        {
          error: true,
          details: `File size (${(pdfBuffer.length / (1024 * 1024)).toFixed(
            2
          )}MB) exceeds PDF.co's limit. Try reducing chunk size.`,
          text: null,
        },
        { status: 413 }
      );
    }

    // If this is a chunk, store it and return success
    if (isChunk) {
      if (!chunkStore[chunkId]) {
        chunkStore[chunkId] = [];
      }

      chunkStore[chunkId].push(pdfBuffer);

      // If not the final chunk, just return success
      if (!isFinal) {
        return NextResponse.json({
          success: true,
          text: "", // Empty text for non-final chunks
        });
      }

      // If it's the final chunk, combine all chunks
      const completeBuffer = Buffer.concat(chunkStore[chunkId]);
      console.log(
        `Combined ${chunkStore[chunkId].length} chunks into a complete PDF (${(
          completeBuffer.length / 1024
        ).toFixed(2)}KB)`
      );

      // Clean up the chunk store
      delete chunkStore[chunkId];

      // Upload the complete PDF to Firebase Storage temporarily
      const bucket = adminStorage.bucket();
      const tempFileName = `temp-pdf/${chunkId}-${Date.now()}.pdf`;
      const file = bucket.file(tempFileName);

      await file.save(completeBuffer, {
        metadata: {
          contentType: "application/pdf",
        },
      });

      // Get a signed URL for the file
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 3600 * 1000, // 1 hour
      });

      // Now use PDF.co's URL upload
      const uploadPayload = {
        url: signedUrl,
      };

      console.log(`Uploading complete PDF via URL to PDF.co...`);

      const uploadResponse = await fetch(
        "https://api.pdf.co/v1/file/upload/url",
        {
          method: "POST",
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(
          "Upload failed with status:",
          uploadResponse.status,
          errorText
        );
        throw new Error(`Upload failed: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log("Upload result:", uploadResult);

      if (!uploadResult.url) {
        throw new Error("No URL in upload response");
      }

      // Now convert the uploaded file to text
      const convertPayload = {
        url: uploadResult.url,
        async: false,
        name: file.name,
        password: "",
        pages: "",
        ocr: true,
        ocrLanguage: "eng",
        ocrResolution: 300,
        outputFormat: "text",
      };

      console.log("Converting uploaded file to text...");

      const response = await fetch(
        "https://api.pdf.co/v1/pdf/convert/to/text",
        {
          method: "POST",
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(convertPayload),
        }
      );

      const result = await response.json();
      console.log("API Response:", result);

      if (!response.ok || result.error) {
        console.error("PDF conversion error:", result);
        throw new Error(result.message || "PDF conversion failed");
      }

      let text = "";
      // Get text from the result URL
      if (result.url) {
        const textResponse = await fetch(result.url);
        if (!textResponse.ok) {
          throw new Error("Failed to fetch text from result URL");
        }
        text = await textResponse.text();

        if (!text.trim()) {
          throw new Error("No text content extracted from PDF");
        }
      } else {
        throw new Error("No text URL in response");
      }

      // Clean up the temporary file
      await file
        .delete()
        .catch((err) => console.error("Error deleting temp file:", err));

      console.log("Successfully extracted text from PDF");
      return NextResponse.json({
        text,
        success: true,
      });
    } else {
      // Handle non-chunked uploads (small files) with the original logic
      const base64PDF = pdfBuffer.toString("base64");

      // Upload the file to PDF.co
      const uploadPayload = {
        file: base64PDF,
      };

      console.log(
        `Uploading file (${(pdfBuffer.length / 1024).toFixed(
          2
        )}KB) to PDF.co...`
      );

      const uploadResponse = await fetch(
        "https://api.pdf.co/v1/file/upload/base64",
        {
          method: "POST",
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(
          "Upload failed with status:",
          uploadResponse.status,
          errorText
        );
        throw new Error(`Upload failed: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log("Upload result:", uploadResult);

      if (!uploadResult.url) {
        throw new Error("No URL in upload response");
      }

      // Now convert the uploaded file to text
      const convertPayload = {
        url: uploadResult.url,
        async: false,
        name: file.name,
        password: "",
        pages: "",
        ocr: true,
        ocrLanguage: "eng",
        ocrResolution: 300,
        outputFormat: "text",
      };

      console.log("Converting uploaded file to text...");

      const response = await fetch(
        "https://api.pdf.co/v1/pdf/convert/to/text",
        {
          method: "POST",
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(convertPayload),
        }
      );

      const result = await response.json();
      console.log("API Response:", result);

      if (!response.ok || result.error) {
        console.error("PDF conversion error:", result);
        throw new Error(result.message || "PDF conversion failed");
      }

      let text = "";
      // Get text from the result URL
      if (result.url) {
        const textResponse = await fetch(result.url);
        if (!textResponse.ok) {
          throw new Error("Failed to fetch text from result URL");
        }
        text = await textResponse.text();

        if (!text.trim()) {
          throw new Error("No text content extracted from PDF");
        }
      } else {
        throw new Error("No text URL in response");
      }

      console.log("Successfully extracted text from PDF");
      return NextResponse.json({
        text,
        success: true,
      });
    }
  } catch (err) {
    const error = err as Error;
    console.error("PDF conversion error:", error);
    return NextResponse.json(
      {
        error: true,
        details: error.message || "Unknown error occurred",
        text: null,
      },
      { status: 500 }
    );
  }
}
