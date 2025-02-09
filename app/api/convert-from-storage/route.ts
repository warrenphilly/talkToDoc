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
    // Log the complete request details
    console.log('Full request details:', {
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url,
      method: req.method
    });

    const { fileUrl, fileName, fileType } = await req.json();
    
    // Add debug logging for authorization
    const authHeader = req.headers.get('authorization');
    const apiKey = process.env.API_KEY;
    console.log('Auth debug:', {
      hasAuthHeader: !!authHeader,
      hasApiKey: !!apiKey,
      environment: process.env.NODE_ENV
    });

    if (!fileUrl || !fileName || !fileType) {
      throw new Error('Missing required parameters');
    }

    console.log('Processing file:', { fileName, fileType });
    
    // Extract the file path from the URL
    const filePath = decodeURIComponent(fileUrl.split('/o/')[1].split('?')[0]);
    
    // Download file from Firebase
    const [fileBuffer] = await adminStorage.bucket().file(filePath).download();
    console.log('File downloaded successfully, size:', fileBuffer.length);

    // Create FormData with the complete file
    const formData = new FormData();
    const file = new Blob([fileBuffer], { type: fileType });
    formData.append('file', file, fileName);

    // Use the main convert route instead of specific endpoints
    const response = await fetch(`${req.headers.get('origin')}/api/convert`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('authorization') || '',
        'x-api-key': process.env.API_KEY || '',
      },
      body: formData
    });

    if (!response.ok) {
      console.error('Conversion failed with:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const contentType = response.headers.get('content-type');
      let errorMessage = '';
      
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.details || `Conversion failed with status: ${response.status}`;
      } else {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        errorMessage = `Conversion failed with status: ${response.status}. Received non-JSON response.`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.text) {
      throw new Error('No text content received from conversion');
    }

    console.log(`Successfully converted ${fileName}`);
    return NextResponse.json({ text: result.text });

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