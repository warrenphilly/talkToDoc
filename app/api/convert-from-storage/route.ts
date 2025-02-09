import { adminStorage } from '@/lib/firebase/firebaseAdmin';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Add these export configurations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { fileUrl, fileName, fileType } = await req.json();

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Use path.join for cross-platform compatibility
    const tempFilePath = path.join(tempDir, fileName);
    
    // Extract the file path from the URL
    const filePath = decodeURIComponent(fileUrl.split('/o/')[1].split('?')[0]);
    
    console.log('Downloading file:', filePath);
    console.log('To temp path:', tempFilePath);
    
    try {
      // Download to temp storage
      await adminStorage.bucket().file(filePath).download({
        destination: tempFilePath
      });
    } catch (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw new Error('Failed to download file from storage');
    }

    // Get the base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Process the file based on type
    let text = '';
    
    try {
      // Create a FormData instance for the file
      const formData = new FormData();
      const fileBuffer = await fs.readFile(tempFilePath);
      formData.append('file', new Blob([fileBuffer]), fileName);

      let endpoint = '';
      
      // Determine the appropriate conversion endpoint
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

      // Forward to appropriate conversion endpoint
      console.log(`Forwarding to conversion endpoint: ${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Conversion failed with status: ${response.status}`);
      }

      const result = await response.json();
      text = result.text;

      if (!text) {
        throw new Error('No text content received from conversion');
      }

    } catch (processError) {
      console.error('Error processing document:', processError);
      throw new Error(`Failed to process document: ${processError instanceof Error ? processError.message : 'Unknown error'}`);
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
        console.log('Cleaned up temp file:', tempFilePath);
      } catch (unlinkError) {
        console.error('Error cleaning up temp file:', unlinkError);
      }
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error processing file from storage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
    return NextResponse.json(
      { error: 'Failed to process file', details: errorMessage },
      { status: 500 }
    );
  }
} 