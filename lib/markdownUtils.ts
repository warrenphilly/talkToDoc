export function cleanMarkdownContent(content: string): string {
  // Remove markdown formatting that might interfere with content understanding
  return content
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/```[^`]*```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .trim();
} 
// ... existing cleanMarkdownContent function ...

export function splitIntoChunks(text: string, maxChunkLength: number): string[] {
  // Split the text into sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    // If adding this sentence would exceed the chunk length, start a new chunk
    if ((currentChunk + sentence).length > maxChunkLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}