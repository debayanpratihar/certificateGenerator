import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="min-h-screen flex items-center justify-center"><div className="glass-panel p-8 text-center"><h1 className="text-2xl font-bold text-white">Something went wrong</h1><button onClick={() => window.location.reload()} className="btn-primary mt-4">Refresh</button></div></div>;
    return this.props.children;
  }
}

export default ErrorBoundary;