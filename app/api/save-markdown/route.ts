import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export async function POST(request: Request) {
  try {
    const { section, filename, createNew } = await request.json();

    // Generate filename only if creating new file
    const markdownFilename = createNew ? `document_${Date.now()}.md` : filename;

    const markdownPath = path.join(
      process.cwd(),
      "public",
      "markdown",
      markdownFilename
    );

    // Ensure the markdown directory exists
    const markdownDir = path.join(process.cwd(), "public", "markdown");
    if (!fs.existsSync(markdownDir)) {
      fs.mkdirSync(markdownDir, { recursive: true });
    }

    // Clean up the section text
    const cleanedSection = section
      .trim() // Remove leading/trailing whitespace
      .replace(/\n+/g, " ") // Replace multiple newlines with single space
      .replace(/\s+/g, " "); // Replace multiple spaces with single space

    // Create new file or append to existing
    if (createNew) {
      fs.writeFileSync(markdownPath, ""); // Create empty file
    } else if (cleanedSection) {
      // Only append if there's content after cleaning
      fs.appendFileSync(markdownPath, cleanedSection + " ");
    }

    return NextResponse.json({ success: true, filename: markdownFilename });
  } catch (error) {
    console.error("Error saving markdown:", error);
    return NextResponse.json(
      { message: "Error saving markdown" },
      { status: 500 }
    );
  }
}
