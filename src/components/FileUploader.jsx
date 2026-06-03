import React, { useRef } from 'react';

const FileUploader = ({ label, accept, onFileSelect, icon }) => {
  const inputRef = useRef(null);
  return (
    <div onClick={() => inputRef.current.click()} className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-purple-500 transition-all group">
      <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-gray-400 mt-1">Click to upload</p>
      <input ref={inputRef} type="file" accept={accept} onChange={(e) => onFileSelect(e.target.files[0])} className="hidden" />
    </div>
  );
};

export default FileUploader;