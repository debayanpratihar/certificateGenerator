import React, { useState } from 'react';
import CanvasEditor from '../components/CanvasEditor';
import ControlPanel from '../components/ControlPanel';
import ExportOptions from '../components/ExportOptions';
import ProgressModal from '../components/ProgressModal';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import { validateCSV, processCSV } from '../utils/csvUtils';
import { generateCertificatesZip } from '../utils/exportUtils';
import { saveVerificationMapping } from '../utils/verificationStore';
import { v4 as uuidv4 } from 'uuid';

const Editor = () => {
  const [canvasRef, setCanvasRef] = useState(null);
  const [textFields, setTextFields] = useState([
    { id: '1', text: "Holder's Name", x: 50, y: 42, fontSize: 7, font: 'Arial', align: 'center', color: '#000000', bgColor: 'transparent', opacity: 80, bold: false, italic: false, selected: false },
    { id: '2', text: "Organization's Name", x: 50, y: 26, fontSize: 4, font: 'Arial', align: 'center', color: '#000000', bgColor: 'transparent', opacity: 80, bold: false, italic: false, selected: false },
    { id: '3', text: "using CERRT", x: 50, y: 64, fontSize: 3, font: 'Arial', align: 'center', color: '#000000', bgColor: 'transparent', opacity: 80, bold: false, italic: false, selected: false }
  ]);
  const [qrFields, setQrFields] = useState([]);
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [demoData, setDemoData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [securityData, setSecurityData] = useState('');

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
        headers.slice(0, 3).forEach(h => { demo[h] = data[0][h]; });
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
      selected: false
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
        textFields,
        qrFields,
        enrichedData,
        csvHeaders,
        format,
        (current, total) => setGenerationProgress({ current, total })
      );
      
      const link = document.createElement('a');
      link.download = `certificates_${Date.now()}.zip`;
      link.href = URL.createObjectURL(zipBlob);
      link.click();
      URL.revokeObjectURL(link.href);
      
      showToast(`Successfully generated ${csvData.length} certificates!`, 'success');
    } catch (error) {
      console.error('Bulk generation error:', error);
      showToast('Error generating certificates', 'error');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const handleSingleDownload = async (format) => {
    if (!canvasRef) {
      showToast('Canvas not initialized', 'error');
      return;
    }
    try {
      const verificationId = uuidv4();
      const extra = securityData ? { securityToken: securityData } : {};
      saveVerificationMapping({ [verificationId]: { single: true, ...extra, generatedAt: new Date().toISOString() } });
      await canvasRef.updateQRCodesWithUrl(`${window.location.origin}/verify/${verificationId}`, securityData);
      
      const dataURL = canvasRef.exportAsImage(format);
      const link = document.createElement('a');
      link.download = `certificate_${Date.now()}.${format}`;
      link.href = dataURL;
      link.click();
      showToast('Certificate downloaded successfully!', 'success');
    } catch (error) {
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
      selected: false
    }]);
  };

  const addQRField = () => {
    const newId = `qr-${Date.now()}`;
    setQrFields(prev => [...prev, {
      id: newId,
      x: 50,
      y: 50,
      width: 120,
      height: 120,
      selected: false
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

  return (
    <div className="h-screen flex flex-col p-4 overflow-hidden">
      {toast.show && (
        <div className={`fixed top-20 right-4 z-50 animate-slide-up glass-panel px-6 py-3 rounded-xl shadow-2xl
          ${toast.type === 'error' ? 'border-red-500/50 bg-red-500/20' : 'border-green-500/50 bg-green-500/20'}`}>
          <p className="text-white">{toast.message}</p>
        </div>
      )}

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 glass-panel p-4 overflow-auto">
          <CanvasEditor 
            onCanvasReady={setCanvasRef}
            textFields={textFields}
            qrFields={qrFields}
            onTextFieldUpdate={updateTextField}
            onQRFieldUpdate={updateQRField}
            backgroundImage={backgroundImage}
            signatureImage={signatureImage}
            showToast={showToast}
          />
        </div>

        <div className="w-96 flex flex-col gap-4 overflow-y-auto">
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
            onAddCSVColumns={addCSVColumnsAsFields}
            securityData={securityData}
            setSecurityData={setSecurityData}
          />
          
          <ExportOptions
            onSingleDownload={handleSingleDownload}
            onBulkGenerate={handleBulkGenerate}
            hasCSV={csvData && csvData.length > 0}
          />
        </div>
      </div>

      <KeyboardShortcuts canvasRef={canvasRef} />
      <ProgressModal isOpen={isGenerating} progress={generationProgress} />
    </div>
  );
};

export default Editor;