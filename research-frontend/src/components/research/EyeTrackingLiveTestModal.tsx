import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  researchId: string;
}

export function EyeTrackingLiveTestModal({ isOpen, onClose, researchId }: Props) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const participantBase = window.location.hostname === 'localhost'
    ? 'http://localhost:12600'
    : `${window.location.origin}/participant`;

  const previewUrl = `${participantBase}/research/${researchId}?preview=true`;

  return (
    <div className={`fixed inset-0 z-[100] transition-colors duration-200 ${visible ? 'bg-black/90' : 'bg-black/0'}`}>
      {/* Header bar */}
      <div className={`absolute top-0 left-0 right-0 h-10 bg-gray-900 flex items-center justify-between px-4 z-10 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-xs text-white/60">
          Live Test — Participant Preview
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded">
            Preview mode — no data saved
          </span>
          <button
            onClick={handleClose}
            className="p-1 text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">Loading participant view...</p>
          </div>
        </div>
      )}

      {/* Participant iframe */}
      <iframe
        ref={iframeRef}
        src={previewUrl}
        className={`w-full h-full border-0 pt-10 transition-opacity duration-200 ${visible && !loading ? 'opacity-100' : 'opacity-0'}`}
        allow="camera; microphone"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
