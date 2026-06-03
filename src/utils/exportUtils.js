import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { fabric } from 'fabric';
import { generateQRCodeDataURL } from './qrUtils';

export const generateCertificatesZip = async (canvasRef, selectedTexts, selectedQRs, data, headers, format, onProgress) => {
  const zip = new JSZip();
  const total = data.length;
  const canvas = canvasRef.getCanvas();

  for (let i = 0; i < total; i++) {
    const row = data[i];
    const clonedCanvas = new fabric.Canvas(null, { width: canvas.width, height: canvas.height });
    
    const allObjects = canvas.toJSON(['qrPlaceholder', 'id']).objects;
      // Exclude QR placeholders from the exported certificate images; QR images are handled separately.
      const filteredObjects = allObjects.filter(obj => {
        if (obj.type === 'textbox') return selectedTexts.some(t => t.id === obj.id);
        if (obj.qrPlaceholder) return false;
        return obj.name === 'background' || obj.name === 'signature';
      });
    
    const state = { objects: filteredObjects };
    
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
          // QR images are not embedded here. They should be uploaded and aligned separately by the user.
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

export const generateQRCodesZip = async (selectedQRIds, selectedTextIds, dataRows, headers, securityData) => {
  const zip = new JSZip();
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    for (const qrId of selectedQRIds) {
      const payload = {
        verificationUrl: row.verificationUrl || `${window.location.origin}/verify/${row.verificationId || i+1}`,
        token: securityData || row.securityData || '',
        fields: {}
      };
      // include selected text fields values
      selectedTextIds.forEach(tid => {
        // find text field template in dataRows? assume caller provides headers replacement
        let val = '';
        // try to resolve from headers
        headers.forEach(h => {
          if (row[h]) {
            // nothing — we rely on caller to map placeholders in verification step
          }
        });
        payload.fields[tid] = row[tid] || row.Name || '';
      });
      const size = 300;
      const dataUrl = await generateQRCodeDataURL(JSON.stringify(payload), size);
      // convert dataURL to binary and add to zip
      const base64 = dataUrl.split(',')[1];
      const fileName = `${row.verificationId || row.Name || row.name || 'row'+(i+1)}_${qrId}.png`;
      zip.file(fileName, base64, { base64: true });
    }
  }
  return zip.generateAsync({ type: 'blob' });
};