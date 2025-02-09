import { adminStorage } from '@/lib/firebase/firebaseAdmin';
import { NextResponse } from 'next/server';

// Add these export configurations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
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

export async function POST(req: Request) {
  try {
    const { fileUrl, fileName, fileType } = await req.json();
    
    if (!fileUrl || !fileName || !fileType) {
      throw new Error('Missing required parameters');
    }

    console.log('Processing file:', { fileName, fileType });
    
    // Extract the file path from the URL
    const filePath = decodeURIComponent(fileUrl.split('/o/')[1].split('?')[0]);
    
    try {
      // Download file directly to memory
      const [fileBuffer] = await adminStorage.bucket().file(filePath).download();
      console.log('File downloaded successfully, size:', fileBuffer.length);

      // Get the base URL for internal API calls
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

      // Create a FormData instance for the file
      const formData = new FormData();
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

    } catch (processError: unknown) {
      console.error('Error processing document:', processError);
      throw new Error(`Failed to process document: ${toErrorWithMessage(processError).message}`);
    }

  } catch (error: unknown) {
    console.error('Error in convert-from-storage:', error);
    return NextResponse.json(
      { 
        error: true, 
        details: isErrorWithMessage(error) ? error.message : 'Unknown error occurred',
        text: null 
      },
      { status: 500 }
    );
  }
} 