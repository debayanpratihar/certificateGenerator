import React, { useState } from 'react';

const ExportOptions = ({ onSingleDownload, onBulkGenerate, hasCSV, onGenerateQRCodes, hasSelectedQRs }) => {
  const [singleFormat, setSingleFormat] = useState('png');
  const [bulkFormat, setBulkFormat] = useState('png');

  return (
    <div className="glass-panel p-4">
      <h3 className="text-lg font-semibold text-white mb-4">📤 Export</h3>
      <div className="space-y-4">
        <div className="bg-white/5 rounded-xl p-3"><p className="text-sm font-medium mb-2">Single</p><div className="flex gap-2"><select value={singleFormat} onChange={(e) => setSingleFormat(e.target.value)} className="input-dark flex-1"><option>png</option><option>jpg</option><option>pdf</option></select><button onClick={() => onSingleDownload(singleFormat)} className="btn-primary">Download</button></div></div>
        <div className="bg-white/5 rounded-xl p-3"><p className="text-sm font-medium mb-2">Bulk (ZIP)</p><div className="flex gap-2"><select value={bulkFormat} onChange={(e) => setBulkFormat(e.target.value)} className="input-dark flex-1" disabled={!hasCSV}><option>png</option><option>jpg</option><option>pdf</option></select><button onClick={() => onBulkGenerate(bulkFormat)} disabled={!hasCSV} className="btn-primary disabled:opacity-50">Generate ZIP</button></div>{!hasCSV && <p className="text-xs text-yellow-400 mt-2">⚠️ Upload CSV first</p>}</div>
        <div className="bg-white/5 rounded-xl p-3 mt-3"><p className="text-sm font-medium mb-2">QR Codes</p><div className="flex gap-2"><button onClick={() => onGenerateQRCodes()} disabled={!hasCSV || !hasSelectedQRs} className="btn-secondary flex-1">Generate QR PNGs ZIP</button></div><p className="text-xs text-gray-400 mt-2">Generates QR PNGs locally for each CSV row and selected QR fields. Then upload the ZIP and align QR images like signatures.</p></div>
      </div>
    </div>
  );
};

export default ExportOptions;