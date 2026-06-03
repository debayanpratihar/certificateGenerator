import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { fabric } from 'fabric';
import { generateQRCodeDataURL } from '../utils/qrUtils';

const CanvasEditor = forwardRef(({ onCanvasReady, textFields, qrFields, onTextFieldUpdate, onQRFieldUpdate, backgroundImage, signatureImage, showToast }, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const textObjectsRef = useRef({});
  const qrObjectsRef = useRef({});

  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricCanvasRef.current,
    exportAsImage: (format) => {
      if (!fabricCanvasRef.current) return '';
      return fabricCanvasRef.current.toDataURL({
        format: format === 'jpg' ? 'jpeg' : 'png',
        quality: 1,
      });
    },
    updateQRCodesWithUrl: async (verificationUrl, securityData = '') => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const fullUrl = securityData ? `${verificationUrl}?token=${encodeURIComponent(securityData)}` : verificationUrl;
      for (const [id, obj] of Object.entries(qrObjectsRef.current)) {
        if (obj && obj.type === 'image') {
          const qrDataURL = await generateQRCodeDataURL(fullUrl, 300);
          fabric.Image.fromURL(qrDataURL, (img) => {
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
              id: id,
              qrPlaceholder: true,
            });
            canvas.remove(obj);
            canvas.add(img);
            qrObjectsRef.current[id] = img;
            canvas.renderAll();
          });
        }
      }
    }
  }));

  // Initialize canvas
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });
    fabricCanvasRef.current = canvas;

    // Default dummy background (if no template uploaded)
    const dummyCertUrl = '/dummy-certificate.jpg';
    fabric.Image.fromURL(dummyCertUrl, (img) => {
      if (img) {
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        img.set({
          scaleX, scaleY,
          selectable: false, evented: false, hasControls: false, hasBorders: false,
          lockMovementX: true, lockMovementY: true, name: 'background',
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
            img.set({ left: pointer.x, top: pointer.y, scaleX: 0.5, scaleY: 0.5, hasControls: true, hasBorders: true, lockUniScaling: false });
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

    onCanvasReady?.({
      getCanvas: () => fabricCanvasRef.current,
      exportAsImage: (format) => fabricCanvasRef.current.toDataURL({ format: format === 'jpg' ? 'jpeg' : 'png', quality: 1 }),
      updateQRCodesWithUrl: async (url, sec) => {
        const fullUrl = sec ? `${url}?token=${sec}` : url;
        for (const [id, obj] of Object.entries(qrObjectsRef.current)) {
          const qrData = await generateQRCodeDataURL(fullUrl, 300);
          fabric.Image.fromURL(qrData, (img) => {
            img.set({ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY, width: obj.width, height: obj.height, hasControls: true, lockUniScaling: false, id, qrPlaceholder: true });
            canvas.remove(obj);
            canvas.add(img);
            qrObjectsRef.current[id] = img;
            canvas.renderAll();
          });
        }
      }
    });

    return () => {
      canvasElement.removeEventListener('dragover', handleDragOver);
      canvasElement.removeEventListener('drop', handleDrop);
      canvas.dispose();
    };
  }, []);

  // Sync text fields to canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const existingTexts = canvas.getObjects().filter(obj => obj.type === 'textbox');
    existingTexts.forEach(obj => canvas.remove(obj));

    textFields.forEach(field => {
      const fontSizePx = field.fontSize * 8;
      const textObj = new fabric.Textbox(field.text, {
        left: (field.x / 100) * canvas.width,
        top: (field.y / 100) * canvas.height,
        fontSize: fontSizePx,
        fontFamily: field.font,
        fill: field.color,
        textAlign: field.align,
        opacity: field.opacity / 100,
        fontWeight: field.bold ? 'bold' : 'normal',
        fontStyle: field.italic ? 'italic' : 'normal',
        backgroundColor: field.bgColor !== 'transparent' ? field.bgColor : '',
        width: 200,
        hasControls: true,
        hasBorders: true,
        originX: 'center',
        originY: 'center',
        id: field.id,
      });
      canvas.add(textObj);
      textObjectsRef.current[field.id] = textObj;
    });
    canvas.renderAll();
  }, [textFields]);

  // Sync QR fields to canvas (as resizable images)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const existingQRs = canvas.getObjects().filter(obj => obj.qrPlaceholder);
    existingQRs.forEach(obj => canvas.remove(obj));

    qrFields.forEach(async (qr) => {
      const qrDataURL = await generateQRCodeDataURL('https://example.com/verify/placeholder', 300);
      fabric.Image.fromURL(qrDataURL, (img) => {
        img.set({
          left: (qr.x / 100) * canvas.width,
          top: (qr.y / 100) * canvas.height,
          scaleX: qr.width / 300,
          scaleY: qr.height / 300,
          width: qr.width,
          height: qr.height,
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
    });
  }, [qrFields]);

  // Handle object movement & resizing
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const handleObjectModified = (e) => {
      const obj = e.target;
      if (obj.type === 'textbox') {
        const field = textFields.find(f => f.id === obj.id);
        if (field) {
          const newX = (obj.left / canvas.width) * 100;
          const newY = (obj.top / canvas.height) * 100;
          onTextFieldUpdate(field.id, { x: newX, y: newY, text: obj.text });
        }
      } else if (obj.qrPlaceholder) {
        const qr = qrFields.find(q => q.id === obj.id);
        if (qr) {
          const newX = (obj.left / canvas.width) * 100;
          const newY = (obj.top / canvas.height) * 100;
          const newWidth = obj.width * obj.scaleX;
          const newHeight = obj.height * obj.scaleY;
          onQRFieldUpdate(qr.id, { x: newX, y: newY, width: newWidth, height: newHeight });
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

  // Background image (resizes canvas to original image size)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (backgroundImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fabric.Image.fromURL(e.target.result, (img) => {
          // Resize canvas to match image dimensions
          canvas.setWidth(img.width);
          canvas.setHeight(img.height);
          img.set({
            left: 0, top: 0,
            selectable: false, evented: false, hasControls: false, hasBorders: false,
            lockMovementX: true, lockMovementY: true, name: 'background',
          });
          const existingBg = canvas.getObjects().find(obj => obj.name === 'background');
          if (existingBg) canvas.remove(existingBg);
          canvas.insertAt(img, 0);
          canvas.renderAll();
          showToast('Template loaded – canvas resized to original dimensions', 'success');
        });
      };
      reader.readAsDataURL(backgroundImage);
    }
  }, [backgroundImage]);

  // Signature image (stays as overlay)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (signatureImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fabric.Image.fromURL(e.target.result, (img) => {
          img.set({ left: canvas.width - 100, top: canvas.height - 80, scaleX: 0.3, scaleY: 0.3, name: 'signature' });
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
      <div className="absolute bottom-3 right-3 glass-panel px-3 py-1 text-xs text-white/70">💡 Drag & drop images or resize QR/Text</div>
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';
export default CanvasEditor;