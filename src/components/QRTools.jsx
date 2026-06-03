import React from 'react';

const QRTools = ({ field, onUpdate }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">QR Code Properties</h3>
      <div><label className="text-xs text-gray-400">Width (px)</label><input type="range" min="50" max="300" value={field.width} onChange={(e) => onUpdate({ width: parseInt(e.target.value) })} className="w-full" /><span className="text-xs ml-2">{field.width}px</span></div>
      <div><label className="text-xs text-gray-400">Height (px)</label><input type="range" min="50" max="300" value={field.height} onChange={(e) => onUpdate({ height: parseInt(e.target.value) })} className="w-full" /><span className="text-xs ml-2">{field.height}px</span></div>
      <div>
        <label className="text-xs text-gray-400">Extra Secure Token</label>
        <input type="text" value={field.extra || ''} onChange={(e) => onUpdate({ extra: e.target.value })} className="input-dark w-full text-sm" placeholder="Optional extra token included in QR payload" />
      </div>
      <p className="text-xs text-gray-400">Tip: You can also resize the QR code directly on canvas using the resize handles.</p>
    </div>
  );
};

export default QRTools;