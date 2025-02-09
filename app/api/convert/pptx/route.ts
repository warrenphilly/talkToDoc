import { NextRequest, NextResponse } from "next/server";
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';

function getTextFromNodes(node: any, tagName: string, namespaceURI: string) {
  let text = '';
  const textNodes = node.getElementsByTagNameNS(namespaceURI, tagName);
  for (let i = 0; i < textNodes.length; i++) {
    text += textNodes[i].textContent + ' ';
  }
  return text.trim();
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const totalChunks = formData.get("totalChunks");
    const chunkIndex = formData.get("chunkIndex");

    // If this is a chunk, acknowledge receipt
    if (totalChunks && chunkIndex) {
      console.log(`Received chunk ${chunkIndex} of ${totalChunks} for PPTX conversion`);
      return NextResponse.json({
        success: true,
        isChunk: true,
        chunkIndex
      });
    }

    console.log(`Processing complete PPTX file: ${file.name}, size: ${file.size}`);
    const buffer = await file.arrayBuffer();
    const zip = new JSZip();
    await zip.loadAsync(buffer);

    const aNamespace = "http://schemas.openxmlformats.org/drawingml/2006/main";
    let text = '';
    
    let slideIndex = 1;
    while (true) {
      const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);
      
      if (!slideFile) break;
      
      const slideXmlStr = await slideFile.async('text');
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(slideXmlStr, 'application/xml');
      
      const slideText = getTextFromNodes(xmlDoc, "t", aNamespace);
      text += `Slide ${slideIndex}:\n${slideText}\n\n`;
      
      slideIndex++;
    }

    if (!text.trim()) {
      console.warn("No text extracted from PPTX, returning empty string");
      return NextResponse.json({ text: "" });
    }

    console.log(`Successfully extracted text from PPTX (${slideIndex - 1} slides)`);
    return NextResponse.json({ 
      text,
      success: true,
      slideCount: slideIndex - 1
    });

  } catch (err) {
    const error = err as Error;
    console.error("PPTX conversion error:", error);
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