import { adminStorage } from '@/lib/firebase/firebaseAdmin';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Add these export configurations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let tempFilePath: string | null = null;

  try {
    const { fileUrl, fileName, fileType } = await req.json();
    
    if (!fileUrl || !fileName || !fileType) {
      throw new Error('Missing required parameters');
    }

    console.log('Processing file:', { fileName, fileType });

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    
    tempFilePath = path.join(tempDir, fileName);
    
    // Extract the file path from the URL
    const filePath = decodeURIComponent(fileUrl.split('/o/')[1].split('?')[0]);
    
    try {
      await adminStorage.bucket().file(filePath).download({
        destination: tempFilePath
      });
      console.log('File downloaded successfully');

    } catch (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw new Error(`Failed to download file: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
    }

    // Get the base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
      // Create a FormData instance for the file
      const formData = new FormData();
      const fileBuffer = await fs.readFile(tempFilePath);
      const file = new Blob([fileBuffer], { type: fileType });
      formData.append('file', file, fileName);

      // Determine the appropriate conversion endpoint
      let endpoint;
      switch (fileType) {
        case 'application/pdf':
          endpoint = '/api/convert/pdf';
          break;
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          endpoint = '/api/convert/docx';
          break;
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          endpoint = '/api/convert/pptx';
          break;
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
          endpoint = '/api/convert/image';
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      console.log(`Using conversion endpoint: ${endpoint} for file type: ${fileType}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Conversion error:', errorData);
        throw new Error(errorData.details || `Conversion failed with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.text) {
        throw new Error('No text content received from conversion');
      }

      console.log(`Successfully converted ${fileName}`);
      return NextResponse.json({ text: result.text });

    } catch (processError) {
      console.error('Error processing document:', processError);
      throw new Error(`Failed to process document: ${processError instanceof Error ? processError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error in convert-from-storage:', error);
    return NextResponse.json(
      { 
        error: true, 
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        text: null 
      },
      { status: 500 }
    );
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log('Cleaned up temp file:', tempFilePath);
      } catch (unlinkError) {
        console.error('Error cleaning up temp file:', unlinkError);
      }
    }
  }
} 