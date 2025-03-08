# OpenAI API Streaming Implementation

This document explains how the streaming implementation works in the TalkToDoc application.

## Overview

The application now supports streaming responses from the OpenAI API, which allows for a better user experience by displaying sections as they are generated rather than waiting for the entire response to be completed.

## How It Works

### Server-Side (API Route)

1. The `/api/chat` route has been updated to support streaming mode.
2. When streaming is enabled (`stream: true` in the request), the API uses OpenAI's streaming capabilities to receive chunks of the response as they are generated.
3. The API parses the incoming JSON function call arguments to extract complete sections as they become available.
4. Each section is sent to the client as soon as it's parsed, using a `TransformStream` and the `StreamingTextResponse` utility from the `ai` package.

### Client-Side

1. The `sendMessage` function in `lib/utils.ts` has been updated to handle streaming responses.
2. It creates a temporary AI message immediately to show that processing is happening.
3. As sections are received from the stream, they are added to the temporary message and displayed to the user.
4. The database is updated incrementally with each new section, so even if the connection is interrupted, the data is not lost.
5. A loading component (`LoadingSection`) shows the progress of section generation.

## Benefits

1. **Improved User Experience**: Users see content as it's generated rather than waiting for the entire response.
2. **Reduced Perceived Latency**: The application feels more responsive since users can start reading content immediately.
3. **Incremental Database Updates**: Data is saved as it's generated, reducing the risk of data loss.
4. **Progress Visibility**: Users can see how many sections have been generated and how many are expected.

## Implementation Details

### Key Files Modified

1. `app/api/chat/route.ts` - Added streaming support to the API route
2. `lib/utils.ts` - Updated the `sendMessage` function to handle streaming responses
3. `components/shared/chat/ChatClient.tsx` - Added UI components for displaying streaming progress
4. `components/shared/chat/loading-section.tsx` - New component for showing loading state

### New Dependencies

- `ai` package - Provides the `StreamingTextResponse` utility for handling streaming responses

## Usage

To use streaming mode, simply set `stream: true` in the request to the `/api/chat` endpoint:

```javascript
const chatResponse = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: text,
    notebookId,
    pageId,
    stream: true,
  }),
});
```

Then process the streaming response:

```javascript
const reader = chatResponse.body?.getReader();
const decoder = new TextDecoder();

while (!done) {
  const { value, done: doneReading } = await reader.read();
  // Process the chunks as they arrive
  // ...
}
``` 