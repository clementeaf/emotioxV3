'use client';

import { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  researchUrl: string;
}

export function QRCodeModal({ open, onOpenChange, researchUrl }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopyUrl = async () => {
    if (!researchUrl) return;

    try {
      await navigator.clipboard.writeText(researchUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleDownload = () => {
    // Validar que estamos en el browser
    if (typeof window === 'undefined' || !qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    try {
      // Convert SVG to canvas for download
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 512;
      canvas.height = 512;

      img.onload = () => {
        ctx?.drawImage(img, 0, 0, 512, 512);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = 'research-qr-code.png';
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        });
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (error) {
      console.error('Error al descargar QR:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR generado</DialogTitle>
          <DialogDescription>
            Este código QR contiene el enlace de reclutamiento para su investigación.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {/* QR Code */}
          <div className="flex justify-center mb-6" ref={qrRef}>
            <div className="bg-white border-4 border-blue-500 rounded-lg p-4">
              {researchUrl ? (
                <QRCode
                  value={researchUrl}
                  size={256}
                  level="H"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-neutral-400 text-sm">
                  No URL provided
                </div>
              )}
            </div>
          </div>

          {/* URL Display with Copy Button */}
          {researchUrl && (
            <div className="mb-6">
              <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <input
                  type="text"
                  value={researchUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-neutral-700 outline-none"
                />
                <button
                  onClick={handleCopyUrl}
                  className="p-2 hover:bg-neutral-200 rounded transition-colors"
                  title="Copiar URL"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-neutral-600" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={!researchUrl}
            >
              Descargar QR
            </Button>
            <Button
              className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 