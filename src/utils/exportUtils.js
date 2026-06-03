import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { fabric } from 'fabric';
import { generateQRCodeDataURL } from './qrUtils';

export const generateCertificatesZip = async (canvasRef, textFields, qrFields, data, headers, format, onProgress) => {
  const zip = new JSZip();
  const total = data.length;
  const canvas = canvasRef.getCanvas();

  for (let i = 0; i < total; i++) {
    const row = data[i];
    const clonedCanvas = new fabric.Canvas(null, { width: canvas.width, height: canvas.height });
    
    const state = canvas.toJSON(['qrPlaceholder', 'id']);
    
    state.objects = state.objects.map(obj => {
      if (obj.type === 'textbox') {
        let newText = obj.text;
        headers.forEach(header => {
          newText = newText.replace(new RegExp(`{{${header}}}`, 'g'), row[header] || '');
        });
        return { ...obj, text: newText };
      }
      return obj;
    });

    await new Promise((resolve) => {
      clonedCanvas.loadFromJSON(state, async () => {
        const qrObjects = clonedCanvas.getObjects().filter(obj => obj.qrPlaceholder);
        for (const qrObj of qrObjects) {
          const fullUrl = row.verificationUrl + (row.securityData ? `?token=${row.securityData}` : '');
          const qrData = await generateQRCodeDataURL(fullUrl, 300);
          await new Promise((res) => {
            fabric.Image.fromURL(qrData, (img) => {
              img.set({
                left: qrObj.left,
                top: qrObj.top,
                scaleX: qrObj.scaleX,
                scaleY: qrObj.scaleY,
                width: qrObj.width,
                height: qrObj.height,
              });
              clonedCanvas.remove(qrObj);
              clonedCanvas.add(img);
              res();
            });
          });
        }
        clonedCanvas.renderAll();
        resolve();
      });
    });

    let blob;
    if (format === 'pdf') {
      const dataURL = clonedCanvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(dataURL, 'PNG', 0, 0, canvas.width, canvas.height);
      blob = pdf.output('blob');
    } else {
      blob = await new Promise(resolve => clonedCanvas.getElement().toBlob(resolve, format === 'jpg' ? 'image/jpeg' : 'image/png', 1));
    }
    const fileName = `${row.Name || row.name || 'certificate'}_${i+1}.${format === 'pdf' ? 'pdf' : format}`;
    zip.file(fileName, blob);
    clonedCanvas.dispose();
    onProgress(i+1, total);
  }
  return zip.generateAsync({ type: 'blob' });
};