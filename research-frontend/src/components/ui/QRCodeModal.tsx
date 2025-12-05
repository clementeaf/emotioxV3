import { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check, Download } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title?: string;
    description?: string;
    downloadFileName?: string;
}

export const QRCodeModal = ({
    isOpen,
    onClose,
    url,
    title = "Research link QR Code",
    description = "This is your Public QR Code",
    downloadFileName = "research-qr-code.png"
}: QRCodeModalProps) => {
    const [copied, setCopied] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    const handleCopyUrl = async () => {
        if (!url) return;

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    const handleDownload = () => {
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
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = downloadFileName;
                    link.href = blobUrl;
                    link.click();
                    URL.revokeObjectURL(blobUrl);
                });
            };

            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        } catch (error) {
            console.error('Error downloading QR:', error);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            closeOnOverlayClick={true}
        >
            <div className="space-y-6">
                {/* Description */}
                <p className="text-sm text-gray-600">{description}</p>
                <p className="text-xs text-gray-500">
                    Please download and share to your documents to get responses
                </p>

                {/* QR Code */}
                <div className="flex justify-center" ref={qrRef}>
                    <div className="bg-white p-6 rounded-lg border-4 border-blue-500">
                        {url ? (
                            <QRCode
                                value={url}
                                size={200}
                                level="H"
                            />
                        ) : (
                            <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-sm">
                                No URL provided
                            </div>
                        )}
                    </div>
                </div>

                {/* URL Display with Copy Button */}
                {url && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <input
                                type="text"
                                value={url}
                                readOnly
                                className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                            />
                            <button
                                onClick={handleCopyUrl}
                                className="p-2 hover:bg-gray-200 rounded transition-colors"
                                title="Copy URL"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-600" />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <div className="flex justify-center">
                    <Button
                        variant="primary"
                        onClick={handleDownload}
                        disabled={!url}
                        className="w-full"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download QR Code
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
