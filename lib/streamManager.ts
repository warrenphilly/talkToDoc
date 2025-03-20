// Simple stream manager to track active streams by ID
const activeStreams = new Map<string, AbortController>();

export function registerStreamRequest(streamId: string): AbortController {
  // Create a new abort controller for this stream
  const controller = new AbortController();
  
  // Store it in our map
  activeStreams.set(streamId, controller);
  
  return controller;
}

export function abortStreamRequest(streamId: string): boolean {
  const controller = activeStreams.get(streamId);
  
  if (controller) {
    // Abort the stream
    controller.abort();
    // Remove from active streams
    activeStreams.delete(streamId);
    return true;
  }
  
  return false;
}

export function getStreamController(streamId: string): AbortController | undefined {
  return activeStreams.get(streamId);
} 