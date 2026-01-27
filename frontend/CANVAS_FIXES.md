# Canvas Connection Status Fixes

## Problem
The canvas was not showing when image and prompt nodes were connected to video nodes. The connection status indicators were not updating.

## Root Causes

### 1. Missing CSS Styles
The `canvas.css` file was missing critical class definitions for form elements and status indicators:
- `.rf-input` - Input field styles
- `.rf-textarea` - Textarea styles  
- `.rf-label` - Label styles
- `.rf-button` / `.rf-button-primary` - Button styles
- `.rf-badge` - Badge styles
- `.rf-status-dot` - Connection status dot indicator
- `.rf-progress` / `.rf-progress-bar` - Progress bar styles
- `.rf-message` - Message/error display styles

### 2. Stale State in Connection Updates
When a source node (image/prompt) was updated, the connected video node's `connectedPrompt` and `connectedImageUrl` props were not being refreshed because:
- React state updates are asynchronous
- The `handleNodeUpdate` function wasn't propagating changes to connected video nodes

### 3. CSS Selector Issues
The status dot color wasn't changing because the CSS selector `.text-\[\#808080\] .rf-status-dot` wasn't reliably matching Tailwind's escaped class names.

## Fixes Applied

### Fix 1: Added Missing CSS Classes
**File:** `frontend/components/canvas/styles/canvas.css`

Added complete styling for all node form elements:

```css
/* Form elements */
.rf-input { ... }
.rf-textarea { ... }
.rf-label { ... }

/* Buttons */
.rf-button { ... }
.rf-button-primary { ... }

/* Status indicators */
.rf-badge { ... }
.rf-status-dot { ... }

/* Progress & messages */
.rf-progress { ... }
.rf-progress-bar { ... }
.rf-message { ... }
.rf-message-error { ... }
```

### Fix 2: Updated handleNodeUpdate to Propagate Changes
**File:** `frontend/components/canvas/ReactFlowCanvas.tsx`

Modified `handleNodeUpdate` to update all connected video/extension nodes when a source node changes:

```typescript
const handleNodeUpdate = async (nodeId: string, data: Record<string, any>) => {
  // ... update the node ...
  
  // Then update any video/extension nodes connected to this source
  const affectedConnections = backendConnections.filter(c => c.source_node_id === nodeId);
  
  for (const connection of affectedConnections) {
    const targetNode = updatedNodes.find(n => n.id === connection.target_node_id);
    if (targetNode && (targetNode.type === 'video' || targetNode.type === 'extension')) {
      const connectedData = getConnectedData(connection.target_node_id, updatedNodes, backendConnections);
      // Update the video node's connectedPrompt and connectedImageUrl
    }
  }
};
```

### Fix 3: Inline Styles for Status Dots
**File:** `frontend/components/canvas/nodes/VideoNodeRF.tsx`

Changed from CSS class-based coloring to inline styles for reliable status indication:

```tsx
<span 
  className="rf-status-dot" 
  style={{ background: connectedPrompt?.trim() ? '#22c55e' : '#374151' }}
/>
<span>Prompt {connectedPrompt?.trim() ? '✓' : '(required)'}</span>
```

## Data Flow

### How Connection Status Works

1. **User connects nodes** → `handleConnect` is called
2. **Connection saved to backend** → `connectionsApi.create()`
3. **Update video node's connected data** → `updateVideoNodeConnectedData()`
4. **getConnectedData extracts source data:**
   - Finds all connections where `target_node_id === videoNodeId`
   - For each connection, finds the source node
   - Extracts `prompt` from prompt nodes
   - Extracts `image_url` from image nodes
5. **VideoNodeRF receives props:**
   - `connectedPrompt` - The prompt text from connected prompt node
   - `connectedImageUrl` - The image URL from connected image node
6. **UI updates** - Status dots turn green, checkmarks appear

### When Source Node Updates

1. **User types in PromptNodeRF** → `data.onUpdate({ prompt: value })`
2. **handleNodeUpdate called** → Saves to backend, updates state
3. **Find affected connections** → Any connection where this node is the source
4. **Recalculate connected data** → `getConnectedData()` for each target
5. **Update video nodes** → Set new `connectedPrompt`/`connectedImageUrl`
6. **VideoNodeRF re-renders** → Shows updated connection status

## Debug Logging

Console logs were added to trace the data flow:

```
[getConnectedData] Node: xxx Connections: 2
[getConnectedData] Source node data: prompt {...}
[getConnectedData] Result: {prompt: "...", imageUrl: "..."}
[handleNodeUpdate] Node: xxx Affected connections: 1
[handleNodeUpdate] Updating target node: yyy with: {...}
[VideoNodeRF] Connected data: {connectedPrompt: "...", hasPrompt: true}
```

## Environment Configuration

### Frontend (.env.local)
```env
# For local development
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# For production (Vercel + ngrok)
# NEXT_PUBLIC_API_URL=https://your-domain.ngrok-free.dev
# NEXT_PUBLIC_WS_URL=wss://your-domain.ngrok-free.dev
```

### Important Notes
- Use `wss://` (not `ws://`) when frontend is served over HTTPS
- Restart dev server after changing `.env.local`
- The `ngrok-skip-browser-warning` header is added to all API requests

## Testing

1. Start backend: `cd backend && uvicorn app.main:app --reload --port 8000`
2. Start frontend: `cd frontend && pnpm dev`
3. Open http://localhost:3000/main
4. Create a Prompt node and type some text
5. Create an Image node and upload an image
6. Create a Video node
7. Connect Prompt → Video (prompt-output to prompt-input)
8. Connect Image → Video (image-output to image-input)
9. Video node should show green dots with ✓ for both connections
