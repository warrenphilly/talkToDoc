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
    
    try {
      // Download file directly to memory
      const [fileBuffer] = await adminStorage.bucket().file(filePath).download();
      console.log('File downloaded successfully, size:', fileBuffer.length);

      // Get the base URL for internal API calls
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      console.log('Using base URL:', baseUrl);

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

      const fullUrl = `${baseUrl}${endpoint}`;
      console.log(`Making request to: ${fullUrl}`);

      // Construct headers with more explicit checks
      const headers: Record<string, string> = {};
      if (authHeader) {
        headers['authorization'] = authHeader;
      }
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      } else {
        console.error('API_KEY environment variable is not set');
        throw new Error('API key configuration is missing');
      }

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers,
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

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        throw new Error('Received non-JSON response from conversion service');
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