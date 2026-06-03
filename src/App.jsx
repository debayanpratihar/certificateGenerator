import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

const Editor = lazy(() => import('./pages/Editor'));
const Verify = lazy(() => import('./pages/Verify'));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-purple-900">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading Certificate Generator...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Editor />} />
            <Route path="/verify/:id" element={<Verify />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;