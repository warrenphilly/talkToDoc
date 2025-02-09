import { adminStorage } from "@/lib/firebase/firebaseAdmin";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Add these export configurations
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;
  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError));
  }
}

function getEndpointForFileType(fileType: string): string {
  if (
    fileType === "application/msword" ||
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "/api/convert/docx";
  } else if (fileType === "application/pdf") {
    return "/api/convert/pdf";
  } else if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return "/api/convert/pptx";
  } else if (fileType.startsWith("image/")) {
    return "/api/convert/image";
  }
  throw new Error(`Unsupported file type: ${fileType}`);
}

async function getBaseUrl(req: Request): Promise<string> {
  // Try to get the host from headers first
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  // Fallback to environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // Final fallback for development
  return process.env.NODE_ENV === "production"
    ? "https://" + process.env.VERCEL_URL
    : "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    // Log the complete request details
    console.log("Full request details:", {
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url,
      method: req.method,
    });

    const { fileUrl, fileName, fileType } = await req.json();

    // Add debug logging for authorization
    const authHeader = req.headers.get("authorization");
    const apiKey = process.env.API_KEY;
    console.log("Auth debug:", {
      hasAuthHeader: !!authHeader,
      hasApiKey: !!apiKey,
      environment: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL,
    });

    if (!fileUrl || !fileName || !fileType) {
      throw new Error("Missing required parameters");
    }

    console.log("Processing file:", { fileName, fileType });

    // Extract the file path from the URL
    const filePath = decodeURIComponent(fileUrl.split("/o/")[1].split("?")[0]);

    // Download file from Firebase
    const [fileBuffer] = await adminStorage.bucket().file(filePath).download();
    console.log("File downloaded successfully, size:", fileBuffer.length);

    // Create FormData with the file
    const formData = new FormData();
    const file = new Blob([fileBuffer], { type: fileType });
    formData.append("file", file, fileName);

    // Get the appropriate converter endpoint
    const converterEndpoint = getEndpointForFileType(fileType);
    const baseUrl = await getBaseUrl(req);
    console.log("Using base URL:", baseUrl);

    // Call the specific converter
    const response = await fetch(`${baseUrl}${converterEndpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Conversion failed: ${errorText}`);
    }

    const result = await response.json();
    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("Error in convert-from-storage:", error);
    return NextResponse.json(
      {
        error: true,
        details:
          error instanceof Error ? error.message : "Unknown error occurred",
        text: null,
      },
      { status: 500 }
    );
  }
}
