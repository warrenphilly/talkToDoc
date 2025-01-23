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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileType = file.type;

    let endpoint = '';

    // Determine the appropriate conversion endpoint based on file type
    if (fileType === "application/msword" || 
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      endpoint = '/api/convert/docx';
    }
    else if (fileType === "application/pdf") {
      endpoint = '/api/convert/pdf';
    }
    else if (fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      endpoint = '/api/convert/pptx';
    }
    else if (fileType.startsWith("image/")) {
      endpoint = '/api/convert/image';
    }
    else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Forward request to the appropriate conversion route
    const response = await fetch(`${req.nextUrl.origin}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Conversion failed');
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (err) {
    const error = err as Error;
    console.error("Conversion error:", error);
    return NextResponse.json(
      { 
        error: "Failed to convert file",
        details: error.message || "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
