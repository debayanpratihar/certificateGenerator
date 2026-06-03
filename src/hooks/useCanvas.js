import { useState, useCallback, useRef } from 'react';
import { fabric } from 'fabric';

export const useCanvas = (width = 800, height = 600) => {
  const [canvas, setCanvas] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const canvasRef = useRef(null);

  const initCanvas = useCallback((canvasElement) => {
    if (!canvasElement) return;
    
    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });
    
    // Event handlers
    fabricCanvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });
    fabricCanvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });
    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });
    
    canvasRef.current = fabricCanvas;
    setCanvas(fabricCanvas);
    
    return fabricCanvas;
  }, [width, height]);

  const addText = useCallback((text, options = {}) => {
    if (!canvasRef.current) return null;
    const textObj = new fabric.Textbox(text, {
      left: 100,
      top: 100,
      fontSize: 30,
      fontFamily: 'Arial',
      fill: '#000000',
      width: 200,
      ...options,
    });
    canvasRef.current.add(textObj);
    canvasRef.current.renderAll();
    canvasRef.current.setActiveObject(textObj);
    return textObj;
  }, []);

  const addImage = useCallback((url, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!canvasRef.current) {
        reject(new Error('Canvas not initialized'));
        return;
      }
      fabric.Image.fromURL(url, (img) => {
        if (img) {
          img.set({
            left: 50,
            top: 50,
            ...options,
          });
          canvasRef.current.add(img);
          canvasRef.current.renderAll();
          resolve(img);
        } else {
          reject(new Error('Failed to load image'));
        }
      });
    });
  }, []);

  const clearCanvas = useCallback((preserveBackground = true) => {
    if (!canvasRef.current) return;
    const objects = canvasRef.current.getObjects();
    objects.forEach(obj => {
      if (!preserveBackground || (obj.name !== 'background' && !obj.selectable === false)) {
        canvasRef.current.remove(obj);
      }
    });
    canvasRef.current.renderAll();
  }, []);

  const exportAsImage = useCallback((format = 'png', quality = 1) => {
    if (!canvasRef.current) return '';
    return canvasRef.current.toDataURL({
      format: format === 'jpg' ? 'jpeg' : 'png',
      quality: quality,
    });
  }, []);

  const exportAsBlob = useCallback((format = 'png', quality = 1) => {
    return new Promise((resolve) => {
      if (!canvasRef.current) {
        resolve(null);
        return;
      }
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      canvasRef.current.getElement().toBlob(resolve, mimeType, quality);
    });
  }, []);

  const setBackgroundImage = useCallback((imageUrl) => {
    return new Promise((resolve, reject) => {
      if (!canvasRef.current) {
        reject(new Error('Canvas not initialized'));
        return;
      }
      fabric.Image.fromURL(imageUrl, (img) => {
        if (img) {
          const scaleX = canvasRef.current.width / img.width;
          const scaleY = canvasRef.current.height / img.height;
          img.set({
            scaleX: scaleX,
            scaleY: scaleY,
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            name: 'background',
          });
          // Remove existing background
          const existingBg = canvasRef.current.getObjects().find(obj => obj.name === 'background');
          if (existingBg) canvasRef.current.remove(existingBg);
          canvasRef.current.insertAt(img, 0);
          canvasRef.current.renderAll();
          resolve(img);
        } else {
          reject(new Error('Failed to load background image'));
        }
      });
    });
  }, []);

  return {
    canvas,
    selectedObject,
    initCanvas,
    addText,
    addImage,
    clearCanvas,
    exportAsImage,
    exportAsBlob,
    setBackgroundImage,
    getCanvas: () => canvasRef.current,
  };
};