import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { fabric } from 'fabric';
import { generateQRCodeDataURL } from '../utils/qrUtils';

const CanvasEditor = forwardRef(({ onCanvasReady, textFields, qrFields, onTextFieldUpdate, onQRFieldUpdate, backgroundImage, signatureImage, showToast, onSelectField, onSelectQR }, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const textObjectsRef = useRef({});
  const qrObjectsRef = useRef({});

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  // Sync text fields (add/remove/update) helper — defined early so it can be called after canvas init
  const syncTextFields = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const currentIds = new Set(textFields.map(f => f.id));
    // Remove objects that are no longer in the list
    Object.keys(textObjectsRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        canvas.remove(textObjectsRef.current[id]);
        delete textObjectsRef.current[id];
      }
    });

    // Add or update existing text objects
    textFields.forEach(field => {
      let obj = textObjectsRef.current[field.id];
      const fontSizePx = field.fontSize * 8;
      const props = {
        left: (field.x / 100) * CANVAS_WIDTH,
        top: (field.y / 100) * CANVAS_HEIGHT,
        fontSize: fontSizePx,
        fontFamily: field.font,
        fill: field.color,
        textAlign: field.align,
        opacity: field.opacity / 100,
        fontWeight: field.bold ? 'bold' : 'normal',
        fontStyle: field.italic ? 'italic' : 'normal',
        backgroundColor: field.bgColor !== 'transparent' ? field.bgColor : '',
        text: field.text,
      };
      if (obj) {
        obj.set(props);
        obj.setCoords();
      } else {
        obj = new fabric.Textbox(field.text, {
          ...props,
          width: 200,
          hasControls: true,
          hasBorders: true,
          originX: 'center',
          originY: 'center',
          id: field.id,
        });
        canvas.add(obj);
        textObjectsRef.current[field.id] = obj;
      }
    });
    canvas.renderAll();
  };

  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricCanvasRef.current,
    exportAsImage: (format) => {
      if (!fabricCanvasRef.current) return '';
      return fabricCanvasRef.current.toDataURL({
        format: format === 'jpg' ? 'jpeg' : 'png',
        quality: 1,
      });
    },
    replaceQRImages: async (qrUpdates) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      for (const [qrId, value] of Object.entries(qrUpdates)) {
        const obj = qrObjectsRef.current[qrId];
        if (obj && obj.type === 'image') {
          // If value is already a data URL, use it directly
          let src = value;
          if (!src || typeof src !== 'string') continue;
          if (!src.startsWith('data:')) {
            try { src = await generateQRCodeDataURL(src, 300); } catch (e) { src = value; }
          }
          fabric.Image.fromURL(src, (img) => {
            img.set({
              left: obj.left,
              top: obj.top,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              width: obj.width,
              height: obj.height,
              hasControls: true,
              hasBorders: true,
              lockUniScaling: false,
              id: qrId,
              qrPlaceholder: true,
            });
            canvas.remove(obj);
            canvas.add(img);
            qrObjectsRef.current[qrId] = img;
            canvas.renderAll();
          });
        }
      }
    }
  }));

  // Initialize canvas (fixed size)
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });
    fabricCanvasRef.current = canvas;
    // Sync any existing text fields now that canvas is ready
    setTimeout(() => syncTextFields(), 0);

    // Default dummy background
    const dummyCertUrl = '/dummy-certificate.jpg';
    fabric.Image.fromURL(dummyCertUrl, (img) => {
      if (img) {
        const scale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: (CANVAS_WIDTH - img.width * scale) / 2,
          top: (CANVAS_HEIGHT - img.height * scale) / 2,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          name: 'background',
        });
        canvas.insertAt(img, 0);
        canvas.renderAll();
      }
    });

    // Drag & drop images
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
    const handleDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          fabric.Image.fromURL(event.target.result, (img) => {
            const pointer = canvas.getPointer(e);
            img.set({
              left: pointer.x,
              top: pointer.y,
              scaleX: 0.5,
              scaleY: 0.5,
              hasControls: true,
              hasBorders: true,
              lockUniScaling: false,
            });
            canvas.add(img);
            canvas.renderAll();
            showToast('Image added!', 'success');
          });
        };
        reader.readAsDataURL(file);
      }
    };
    const canvasElement = canvasRef.current;
    canvasElement.addEventListener('dragover', handleDragOver);
    canvasElement.addEventListener('drop', handleDrop);

    // Click / selection handling: notify parent which field/qr was clicked
    const handleMouseDown = (e) => {
      const target = e.target;
      if (!target) {
        // clicked empty area -> do nothing (preserve selection)
        return;
      }
      if (target.type === 'textbox' || typeof target.text !== 'undefined') {
        onSelectField?.(target.id || null);
      } else if (target.qrPlaceholder || target.qrId || target.type === 'image') {
        if (target.qrPlaceholder) onSelectQR?.(target.id || null);
        else onSelectField?.(target.id || null);
      }
    };
    canvas.on('mouse:down', handleMouseDown);

    onCanvasReady?.({
      getCanvas: () => fabricCanvasRef.current,
      exportAsImage: (format) => fabricCanvasRef.current.toDataURL({ format: format === 'jpg' ? 'jpeg' : 'png', quality: 1 }),
      replaceQRImages: async (updates) => {
        for (const [id, value] of Object.entries(updates)) {
          const obj = qrObjectsRef.current[id];
          if (obj) {
            let src = value;
            if (!src.startsWith('data:')) {
              try { src = await generateQRCodeDataURL(src, 300); } catch (e) { src = value; }
            }
            fabric.Image.fromURL(src, (img) => {
              img.set({ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY, width: obj.width, height: obj.height, hasControls: true, lockUniScaling: false, id, qrPlaceholder: true });
              canvas.remove(obj);
              canvas.add(img);
              qrObjectsRef.current[id] = img;
              canvas.renderAll();
            });
          }
        }
      }
    });

    return () => {
      canvasElement.removeEventListener('dragover', handleDragOver);
      canvasElement.removeEventListener('drop', handleDrop);
      canvas.off('mouse:down', handleMouseDown);
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    syncTextFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textFields]);

  // Sync QR fields (add/remove/update)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const currentQrIds = new Set(qrFields.map(q => q.id));
    Object.keys(qrObjectsRef.current).forEach(id => {
      if (!currentQrIds.has(id)) {
        canvas.remove(qrObjectsRef.current[id]);
        delete qrObjectsRef.current[id];
      }
    });

    qrFields.forEach(async (qr) => {
      let obj = qrObjectsRef.current[qr.id];
      const newLeft = (qr.x / 100) * CANVAS_WIDTH;
      const newTop = (qr.y / 100) * CANVAS_HEIGHT;
      if (obj) {
        obj.set({ left: newLeft, top: newTop });
        obj.setCoords();
      } else {
        // Generate a local placeholder QR image (PNG)
        const qrDataURL = await generateQRCodeDataURL('https://certificate-generator-ten-self.vercel.app/verify/placeholder', 300);
        fabric.Image.fromURL(qrDataURL, (img) => {
          img.set({
            left: newLeft,
            top: newTop,
            width: qr.width,
            height: qr.height,
            scaleX: 1,
            scaleY: 1,
            hasControls: true,
            hasBorders: true,
            lockUniScaling: false,
            qrPlaceholder: true,
            id: qr.id,
          });
          canvas.add(img);
          qrObjectsRef.current[qr.id] = img;
          canvas.renderAll();
        });
      }
    });
    canvas.renderAll();
  }, [qrFields]);

  // Handle object modifications (move, resize, text change)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const handleObjectModified = (e) => {
      const obj = e.target;
      if (obj.type === 'textbox') {
        const field = textFields.find(f => f.id === obj.id);
        if (field) {
          const newX = (obj.left / CANVAS_WIDTH) * 100;
          const newY = (obj.top / CANVAS_HEIGHT) * 100;
          onTextFieldUpdate(field.id, { x: newX, y: newY, text: obj.text });
        }
      } else if (obj.qrPlaceholder) {
        const qr = qrFields.find(q => q.id === obj.id);
        if (qr) {
          const newX = (obj.left / CANVAS_WIDTH) * 100;
          const newY = (obj.top / CANVAS_HEIGHT) * 100;
          const newWidth = obj.getScaledWidth();
          const newHeight = obj.getScaledHeight();
          onQRFieldUpdate(qr.id, { x: newX, y: newY, width: newWidth, height: newHeight });
          // Reset scale after resize to avoid accumulation
          obj.set({ width: newWidth, height: newHeight, scaleX: 1, scaleY: 1 });
          canvas.renderAll();
        }
      }
    };
    canvas.on('object:modified', handleObjectModified);
    canvas.on('text:changed', handleObjectModified);
    return () => {
      canvas.off('object:modified', handleObjectModified);
      canvas.off('text:changed', handleObjectModified);
    };
  }, [textFields, qrFields, onTextFieldUpdate, onQRFieldUpdate]);

  // Background image (scaled to fit, canvas size unchanged)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (backgroundImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fabric.Image.fromURL(e.target.result, (img) => {
          const scale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
          img.set({
            scaleX: scale,
            scaleY: scale,
            left: (CANVAS_WIDTH - img.width * scale) / 2,
            top: (CANVAS_HEIGHT - img.height * scale) / 2,
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            name: 'background',
          });
          const existingBg = canvas.getObjects().find(obj => obj.name === 'background');
          if (existingBg) canvas.remove(existingBg);
          canvas.insertAt(img, 0);
          canvas.renderAll();
          showToast('Template loaded – scaled to fit canvas', 'success');
        });
      };
      reader.readAsDataURL(backgroundImage);
    }
  }, [backgroundImage]);

  // Signature image
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (signatureImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fabric.Image.fromURL(e.target.result, (img) => {
          img.set({ left: CANVAS_WIDTH - 100, top: CANVAS_HEIGHT - 80, scaleX: 0.3, scaleY: 0.3, name: 'signature' });
          const existingSig = canvas.getObjects().find(obj => obj.name === 'signature');
          if (existingSig) canvas.remove(existingSig);
          canvas.add(img);
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(signatureImage);
    }
  }, [signatureImage]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full h-auto border border-white/20 rounded-lg shadow-2xl" style={{ maxWidth: '100%', height: 'auto' }} />
      <div className="absolute bottom-3 right-3 glass-panel px-3 py-1 text-xs text-white/70">💡 Drag & drop images | Resize QR with handles</div>
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';
export default CanvasEditor;