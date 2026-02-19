import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">
          Candidate Skill Scanner
        </h1>
        <p className="text-slate-500 font-mono text-sm">
          Scaffold ready — US-001 complete
        </p>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
