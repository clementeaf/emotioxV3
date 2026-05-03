import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import apiClient from '../../../services/api/client';

interface Certification {
    txId: string;
    blockHeight: number;
    dataHash: string;
    researchId: string;
    certifiedAt: string;
}

interface VerificationResult {
    verified: boolean;
    currentHash: string;
    certifiedHash: string | null;
    certification: Certification | null;
}

export const BlockchainCertification = ({ researchId }: { researchId: string }) => {
    const queryClient = useQueryClient();
    const [showDetails, setShowDetails] = useState(false);

    const { data: status } = useQuery({
        queryKey: ['cerulean-status'],
        queryFn: async () => {
            const res = await apiClient.get<{ enabled: boolean; apiUrl: string }>('/cerulean/status');
            return res;
        },
        staleTime: 60_000,
    });

    const { data: verification } = useQuery({
        queryKey: ['cerulean-verify', researchId],
        queryFn: async () => {
            const res = await apiClient.get<{ verification: VerificationResult }>(
                `/cerulean/research/${researchId}/verify`
            );
            return res.verification;
        },
        enabled: !!status?.enabled,
        staleTime: 30_000,
    });

    const certify = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post<{ certification: Certification }>(
                `/cerulean/research/${researchId}/certify`, {}
            );
            return res.certification;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cerulean-verify', researchId] });
        },
    });

    if (!status?.enabled) return null;

    const cert = verification?.certification;
    const isVerified = verification?.verified;

    if (!cert) {
        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                <Shield className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                    <p className="text-sm text-gray-600">Blockchain integrity not yet certified</p>
                </div>
                <button
                    onClick={() => certify.mutate()}
                    disabled={certify.isPending}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {certify.isPending ? 'Certifying...' : 'Certify on Blockchain'}
                </button>
            </div>
        );
    }

    return (
        <div className={`px-4 py-3 rounded-lg border ${isVerified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center gap-3"
            >
                {isVerified ? (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                )}
                <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${isVerified ? 'text-green-800' : 'text-red-800'}`}>
                        {isVerified ? 'Data integrity verified on blockchain' : 'Data integrity mismatch detected'}
                    </p>
                    <p className="text-xs text-gray-500">
                        Certified {new Date(cert.certifiedAt).toLocaleDateString()} &middot; Block #{cert.blockHeight}
                    </p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
            </button>

            {showDetails && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Transaction ID</span>
                        <span className="font-mono text-gray-700">{cert.txId.slice(0, 24)}...</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Data Hash</span>
                        <span className="font-mono text-gray-700">{cert.dataHash.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Current Hash</span>
                        <span className={`font-mono ${isVerified ? 'text-green-700' : 'text-red-700'}`}>
                            {verification?.currentHash.slice(0, 16)}...
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
