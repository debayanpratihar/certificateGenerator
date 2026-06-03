import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVerificationData } from '../utils/verificationStore';

const Verify = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const data = getVerificationData(id);
    if (data) {
      setVerificationData(data);
      setLoading(false);
      return;
    }

    // If not found, check for a payload in the query (base64 JSON). Useful for placeholder QR scans.
    try {
      const params = new URLSearchParams(window.location.search);
      const payloadB64 = params.get('payload') || params.get('data');
      if (payloadB64) {
        try {
          // Robust base64 -> utf8 decode
          const b64 = payloadB64.replace(/\s+/g, '');
          const str = (() => {
            try {
              // browser: atob may return binary string; decode to UTF-8
              const binary = window.atob(b64);
              // percent-encode each byte and decode
              const percentEncoded = binary.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('');
              return decodeURIComponent(percentEncoded);
            } catch (e) {
              // fallback: try Buffer (node/electron)
              try { return Buffer.from(b64, 'base64').toString('utf8'); } catch (e2) { return null; }
            }
          })();
          if (str) {
            const decoded = JSON.parse(str);
            setVerificationData(decoded);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore and fallthrough to error
        }
      }
    } catch (e) {
      // ignore
    }

    setError(true);
    setLoading(false);
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel p-8 max-w-md text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1>
        <p className="text-gray-300 mb-6">Invalid or expired verification link.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Back to Generator</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel p-8 max-w-2xl w-full">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-green-400 mb-2">Certificate Verified!</h1>
          <p className="text-gray-300 mb-6">Official certificate issued via CERRT Pro</p>
          <div className="border-t border-white/20 my-6"></div>
          <div className="space-y-3 text-left">
            <h2 className="text-xl font-semibold text-white mb-4">Details:</h2>
            {Object.entries(verificationData).map(([key, value]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-white/10">
                <span className="text-purple-300 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="text-white">{String(value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <button onClick={() => navigate('/')} className="btn-primary">Create Your Own</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify;