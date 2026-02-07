/**
 * Canvas Thumbnail Generator
 *
 * Captures a screenshot of the React Flow canvas and returns it as a File object
 * ready for upload to the backend.
 */

import { ReactFlowInstance } from '@xyflow/react';
import { toPng } from 'html-to-image';

export async function generateCanvasThumbnail(
  reactFlowInstance: ReactFlowInstance,
  width: number = 400,
  height: number = 300
): Promise<Blob | null> {
  try {
    const viewport = reactFlowInstance.getViewport();
    const nodes = reactFlowInstance.getNodes();

    if (nodes.length === 0) {
      return null; // No thumbnail for empty canvas
    }

    // Get the canvas container element
    const canvasElement = document.querySelector('.react-flow') as HTMLElement;
    if (!canvasElement) {
      console.error('Canvas element not found');
      return null;
    }

    // Fit view to show all nodes before capturing
    reactFlowInstance.fitView({ padding: 0.2, duration: 0 });

    // Wait a bit for the view to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture the canvas as PNG
    const dataUrl = await toPng(canvasElement, {
      width,
      height,
      backgroundColor: '#0f0f0f',
      pixelRatio: 2, // Higher quality
      filter: (node) => {
        // Exclude controls and other UI elements
        if (node.classList?.contains('react-flow__controls')) return false;
        if (node.classList?.contains('react-flow__minimap')) return false;
        if (node.classList?.contains('react-flow__attribution')) return false;
        return true;
      },
    });

    // Restore original viewport
    reactFlowInstance.setViewport(viewport, { duration: 0 });

    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return blob;
  } catch (error) {
    console.error('Failed to generate canvas thumbnail:', error);
    return null;
  }
}

/**
 * Debounced thumbnail generator - only generates after user stops interacting
 */
export function createDebouncedThumbnailGenerator(
  reactFlowInstance: ReactFlowInstance,
  onThumbnailGenerated: (blob: Blob) => void,
  debounceMs: number = 2000
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      const blob = await generateCanvasThumbnail(reactFlowInstance);
      if (blob) {
        onThumbnailGenerated(blob);
      }
    }, debounceMs);
  };
}
