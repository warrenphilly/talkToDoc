import { adminStorage } from "@/lib/firebase/firebaseAdmin";
import JSZip from "jszip";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import { promisify } from "util";
import { parseString } from "xml2js";
import { DOMParser } from "xmldom";

const parseXMLAsync = promisify(parseString);

// Add these export configurations
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 5 minutes

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

async function streamFileFromStorage(filePath: string) {
  const bucket = adminStorage.bucket();
  const file = bucket.file(filePath);
  const [exists] = await file.exists();

  if (!exists) {
    throw new Error("File not found in storage");
  }

  return file.createReadStream({
    validation: false,
    start: 0,
    end: undefined,
  });
}

async function downloadEntireFile(filePath: string): Promise<Buffer> {
  const file = adminStorage.bucket().file(filePath);
  const [metadata] = await file.getMetadata();

  // 50MB limit for Hobby plan
  if (
    metadata.size &&
    typeof metadata.size === "number" &&
    metadata.size > 50 * 1024 * 1024
  ) {
    throw new Error(
      "File too large for current plan. Please upgrade for larger file support."
    );
  }

  const [buffer] = await file.download();
  return buffer;
}

function getTextFromNodes(node: any, tagName: string, namespaceURI: string) {
  let text = "";
  const textNodes = node.getElementsByTagNameNS(namespaceURI, tagName);
  for (let i = 0; i < textNodes.length; i++) {
    text += textNodes[i].textContent + " ";
  }
  return text.trim();
}

async function processPPTX(buffer: Buffer): Promise<string> {
  const zip = new JSZip();
  await zip.loadAsync(buffer);

  const aNamespace = "http://schemas.openxmlformats.org/drawingml/2006/main";
  let text = "";

  let slideIndex = 1;
  while (true) {
    const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);

    if (!slideFile) break;

    const slideXmlStr = await slideFile.async("text");

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(slideXmlStr, "application/xml");

    const slideText = getTextFromNodes(xmlDoc, "t", aNamespace);
    if (slideText.trim()) {
      text += `Slide ${slideIndex}:\n${slideText}\n\n`;
    }

    slideIndex++;
  }

  if (!text.trim()) {
    throw new Error("No text content extracted from PPTX");
  }

  console.log(
    `Successfully extracted text from PPTX (${slideIndex - 1} slides)`
  );
  return text.trim();
}

async function processFile(
  buffer: Buffer,
  fileType: string,
  fileName: string,
  baseUrl: string
): Promise<string> {
  // Handle PPTX files directly
  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return processPPTX(buffer);
  }

  // For other file types, use chunked processing
  const CHUNK_SIZE = 750 * 1024; // ~750KB chunks instead of 1MB
  let textContent = "";

  for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
    const chunk = buffer.slice(i, Math.min(i + CHUNK_SIZE, buffer.length));
    const isLastChunk = i + CHUNK_SIZE >= buffer.length;

    const formData = new FormData();
    const file = new Blob([chunk], { type: fileType });
    formData.append("file", file, fileName);
    formData.append("isChunk", "true");
    if (isLastChunk) {
      formData.append("isFinal", "true");
    }

    const converterEndpoint = getEndpointForFileType(fileType);
    const response = await fetch(`${baseUrl}${converterEndpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Chunk conversion failed: ${await response.text()}`);
    }

    const result = await response.json();
    if (result.text) {
      textContent += result.text;
    }
  }

  if (!textContent.trim()) {
    throw new Error("No text content received from conversion");
  }

  return textContent;
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

    const filePath = decodeURIComponent(fileUrl.split("/o/")[1].split("?")[0]);
    const buffer = await downloadEntireFile(filePath);

    const headersList = await headers();
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host =
      headersList.get("host") || process.env.VERCEL_URL || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const text = await processFile(buffer, fileType, fileName, baseUrl);

    if (!text.trim()) {
      throw new Error("No text content extracted from file");
    }

    return NextResponse.json({ text });
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
