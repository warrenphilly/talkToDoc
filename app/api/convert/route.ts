import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Readable } from 'stream';
import * as mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { parse } from 'csv-parse/sync';
import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { v4 as uuidv4 } from "uuid";
import { adminStorage } from "@/lib/firebase/firebaseAdmin";

// You should store this in your environment variables
const API_KEY = process.env.PDF_CO_API_KEY as string;


interface TextRun {
  t: [string];
}

interface TextBody {
  a?: { r: TextRun[] };
  p?: { r: TextRun[] };
}

interface Shape {
  txBody?: TextBody[];
}

interface SlideTree {
  sp?: Shape[];
}

interface SlideContent {
  p: {
    sld: [{
      cSld: [{
        spTree: [SlideTree];
      }];
    }];
  };
}

const parseXMLAsync = promisify(parseString);

// Example placeholder for doc->docx conversion.
// Right now it just returns the original buffer unmodified.
// You must replace it with an actual doc->docx conversion.
async function convertDocToDocx(docBuffer: Buffer): Promise<Buffer> {
  // e.g. call an external CLI, an external API, or a library to do .doc -> .docx
  console.log("This is just a placeholder. No real doc->docx conversion is happening!");
  
  // Return the same buffer for now
  return docBuffer;
}

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: "10mb",
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const totalChunks = formData.get("totalChunks");
    const chunkIndex = formData.get("chunkIndex");
    const fileType = file.type;

    let text = '';
    const uniqueId = uuidv4();
    const markdownPath = `converted/${uniqueId}.md`;

    // Handle chunked processing
    if (totalChunks && chunkIndex) {
      // Store chunk temporarily
      const tempPath = `temp/${uniqueId}_chunk${chunkIndex}`;
      const bucket = adminStorage.bucket();
      const tempFile = bucket.file(tempPath);
      
      const arrayBuffer = await file.arrayBuffer();
      await tempFile.save(Buffer.from(arrayBuffer));

      // If this is the last chunk, combine all chunks and process
      if (Number(chunkIndex) === Number(totalChunks) - 1) {
        const chunks = [];
        for (let i = 0; i < Number(totalChunks); i++) {
          const chunkPath = `temp/${uniqueId}_chunk${i}`;
          const chunkFile = bucket.file(chunkPath);
          const [chunkData] = await chunkFile.download();
          chunks.push(chunkData);
          await chunkFile.delete(); // Clean up temp file
        }

        // Combine chunks
        const completeBuffer = Buffer.concat(chunks);
        
        // Create new FormData with complete file
        const completeFormData = new FormData();
        const completeFile = new Blob([completeBuffer], { type: fileType });
        completeFormData.append('file', completeFile, file.name);

        // Process the complete file
        const endpoint = getEndpointForFileType(fileType);
        const response = await fetch(`${req.nextUrl.origin}${endpoint}`, {
          method: 'POST',
          body: completeFormData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || 'Conversion failed');
        }

        const result = await response.json();
        text = result.text;
      } else {
        // Return success for intermediate chunks
        return NextResponse.json({
          success: true,
          isChunk: true,
          chunkIndex
        });
      }
    } else {
      // Process single file as before
      const endpoint = getEndpointForFileType(fileType);
      const response = await fetch(`${req.nextUrl.origin}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Conversion failed');
      }

      const result = await response.json();
      text = result.text;
    }

    // Save the converted text
    const bucket = adminStorage.bucket();
    const markdownFile = bucket.file(markdownPath);
    await markdownFile.save(text, {
      contentType: 'text/markdown',
      metadata: {
        originalName: file.name,
        convertedAt: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      path: markdownPath,
      text: text,
      originalName: file.name
    });

  } catch (err) {
    const error = err as Error;
    console.error("Conversion error:", error);
    return NextResponse.json(
      { error: "Failed to convert file", details: error.message },
      { status: 500 }
    );
  }
}

function getEndpointForFileType(fileType: string): string {
  if (fileType === "application/msword" || 
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return '/api/convert/docx';
  }
  else if (fileType === "application/pdf") {
    return '/api/convert/pdf';
  }
  else if (fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return '/api/convert/pptx';
  }
  else if (fileType.startsWith("image/")) {
    return '/api/convert/image';
  }
  throw new Error(`Unsupported file type: ${fileType}`);
}
