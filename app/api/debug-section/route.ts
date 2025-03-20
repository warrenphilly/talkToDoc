import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { section } = data;
    
    // Log the section for debugging
    console.log("DEBUG_SECTION_REQUEST:", JSON.stringify(section, null, 2));
    
    // Analyze the section structure
    const analysis = {
      hasTitle: !!section?.title,
      titleType: typeof section?.title,
      hasSentences: Array.isArray(section?.sentences),
      sentenceCount: section?.sentences?.length || 0,
      sentenceTypes: section?.sentences?.map((s: any) => ({
        id: typeof s.id,
        text: typeof s.text,
        format: s.format || 'paragraph',
        textLength: s.text?.length || 0,
        textSample: s.text?.substring(0, 50) + '...'
      }))
    };
    
    return NextResponse.json({
      success: true,
      analysis,
      fixedSection: reformatSection(section)
    });
  } catch (error) {
    console.error("Debug section error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

// Helper to reformat a section
function reformatSection(section: any) {
  if (!section) return null;
  
  return {
    title: section.title || "Untitled Section",
    sentences: Array.isArray(section.sentences) && section.sentences.length > 0
      ? section.sentences.map((s: any, idx: number) => ({
          id: typeof s.id === 'number' ? s.id : idx + 1,
          text: typeof s.text === 'string' && s.text.trim() !== '' 
            ? s.text 
            : "This sentence couldn't be processed correctly.",
          format: s.format || "paragraph"
        }))
      : [{
          id: 1,
          text: "This section couldn't be properly formatted. Please try regenerating it.",
          format: "paragraph"
        }]
  };
} 