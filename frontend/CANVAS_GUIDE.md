# Figma-like Canvas - User Guide

## Overview

The `/main` route provides a Figma-like infinite canvas where you can create, manipulate, and organize visual elements. This canvas is built with React Konva and features a floating dock navigation.

## Features

### Canvas Capabilities
- ✅ **Infinite Canvas** - Pan and zoom freely
- ✅ **Create Shapes** - Add rectangles, circles, and text
- ✅ **Transform Elements** - Move, resize, and rotate
- ✅ **Select & Edit** - Click to select, transform handles appear
- ✅ **Delete & Duplicate** - Manage your elements easily
- ✅ **Keyboard Shortcuts** - Fast workflow with hotkeys

### Tools Available

#### 1. **Select Tool** (Default)
- Click and drag elements to move them
- Resize using transform handles
- Rotate elements
- Pan the canvas by dragging empty space

#### 2. **Rectangle Tool**
- Click anywhere on canvas to add a rectangle
- Default size: 100x80 pixels
- Random color assigned

#### 3. **Circle Tool**
- Click anywhere on canvas to add a circle
- Default radius: 50 pixels
- Random color assigned

#### 4. **Text Tool**
- Click anywhere on canvas to add text
- Default text: "Double click to edit"
- Font size: 20px

## Controls

### Mouse Controls
- **Left Click** - Select element or place new shape (when tool selected)
- **Drag** - Move selected element or pan canvas
- **Scroll Wheel** - Zoom in/out
- **Transform Handles** - Resize and rotate selected elements

### Keyboard Shortcuts
- **Delete / Backspace** - Delete selected element
- **Ctrl+D / Cmd+D** - Duplicate selected element
- **Escape** - Deselect element and return to Select tool

## UI Components

### Toolbar (Top Left)
- Tool selection buttons
- Duplicate and Delete buttons (when element selected)

### Info Panel (Top Right)
- Current zoom level
- Quick tips

### Element Counter (Bottom Left)
- Total number of elements on canvas

### Floating Dock (Bottom Center)
- Home - Return to home page
- Products - Navigate to products
- Components - View components
- Canvas - Canvas tools
- Changelog - View updates
- Twitter - Social link
- GitHub - Repository link

## Color Palette

Elements are assigned random colors from a predefined palette:
- Blue (#3b82f6)
- Purple (#8b5cf6)
- Pink (#ec4899)
- Green (#10b981)
- Amber (#f59e0b)
- Red (#ef4444)
- Cyan (#06b6d4)

## Technical Details

### Technologies Used
- **React Konva** - Canvas rendering and manipulation
- **Framer Motion** - Smooth animations for floating dock
- **Next.js 16** - App Router with dynamic imports
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

### Performance Optimizations
- Dynamic import for canvas (prevents SSR issues)
- Efficient rendering with Konva Layer
- Optimized transform calculations
- Debounced zoom and pan

### File Structure
```
app/main/
  └── page.tsx              # Main canvas page

components/
  ├── canvas/
  │   └── FigmaCanvas.tsx   # Canvas component
  ├── ui/
  │   └── floating-dock.tsx # Floating dock UI
  └── floating-dock-demo.tsx # Dock configuration

lib/
  └── utils.ts              # Utility functions (cn)
```

## Usage Example

```typescript
import FigmaCanvas from "@/components/canvas/FigmaCanvas";

function MyPage() {
  const handleElementsChange = (elements) => {
    console.log("Canvas elements:", elements);
    // Save to database, localStorage, etc.
  };

  return (
    <FigmaCanvas onElementsChange={handleElementsChange} />
  );
}
```

## Future Enhancements

Potential features to add:
- [ ] Custom color picker
- [ ] Layer management panel
- [ ] Undo/Redo functionality
- [ ] Save/Load canvas state
- [ ] Export as image (PNG, SVG)
- [ ] Collaborative editing (multiplayer)
- [ ] More shape types (lines, arrows, polygons)
- [ ] Text editing inline
- [ ] Alignment tools
- [ ] Grid and snap-to-grid
- [ ] Group/ungroup elements
- [ ] Copy/paste functionality

## Troubleshooting

### Canvas not rendering
- Check that all dependencies are installed: `npm install`
- Ensure you're accessing `/main` route
- Check browser console for errors

### Transform handles not appearing
- Make sure "Select" tool is active
- Click on an element to select it
- Try clicking again if it doesn't work first time

### Performance issues
- Reduce number of elements on canvas
- Try zooming out
- Refresh the page if canvas becomes sluggish

## Browser Support

- ✅ Chrome/Edge (Chromium) - Recommended
- ✅ Firefox
- ✅ Safari
- ⚠️ Older browsers may have limited support

## Accessibility

- Keyboard navigation supported
- Screen reader compatible (basic)
- High contrast mode compatible

---

**Built with ❤️ using Next.js, React Konva, and Tailwind CSS**
