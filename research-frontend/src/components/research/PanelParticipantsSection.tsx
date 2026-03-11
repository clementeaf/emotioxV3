import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Upload, Trash2, Download, Users, Copy, Link } from 'lucide-react';
import { participantsService, type Participant } from '../../services/participants.service';
import { useToast } from '../../hooks/useToast';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  responded: { label: 'Responded', color: 'bg-green-100 text-green-800' },
  disqualified: { label: 'Disqualified', color: 'bg-red-100 text-red-800' },
  overquota: { label: 'Overquota', color: 'bg-gray-100 text-gray-600' },
};

interface PanelParticipantsSectionProps {
  researchId: string;
  participantShareUrl: string;
}

export const PanelParticipantsSection = ({ researchId, participantShareUrl }: PanelParticipantsSectionProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const loadParticipants = useCallback(async () => {
    if (!researchId) return;
    setLoading(true);
    try {
      const data = await participantsService.list(researchId);
      setParticipants(data);
    } catch {
      // Silently fail if table doesn't exist yet (migration not run)
    } finally {
      setLoading(false);
    }
  }, [researchId]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const csvText = await file.text();
      const result = await participantsService.importCSV(researchId, csvText);
      toast.success(`Imported ${result.imported} participant(s)${result.skipped > 0 ? `, ${result.skipped} skipped (duplicates)` : ''}`);
      if (result.errors.length > 0) {
        result.errors.forEach(err => toast.warning(err));
      }
      await loadParticipants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAll = async () => {
    if (participants.length === 0) return;
    try {
      await participantsService.deleteAll(researchId);
      setParticipants([]);
      toast.success('All participants deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleDeleteOne = async (participant: Participant) => {
    try {
      await participantsService.deleteOne(researchId, participant.id);
      setParticipants(prev => prev.filter(p => p.id !== participant.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const getParticipantUrl = (participant: Participant): string => {
    return `${participantShareUrl}?participantId=${encodeURIComponent(participant.participant_id)}`;
  };

  const handleCopyLink = async (participant: Participant) => {
    try {
      await navigator.clipboard.writeText(getParticipantUrl(participant));
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyAllLinks = async () => {
    if (participants.length === 0) return;
    const lines = participants.map(p => {
      const parts = [p.participant_id];
      if (p.email) parts.push(p.email);
      if (p.name) parts.push(p.name);
      parts.push(getParticipantUrl(p));
      return parts.join(',');
    });
    const header = 'participant_id,email,name,url';
    try {
      await navigator.clipboard.writeText([header, ...lines].join('\n'));
      toast.success(`Copied ${participants.length} links to clipboard (CSV format)`);
    } catch {
      toast.error('Failed to copy links');
    }
  };

  const handleExportCSV = () => {
    if (participants.length === 0) return;
    const header = 'participant_id,email,name,status,url';
    const rows = participants.map(p => {
      const url = getParticipantUrl(p);
      return [p.participant_id, p.email || '', p.name || '', p.status, url]
        .map(v => `"${v}"`)
        .join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-${researchId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingCount = participants.filter(p => p.status === 'pending').length;
  const respondedCount = participants.filter(p => p.status === 'responded').length;

  return (
    <div className="col-span-full space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Panel participants</h3>
            {participants.length > 0 && (
              <span className="text-xs text-gray-500">
                ({respondedCount}/{participants.length} responded)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            {participants.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyAllLinks} title="Copy all links to clipboard (CSV)">
                  <Link className="h-3.5 w-3.5 mr-1.5" />
                  Copy links
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} title="Download participants + links as CSV">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeleteAll} title="Delete all participants" className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* CSV format hint */}
        {participants.length === 0 && !loading && (
          <p className="text-xs text-gray-500 mb-3">
            Import a CSV file with columns: <code className="bg-gray-200 px-1 rounded">email</code>,{' '}
            <code className="bg-gray-200 px-1 rounded">name</code>,{' '}
            <code className="bg-gray-200 px-1 rounded">externalId</code> (all optional). A unique participant link will be generated for each row.
          </p>
        )}

        {/* Stats summary */}
        {participants.length > 0 && (
          <div className="flex gap-4 mb-3 text-xs">
            <span className="text-yellow-700">{pendingCount} pending</span>
            <span className="text-green-700">{respondedCount} responded</span>
            {participants.filter(p => p.status === 'disqualified').length > 0 && (
              <span className="text-red-700">{participants.filter(p => p.status === 'disqualified').length} disqualified</span>
            )}
          </div>
        )}

        {/* Participants table */}
        {loading ? (
          <p className="text-xs text-gray-400">Loading participants...</p>
        ) : participants.length > 0 ? (
          <div className="max-h-64 overflow-y-auto border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-600">ID</th>
                  <th className="text-left p-2 font-medium text-gray-600">Email</th>
                  <th className="text-left p-2 font-medium text-gray-600">Name</th>
                  <th className="text-left p-2 font-medium text-gray-600">Status</th>
                  <th className="text-right p-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.map(p => {
                  const statusInfo = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-2 font-mono text-gray-700">{p.participant_id}</td>
                      <td className="p-2 text-gray-600">{p.email || '—'}</td>
                      <td className="p-2 text-gray-600">{p.name || '—'}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(p)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Copy individual link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(p)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete participant"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};
