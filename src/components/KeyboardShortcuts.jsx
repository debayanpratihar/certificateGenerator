import React, { useEffect } from 'react';

const KeyboardShortcuts = ({ canvasRef }) => {
  useEffect(() => {
    const handler = (e) => {
      const canvas = canvasRef?.getCanvas?.();
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (e.key === 'Delete' && active) { canvas.remove(active); canvas.renderAll(); }
      if (e.key === 'Escape') { canvas.discardActiveObject(); canvas.renderAll(); }
      if (e.ctrlKey && e.key === 'd' && active) { active.clone((cloned) => { cloned.set({ left: active.left + 20, top: active.top + 20 }); canvas.add(cloned); canvas.setActiveObject(cloned); canvas.renderAll(); }); e.preventDefault(); }
      if (e.ctrlKey && e.key === 'ArrowUp' && active) { active.set({ top: active.top - 1 }); canvas.renderAll(); e.preventDefault(); }
      if (e.ctrlKey && e.key === 'ArrowDown' && active) { active.set({ top: active.top + 1 }); canvas.renderAll(); e.preventDefault(); }
      if (e.ctrlKey && e.key === 'ArrowLeft' && active) { active.set({ left: active.left - 1 }); canvas.renderAll(); e.preventDefault(); }
      if (e.ctrlKey && e.key === 'ArrowRight' && active) { active.set({ left: active.left + 1 }); canvas.renderAll(); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canvasRef]);
  return <div className="fixed bottom-4 left-4 glass-panel px-3 py-2 text-xs text-gray-300 hidden md:block">⌨️ Del | Esc | Ctrl+D | Ctrl+Arrows</div>;
};

export default KeyboardShortcuts;