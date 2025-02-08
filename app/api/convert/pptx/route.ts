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
    responseLimit: '10mb',
    bodyLimit: '10mb'
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

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
      
      text += getTextFromNodes(xmlDoc, "t", aNamespace) + ' ';
      
      slideIndex++;
    }

    if (!text) {
      console.warn("No text extracted from PPTX, returning empty string");
      return NextResponse.json({ text: "" });
    }
    console.log("Successfully extracted text from PPTX");
    return NextResponse.json({ text });

  } catch (err) {
    const error = err as Error;
    console.error("PPTX conversion error:", error);
    return NextResponse.json(
      { 
        error: "Failed to convert PPTX",
        details: error.message || "Unknown error occurred"
      },
      { status: 500 }
    );
  }
} 