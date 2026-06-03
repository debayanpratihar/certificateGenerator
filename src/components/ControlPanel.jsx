import React, { useState } from 'react';
import FileUploader from './FileUploader';
import TextTools from './TextTools';
import QRTools from './QRTools';

const ControlPanel = ({ 
  textFields, qrFields, csvHeaders, demoData,
  selectedTextIds, selectedQRIds,
  onToggleSelectText, onToggleSelectQR,
  onDeleteTextField, onDeleteQRField, onAddTextField, onAddQRField,
  onUpdateTextField, onUpdateMultipleTextFields, onUpdateQRField,
  onCSVUpload, onBackgroundUpload, onSignatureUpload,
  onUploadQRZip,
  onAddCSVColumns, securityData, setSecurityData,
  activeTab: activeTabProp, onTabChange
}) => {
  const [internalTab, setInternalTab] = useState('fields');
  const activeTab = typeof activeTabProp === 'string' ? activeTabProp : internalTab;
  const setActiveTab = (t) => {
    if (onTabChange) onTabChange(t);
    else setInternalTab(t);
  };
  const [selectedColumns, setSelectedColumns] = useState([]);

  const toggleColumn = (col) => {
    setSelectedColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const handleAddSelectedColumns = () => {
    if (selectedColumns.length === 0) return;
    onAddCSVColumns(selectedColumns);
    setSelectedColumns([]);
  };

  const applyToSelected = (updates) => {
    if (selectedTextIds.length > 0) {
      onUpdateMultipleTextFields(selectedTextIds, updates);
    }
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-full">
      <div className="flex border-b border-white/20">
        <button onClick={() => setActiveTab('fields')} className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'fields' ? 'bg-gradient-to-r from-purple-600/50 to-indigo-600/50 text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>📝 Fields</button>
        <button onClick={() => setActiveTab('tools')} className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'tools' ? 'bg-gradient-to-r from-purple-600/50 to-indigo-600/50 text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>🎨 Tools</button>
        <button onClick={() => setActiveTab('uploads')} className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'uploads' ? 'bg-gradient-to-r from-purple-600/50 to-indigo-600/50 text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>📁 Uploads</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'fields' && (
          <>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <h4 className="text-sm font-semibold text-white sticky top-0 bg-slate-900/90 py-1">Text Fields (check to include)</h4>
              {textFields.map(field => (
                <div key={field.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                  <input type="checkbox" checked={field.selected} onChange={() => onToggleSelectText(field.id)} className="w-4 h-4" />
                  <input type="text" value={field.text} onChange={(e) => onUpdateTextField(field.id, { text: e.target.value })} className="input-dark flex-1 text-sm" />
                  <button onClick={() => onDeleteTextField(field.id)} className="text-red-400 hover:text-red-300 p-1">🗑️</button>
                </div>
              ))}
              {csvHeaders.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-white mt-4">CSV Columns (add as fields)</h4>
                  {csvHeaders.map(col => (
                    <div key={col} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                      <input type="checkbox" checked={selectedColumns.includes(col)} onChange={() => toggleColumn(col)} className="w-4 h-4" />
                      <span className="flex-1 text-sm">{col}</span>
                      {demoData && <span className="text-xs text-gray-400">eg: {demoData[col]}</span>}
                    </div>
                  ))}
                  <button onClick={handleAddSelectedColumns} disabled={selectedColumns.length === 0} className="btn-secondary w-full mt-2">Add Selected Columns</button>
                </>
              )}
              <h4 className="text-sm font-semibold text-white mt-4">QR Fields (check to include)</h4>
              {qrFields.map(qr => (
                <div key={qr.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                  <input type="checkbox" checked={qr.selected} onChange={() => onToggleSelectQR(qr.id)} className="w-4 h-4" />
                  <span className="flex-1 text-sm">QR Code</span>
                  <button onClick={() => onDeleteQRField(qr.id)} className="text-red-400 hover:text-red-300 p-1">🗑️</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onAddTextField} className="btn-secondary flex-1">+ Add Text</button>
              <button onClick={onAddQRField} className="btn-secondary flex-1">📱 Add QR</button>
            </div>
            {selectedTextIds.length > 0 && (
              <div className="bg-purple-500/20 p-2 rounded text-sm">
                <p>{selectedTextIds.length} text field(s) selected. Use Tools tab to edit all at once.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'tools' && (
          <>
            {selectedTextIds.length > 0 && (
              <TextTools fields={textFields.filter(f => selectedTextIds.includes(f.id))} onUpdate={applyToSelected} />
            )}
            {selectedQRIds.length === 1 && (
              <QRTools field={qrFields.find(q => q.id === selectedQRIds[0])} onUpdate={onUpdateQRField} />
            )}
            {selectedTextIds.length === 0 && selectedQRIds.length === 0 && (
              <p className="text-gray-400 text-sm">Select one or more fields (checkboxes) to edit them.</p>
            )}
          </>
        )}

        {activeTab === 'uploads' && (
          <div className="space-y-4">
            <FileUploader label="Certificate Template (scaled to fit)" accept="image/*" onFileSelect={onBackgroundUpload} icon="🎨" />
            <FileUploader label="Signature (PNG)" accept="image/png" onFileSelect={onSignatureUpload} icon="✍️" />
            <FileUploader label="CSV/Excel Data" accept=".csv,.xlsx,.xls" onFileSelect={onCSVUpload} icon="📊" />
            <FileUploader label="Upload QR PNGs ZIP" accept=".zip" onFileSelect={onUploadQRZip} icon="🗜️" />
            <div className="border-t border-white/10 pt-3">
              <label className="text-sm font-medium">Extra Security Data (optional):</label>
              <input type="text" value={securityData} onChange={(e) => setSecurityData(e.target.value)} placeholder="e.g., batch number" className="input-dark w-full mt-1 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Embedded in QR codes and shown on verification page.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;