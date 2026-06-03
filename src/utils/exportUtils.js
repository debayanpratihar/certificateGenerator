import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { fabric } from 'fabric';
import { generateQRCodeDataURL } from './qrUtils';

export const generateCertificatesZip = async (canvasRef, selectedTexts, selectedQRs, data, headers, format, onProgress) => {
  const zip = new JSZip();
  const total = data.length;
  // Prefer using the canvasRef export helper that can temporarily apply replacements
  for (let i = 0; i < total; i++) {
    const row = data[i];
    // build text replacements for selected text fields
    const textMap = {};
    selectedTexts.forEach(t => {
      let template = t.text || '';
      headers.forEach(header => {
        template = template.replace(new RegExp(`{{${header}}}`, 'g'), row[header] || '');
      });
      textMap[t.id] = template;
    });

    // build qr replacements mapping qrId -> verification URL
    const qrMap = {};
    selectedQRs.forEach(q => {
      qrMap[q.id] = row.verificationUrl || `${window.location.origin}/verify/${row.verificationId || i+1}`;
    });

    // use canvasRef.exportWithReplacements if available
    let dataURL;
    if (canvasRef && typeof canvasRef.exportWithReplacements === 'function') {
      dataURL = await canvasRef.exportWithReplacements(textMap, qrMap, format === 'pdf' ? 'png' : format);
    } else {
      // fallback: export as-is
      const canvas = canvasRef.getCanvas();
      dataURL = canvas.toDataURL('image/png');
    }

    // convert dataURL to blob
    const blob = await (await fetch(dataURL)).blob();
    const fileName = `${row.verificationId || row.Name || row.name || 'certificate'}_${i+1}.${format === 'pdf' ? 'pdf' : format}`;
    zip.file(fileName, blob);
    onProgress(i+1, total);
  }
  return zip.generateAsync({ type: 'blob' });
};

export const generateQRCodesZip = async (selectedQRIds, selectedTextFields, dataRows, headers, securityData) => {
  const zip = new JSZip();
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    for (const qrId of selectedQRIds) {
      const payload = {
        // include row data and a verification id/url placeholder
        verificationId: row.verificationId || `auto-${i+1}`,
        token: securityData || row.securityData || '',
        fields: {}
      };
      // include selected text fields values (extract header name from template like {{Header}})
      selectedTextFields.forEach(field => {
        let val = '';
        // attempt to extract header name from field.text like {{Header}}
        const m = (field.text || '').match(/{{\s*([^}]+)\s*}}/);
        if (m && m[1]) {
          const header = m[1];
          val = row[header] || row.Name || '';
          payload.fields[header] = val;
        }
        // also include by field id for mapping
        payload.fields[field.id] = val;
      });
      // populate fields from selected text fields
      selectedTextFields.forEach(field => {
        const m = (field.text || '').match(/{{\s*([^}]+)\s*}}/);
        if (m && m[1]) {
          const header = m[1];
          payload.fields[header] = row[header] || row.Name || '';
        }
        payload.fields[field.id] = row[field.id] || row.Name || '';
      });

      // embed the full payload into the verification URL as base64 so scanning the QR redirects with data
      const raw = JSON.stringify(payload);
      const b64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(raw))) : Buffer.from(raw).toString('base64');
      const verificationUrl = `${window.location.origin}/verify/placeholder?payload=${b64}`;
      const size = 300;
      const dataUrl = await generateQRCodeDataURL(verificationUrl, size);
      // convert dataURL to binary and add to zip
      const base64 = dataUrl.split(',')[1];
      const fileName = `${row.verificationId || row.Name || row.name || 'row'+(i+1)}_${qrId}.png`;
      zip.file(fileName, base64, { base64: true });
    }
  }
  return zip.generateAsync({ type: 'blob' });
};