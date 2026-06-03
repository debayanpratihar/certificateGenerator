import React from 'react';

const fonts = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans', 'Lato'];

const TextTools = ({ fields, onUpdate }) => {
  // Use first field as reference for UI, but apply changes to all selected
  const representative = fields[0];

  const handleUpdate = (updates) => {
    onUpdate(updates);
  };

  if (!representative) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Edit {fields.length} field(s)</h3>
      <div><label className="text-xs text-gray-400">Font</label><select value={representative.font} onChange={(e) => handleUpdate({ font: e.target.value })} className="input-dark w-full">{fonts.map(f => <option key={f}>{f}</option>)}</select></div>
      <div><label className="text-xs text-gray-400">Size (x)</label><input type="range" min="1" max="12" value={representative.fontSize} onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) })} className="w-full" /><span className="text-xs ml-2">{representative.fontSize}x</span></div>
      <div><label className="text-xs text-gray-400">Align</label><select value={representative.align} onChange={(e) => handleUpdate({ align: e.target.value })} className="input-dark w-full"><option>left</option><option>center</option><option>right</option></select></div>
      <div><label className="text-xs text-gray-400">Text Color</label><input type="color" value={representative.color} onChange={(e) => handleUpdate({ color: e.target.value })} className="w-full h-8 rounded" /></div>
      <div><label className="text-xs text-gray-400">Background Color (Highlight)</label><input type="color" value={representative.bgColor === 'transparent' ? '#ffffff' : representative.bgColor} onChange={(e) => handleUpdate({ bgColor: e.target.value })} className="w-full h-8 rounded" /><button onClick={() => handleUpdate({ bgColor: 'transparent' })} className="text-xs text-purple-400 mt-1">Remove background</button></div>
      <div><label className="text-xs text-gray-400">Opacity</label><input type="range" min="0" max="100" value={representative.opacity} onChange={(e) => handleUpdate({ opacity: parseInt(e.target.value) })} className="w-full" /></div>
      <div className="flex gap-2"><button onClick={() => handleUpdate({ bold: !representative.bold })} className={`flex-1 py-2 rounded ${representative.bold ? 'bg-purple-600' : 'bg-slate-700'} text-white font-bold`}>B</button><button onClick={() => handleUpdate({ italic: !representative.italic })} className={`flex-1 py-2 rounded ${representative.italic ? 'bg-purple-600' : 'bg-slate-700'} text-white italic`}>I</button></div>
    </div>
  );
};

export default TextTools;