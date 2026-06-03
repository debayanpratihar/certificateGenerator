import React, { useState, useEffect } from 'react';
import CanvasEditor from '../components/CanvasEditor';
import ControlPanel from '../components/ControlPanel';
import ExportOptions from '../components/ExportOptions';
import ProgressModal from '../components/ProgressModal';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import { validateCSV, processCSV } from '../utils/csvUtils';
import { generateCertificatesZip, generateQRCodesZip } from '../utils/exportUtils';
import JSZip from 'jszip';
import { fabric } from 'fabric';
import { generateQRCodeDataURL } from '../utils/qrUtils';
import { saveVerificationMapping } from '../utils/verificationStore';
import { v4 as uuidv4 } from 'uuid';

const Editor = () => {
  const [canvasRef, setCanvasRef] = useState(null);
  const [textFields, setTextFields] = useState([
    { id: '1', text: "Holder's Name", x: 50, y: 42, fontSize: 7, font: 'Arial', align: 'center', color: '#000000', bgColor: 'transparent', opacity: 80, bold: false, italic: false, selected: true },
    { id: '2', text: "Organization's Name", x: 50, y: 26, fontSize: 4, font: 'Arial', align: 'center', color: '#000000', bgColor: 'transparent', opacity: 80, bold: false, italic: false, selected: false },
    { id: '3', text: "using CERRT", x: 50, y: 64, fontSize: 3, font: 'Arial', align: 'center', color: '#000000', bgColor: 'transparent', opacity: 80, bold: false, italic: false, selected: false }
  ]);
  const [qrFields, setQrFields] = useState([]);
  // load saved fields from localStorage if present
  useEffect(() => {
    try {
      const savedText = window.localStorage.getItem('certificate_text_fields');
      const savedQr = window.localStorage.getItem('certificate_qr_fields');
      if (savedText) setTextFields(JSON.parse(savedText));
      if (savedQr) setQrFields(JSON.parse(savedQr));
    } catch (e) {
      // ignore
    }
  }, []);

  // autosave fields on change
  useEffect(() => {
    try { window.localStorage.setItem('certificate_text_fields', JSON.stringify(textFields)); } catch (e) {}
  }, [textFields]);
  useEffect(() => {
    try { window.localStorage.setItem('certificate_qr_fields', JSON.stringify(qrFields)); } catch (e) {}
  }, [qrFields]);
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [demoData, setDemoData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [securityData, setSecurityData] = useState('');
  const [controlActiveTab, setControlActiveTab] = useState('fields');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleCSVUpload = async (file) => {
    try {
      const validation = await validateCSV(file);
      if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
      }
      const { headers, data } = await processCSV(file);
      setCsvHeaders(headers);
      setCsvData(data);
      if (data.length > 0) {
        const demo = {};
        headers.forEach(h => { demo[h] = data[0][h]; });
        setDemoData(demo);
      }
      showToast(`Loaded ${data.length} records with ${headers.length} columns`, 'success');
    } catch (error) {
      showToast('Error processing CSV file', 'error');
    }
  };

  const addCSVColumnsAsFields = (selectedColumns) => {
    const newFields = selectedColumns.map((col, idx) => ({
      id: `csv-${Date.now()}-${idx}`,
      text: `{{${col}}}`,
      x: 50,
      y: 20 + idx * 8,
      fontSize: 4,
      font: 'Arial',
      align: 'center',
      color: '#000000',
      bgColor: 'transparent',
      opacity: 80,
      bold: false,
      italic: false,
      selected: true
    }));
    setTextFields(prev => [...prev, ...newFields]);
    showToast(`Added ${selectedColumns.length} fields`, 'success');
  };

  const handleBulkGenerate = async (format) => {
    if (!csvData || csvData.length === 0) {
      showToast('Please upload CSV data first', 'error');
      return;
    }
    if (!canvasRef) {
      showToast('Canvas not initialized', 'error');
      return;
    }

    const selectedTexts = textFields.filter(f => f.selected);
    const selectedQRs = qrFields.filter(q => q.selected);
    
    if (selectedTexts.length === 0 && selectedQRs.length === 0) {
      showToast('No fields selected. Check at least one text or QR field.', 'error');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: csvData.length });

    try {
      const verificationMap = {};
      const enrichedData = csvData.map(row => {
        const verificationId = uuidv4();
        const extra = securityData ? { securityToken: securityData } : {};
        verificationMap[verificationId] = { ...row, ...extra, generatedAt: new Date().toISOString() };
        return { ...row, verificationId, verificationUrl: `${window.location.origin}/verify/${verificationId}`, securityData: securityData };
      });
      saveVerificationMapping(verificationMap);

      const zipBlob = await generateCertificatesZip(
        canvasRef,
        selectedTexts,
        selectedQRs,
        enrichedData,
        csvHeaders,
        format,
        (current, total) => setGenerationProgress({ current, total })
      );
      
      const link = document.createElement('a');
      link.download = `certificates_${Date.now()}.zip`;
      link.href = URL.createObjectURL(zipBlob);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 1500);
      
      showToast(`Successfully generated ${csvData.length} certificates!`, 'success');
    } catch (error) {
      console.error('Bulk generation error:', error);
      showToast('Error generating certificates', 'error');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const handleGenerateQRCodes = async () => {
    if (!csvData || csvData.length === 0) {
      showToast('Please upload CSV data first', 'error');
      return;
    }
    const selectedQRIds = qrFields.filter(q => q.selected).map(q => q.id);
    if (selectedQRIds.length === 0) {
      showToast('Select at least one QR field (checkbox) to generate QR PNGs', 'error');
      return;
    }
    try {
      const selectedTextFieldsLocal = textFields.filter(f => f.selected);
      const zipBlob = await generateQRCodesZip(
        selectedQRIds,
        selectedTextFieldsLocal,
        csvData.map((r, idx) => ({ ...r, verificationId: r.verificationId || `auto-${idx+1}` })),
        csvHeaders,
        securityData
      );
      const link = document.createElement('a');
      link.download = `qr_images_${Date.now()}.zip`;
      link.href = URL.createObjectURL(zipBlob);
      // append to DOM to improve cross-browser reliability
      document.body.appendChild(link);
      link.click();
      // delay revoke slightly to avoid race where browser hasn't started download yet
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 1500);
      showToast('QR PNG ZIP generated and downloaded', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error generating QR ZIP', 'error');
    }
  };

  const handleUploadQRZip = async (file) => {
    if (!file) return;
    try {
      const zip = await JSZip.loadAsync(file);
      const canvasApi = canvasRef;
      if (!canvasApi) { showToast('Canvas not ready', 'error'); return; }
      const canvas = canvasApi.getCanvas();

      // Collect files and detect pattern verificationId_qrId.png
      const verMap = {}; // verificationId -> [{ qrId, blob }]
      const entries = [];
      for (const path of Object.keys(zip.files)) {
        const entry = zip.files[path];
        if (entry.dir) continue;
        const blob = await entry.async('blob');
        const fileName = path.split('/').pop();
        const base = fileName.replace(/\.[^/.]+$/, '');
        const parts = base.split('_');
        if (parts.length >= 2) {
          const verificationId = parts[0];
          const qrId = parts.slice(1).join('_');
          if (!verMap[verificationId]) verMap[verificationId] = [];
          verMap[verificationId].push({ qrId, blob });
        } else {
          entries.push({ fileName, blob });
        }
      }

      // If there are multiple verification entries, generate per-certificate exports
      const verificationIds = Object.keys(verMap);
      if (verificationIds.length > 0) {
        const outZip = new JSZip();
        // need verification data to replace text placeholders
        const { getVerificationData } = await import('../utils/verificationStore');
        for (const vid of verificationIds) {
          const items = verMap[vid];
          // build qrMap with data URLs
          const qrMap = {};
          for (const it of items) {
            // convert blob -> dataURL
            const dataURL = await new Promise((res) => {
              const reader = new FileReader();
              reader.onload = (e) => res(e.target.result);
              reader.readAsDataURL(it.blob);
            });
            // look for matching qrField id; prefer exact match to it.qrId
            const matchField = qrFields.find(q => q.id === it.qrId) || qrFields[0];
            if (matchField) qrMap[matchField.id] = dataURL;
          }

          // build textMap from verification data if available
          const row = getVerificationData(vid) || {};
          const textMap = {};
          textFields.forEach(t => {
            let template = t.text || '';
            // replace any {{header}} with value from row
            (Object.keys(row)).forEach(h => {
              template = template.replace(new RegExp(`{{${h}}}`, 'g'), row[h] || '');
            });
            textMap[t.id] = template;
          });

          // export using canvasRef helper
          if (canvasRef && typeof canvasRef.exportWithReplacements === 'function') {
            const dataURL = await canvasRef.exportWithReplacements(textMap, qrMap, 'png');
            const blob = await (await fetch(dataURL)).blob();
            outZip.file(`${vid}.png`, blob);
          }
        }
        const outBlob = await outZip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = `certificates_with_qr_${Date.now()}.zip`;
        link.href = URL.createObjectURL(outBlob);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { URL.revokeObjectURL(link.href); document.body.removeChild(link); }, 1500);
        showToast('Certificates with QR generated and downloaded', 'success');
        return;
      }

      // fallback: place images onto canvas for manual alignment
      for (const e of entries) {
        const url = URL.createObjectURL(e.blob);
        await new Promise((res) => {
          fabric.Image.fromURL(url, (img) => {
            img.set({ left: canvas.width / 2 - img.width / 2, top: canvas.height / 2 - img.height / 2, hasControls: true, hasBorders: true, selectable: true, name: 'qr-upload', id: `uploaded-${Date.now()}` });
            canvas.add(img);
            canvas.renderAll();
            URL.revokeObjectURL(url);
            res();
          }, { crossOrigin: 'anonymous' });
        });
      }
      if (entries.length > 0) showToast('QR images uploaded and placed', 'success');
    } catch (e) {
      console.error('QR ZIP upload error', e);
      showToast('Error processing QR ZIP', 'error');
    }
  };

  const handleSingleDownload = async (format) => {
    if (!canvasRef) {
      showToast('Canvas not initialized', 'error');
      return;
    }
    const selectedTexts = textFields.filter(f => f.selected);
    const selectedQRs = qrFields.filter(q => q.selected);
    if (selectedTexts.length === 0 && selectedQRs.length === 0) {
      showToast('No fields selected. Check at least one text or QR field.', 'error');
      return;
    }
    try {
      const verificationId = uuidv4();
      const extra = securityData ? { securityToken: securityData } : {};
      saveVerificationMapping({ [verificationId]: { single: true, ...extra, generatedAt: new Date().toISOString() } });
      const verificationUrl = `${window.location.origin}/verify/${verificationId}`;

      // build text replacements using CSV first row if available, otherwise demoData
      const sourceRow = (csvData && csvData.length > 0) ? csvData[0] : demoData || {};
      const textMap = {};
      selectedTexts.forEach(t => {
        let template = t.text || '';
        Object.keys(sourceRow).forEach(h => {
          template = template.replace(new RegExp(`{{${h}}}`, 'g'), sourceRow[h] || '');
        });
        textMap[t.id] = template;
      });

      const qrMap = {};
      selectedQRs.forEach(qr => { qrMap[qr.id] = verificationUrl; });

      // Use exportWithReplacements to apply both text and QR replacements temporarily
      let dataURL;
      if (canvasRef && typeof canvasRef.exportWithReplacements === 'function') {
        dataURL = await canvasRef.exportWithReplacements(textMap, qrMap, format);
      } else {
        // fallback: replace QR then export
        if (selectedQRs.length > 0) {
          const qrUpdates = {};
          selectedQRs.forEach(qr => { qrUpdates[qr.id] = verificationUrl; });
          await canvasRef.replaceQRImages(qrUpdates);
        }
        // replace texts synchronously
        canvasRef.replaceTextContents && canvasRef.replaceTextContents(textMap);
        dataURL = canvasRef.exportAsImage(format);
        // restore texts if possible
        canvasRef.restoreTextContents && canvasRef.restoreTextContents(textMap);
        if (selectedQRs.length > 0) {
          const restoreUpdates = {};
          selectedQRs.forEach(qr => { restoreUpdates[qr.id] = 'https://certificate-generator-ten-self.vercel.app/verify/placeholder'; });
          await canvasRef.replaceQRImages(restoreUpdates);
        }
      }

      const link = document.createElement('a');
      link.download = `certificate_${Date.now()}.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { try { document.body.removeChild(link); } catch (e) {} }, 500);
      showToast('Certificate downloaded successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error downloading certificate', 'error');
    }
  };

  const updateTextField = (id, updates) => {
    setTextFields(prev => prev.map(field => field.id === id ? { ...field, ...updates } : field));
  };

  const updateMultipleTextFields = (ids, updates) => {
    setTextFields(prev => prev.map(field => ids.includes(field.id) ? { ...field, ...updates } : field));
  };

  const deleteTextField = (id) => {
    setTextFields(prev => prev.filter(field => field.id !== id));
  };

  const addTextField = () => {
    const newId = Date.now().toString();
    setTextFields(prev => [...prev, {
      id: newId,
      text: 'New Field',
      x: 50,
      y: 50,
      fontSize: 5,
      font: 'Arial',
      align: 'center',
      color: '#000000',
      bgColor: 'transparent',
      opacity: 80,
      bold: false,
      italic: false,
      selected: true
    }]);
  };

  const addQRField = () => {
    const newId = `qr-${Date.now()}`;
    setQrFields(prev => [...prev, {
      id: newId,
      x: 85,        // near top-right (more visible)
      y: 15,
      width: 76,
      height: 76,
      selected: true
    }]);
  };

  const updateQRField = (id, updates) => {
    setQrFields(prev => prev.map(qr => qr.id === id ? { ...qr, ...updates } : qr));
  };

  const deleteQRField = (id) => {
    setQrFields(prev => prev.filter(qr => qr.id !== id));
  };

  const toggleSelectTextField = (id) => {
    setTextFields(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const toggleSelectQRField = (id) => {
    setQrFields(prev => prev.map(q => q.id === id ? { ...q, selected: !q.selected } : q));
  };

  const selectedTextIds = textFields.filter(f => f.selected).map(f => f.id);
  const selectedQRIds = qrFields.filter(q => q.selected).map(q => q.id);

  // Pass all fields to canvas (canvas shows all objects). Selection controls editing only.
  const visibleTextFields = textFields;
  const visibleQrFields = qrFields;

  // Handle clicks from canvas to select a single field/QR and open tools
  const handleSelectFieldFromCanvas = (id) => {
    if (!id) return;
    // clicking on canvas sets the clicked field as selected (do not deselect others)
    setTextFields(prev => prev.map(f => f.id === id ? { ...f, selected: true } : f));
    setControlActiveTab('tools');
  };

  const handleSelectQRFromCanvas = (id) => {
    if (!id) return;
    setQrFields(prev => prev.map(q => q.id === id ? { ...q, selected: true } : q));
    setControlActiveTab('tools');
  };

  // Generate preview QR images for the visible QR fields using demoData (or placeholders)
  // QR previews are no longer auto-generated. QR generation is performed via explicit export action.

  return (
    <div className="h-screen flex flex-col p-4 overflow-hidden">
      {toast.show && (
        <div className={`fixed top-20 right-4 z-50 animate-slide-up glass-panel px-6 py-3 rounded-xl shadow-2xl
          ${toast.type === 'error' ? 'border-red-500/50 bg-red-500/20' : 'border-green-500/50 bg-green-500/20'}`}>
          <p className="text-white">{toast.message}</p>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        <div className="flex-1 flex flex-col gap-4">
          <div className="glass-panel p-3 flex gap-3 items-center justify-center">
            <button onClick={addTextField} className="btn-secondary px-4 py-2 text-sm">➕ Add Text</button>
            <button onClick={addQRField} className="btn-secondary px-4 py-2 text-sm">📱 Add QR</button>
            <div className="w-px h-8 bg-white/20 mx-2"></div>
            {selectedTextIds.length > 0 && (
              <span className="text-xs text-purple-300">{selectedTextIds.length} text(s) selected</span>
            )}
            {selectedQRIds.length > 0 && (
              <button onClick={() => deleteQRField(selectedQRIds[0])} className="text-red-400 text-sm hover:text-red-300">🗑️ Delete Selected QR</button>
            )}
          </div>
          <div className="glass-panel p-4 overflow-auto flex-1">
            <CanvasEditor 
              onCanvasReady={setCanvasRef}
              textFields={visibleTextFields}
              qrFields={visibleQrFields}
              onTextFieldUpdate={updateTextField}
              onQRFieldUpdate={updateQRField}
              backgroundImage={backgroundImage}
              signatureImage={signatureImage}
              showToast={showToast}
                onSelectField={handleSelectFieldFromCanvas}
                onSelectQR={handleSelectQRFromCanvas}
            />
          </div>
        </div>

        <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto">
          <ControlPanel
            textFields={textFields}
            qrFields={qrFields}
            csvHeaders={csvHeaders}
            demoData={demoData}
            selectedTextIds={selectedTextIds}
            selectedQRIds={selectedQRIds}
            onToggleSelectText={toggleSelectTextField}
            onToggleSelectQR={toggleSelectQRField}
            onDeleteTextField={deleteTextField}
            onDeleteQRField={deleteQRField}
            onAddTextField={addTextField}
            onAddQRField={addQRField}
            onUpdateTextField={updateTextField}
            onUpdateMultipleTextFields={updateMultipleTextFields}
            onUpdateQRField={updateQRField}
            onCSVUpload={handleCSVUpload}
            onBackgroundUpload={setBackgroundImage}
            onSignatureUpload={setSignatureImage}
            onUploadQRZip={handleUploadQRZip}
            onAddCSVColumns={addCSVColumnsAsFields}
            securityData={securityData}
            setSecurityData={setSecurityData}
            activeTab={controlActiveTab}
            onTabChange={setControlActiveTab}
          />
          
          <ExportOptions
            onSingleDownload={handleSingleDownload}
            onBulkGenerate={handleBulkGenerate}
            hasCSV={csvData && csvData.length > 0}
            onGenerateQRCodes={handleGenerateQRCodes}
            hasSelectedQRs={selectedQRIds.length > 0}
          />
        </div>
      </div>

      <KeyboardShortcuts canvasRef={canvasRef} />
      <ProgressModal isOpen={isGenerating} progress={generationProgress} />
    </div>
  );
};

export default Editor;