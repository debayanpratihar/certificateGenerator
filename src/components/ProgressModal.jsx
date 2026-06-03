import React from 'react';

const ProgressModal = ({ isOpen, progress }) => {
  if (!isOpen) return null;
  const percent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-4">Generating...</h3>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div></div>
        <p className="text-center text-gray-300 mt-3">{progress.current} of {progress.total}</p>
      </div>
    </div>
  );
};

export default ProgressModal;