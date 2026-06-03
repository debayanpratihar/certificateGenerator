import { useEffect, useCallback } from 'react';

export const useKeyboardShortcuts = (canvasRef, handlers = {}) => {
  const handleKeyDown = useCallback((e) => {
    const canvas = canvasRef?.current || canvasRef?.getCanvas?.();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    const { onDelete, onEscape, onDuplicate, onSave } = handlers;

    switch (e.key) {
      case 'Delete':
        if (activeObject) {
          canvas.remove(activeObject);
          canvas.renderAll();
          onDelete?.(activeObject);
          e.preventDefault();
        }
        break;
        
      case 'Escape':
        canvas.discardActiveObject();
        canvas.renderAll();
        onEscape?.();
        e.preventDefault();
        break;
        
      case 'd':
      case 'D':
        if (e.ctrlKey && activeObject) {
          // Duplicate object
          activeObject.clone((cloned) => {
            cloned.set({
              left: activeObject.left + 20,
              top: activeObject.top + 20,
            });
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.renderAll();
            onDuplicate?.(cloned);
          });
          e.preventDefault();
        }
        break;
        
      case 's':
      case 'S':
        if (e.ctrlKey) {
          e.preventDefault();
          onSave?.();
        }
        break;
        
      case 'ArrowUp':
        if (activeObject && e.ctrlKey) {
          activeObject.set({ top: activeObject.top - 1 });
          canvas.renderAll();
          e.preventDefault();
        }
        break;
        
      case 'ArrowDown':
        if (activeObject && e.ctrlKey) {
          activeObject.set({ top: activeObject.top + 1 });
          canvas.renderAll();
          e.preventDefault();
        }
        break;
        
      case 'ArrowLeft':
        if (activeObject && e.ctrlKey) {
          activeObject.set({ left: activeObject.left - 1 });
          canvas.renderAll();
          e.preventDefault();
        }
        break;
        
      case 'ArrowRight':
        if (activeObject && e.ctrlKey) {
          activeObject.set({ left: activeObject.left + 1 });
          canvas.renderAll();
          e.preventDefault();
        }
        break;
        
      default:
        break;
    }
  }, [canvasRef, handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};