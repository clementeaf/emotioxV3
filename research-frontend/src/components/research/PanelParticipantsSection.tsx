import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { Upload, Trash2, Download, Users, Copy, Link, Send, Mail } from 'lucide-react';
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
  researchName: string;
}

export const PanelParticipantsSection = ({ researchId, participantShareUrl, researchName }: PanelParticipantsSectionProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmSendAll, setConfirmSendAll] = useState(false);
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

  const handleSendAll = async () => {
    setConfirmSendAll(false);
    setSending(true);
    try {
      const result = await participantsService.sendEmails(researchId, participantShareUrl, researchName);
      if (result.sent > 0) {
        toast.success(`Sent ${result.sent} invitation(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      } else if (result.failed > 0) {
        toast.error(`All ${result.failed} email(s) failed to send`);
      } else {
        toast.warning('No pending participants with email to send to');
      }
      await loadParticipants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleSendOne = async (participant: Participant) => {
    setSendingId(participant.id);
    try {
      const result = await participantsService.sendEmail(researchId, participant.id, participantShareUrl, researchName);
      if (result.success) {
        toast.success(`Invitation sent to ${participant.email}`);
        await loadParticipants();
      } else {
        toast.error(result.error || 'Failed to send email');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSendingId(null);
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

  const participantColumns = useMemo((): DataTableColumn<Participant>[] => [
    { key: 'id', header: 'ID', render: (p) => <span className="font-mono text-gray-700">{p.participant_id}</span> },
    { key: 'email', header: 'Email', render: (p) => <span className="text-gray-600">{p.email || '—'}</span> },
    { key: 'name', header: 'Name', render: (p) => <span className="text-gray-600">{p.name || '—'}</span> },
    {
      key: 'status', header: 'Status',
      render: (p) => {
        const s = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
        return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.color}`}>{s.label}</span>;
      },
    },
    {
      key: 'invited', header: 'Invited',
      render: (p) => <span className="text-gray-500">{p.invited_at ? new Date(p.invited_at).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          {p.email && (
            <button type="button" onClick={() => handleSendOne(p)} disabled={sendingId === p.id}
              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
              title={p.invited_at ? 'Resend invitation' : 'Send invitation'}>
              <Mail className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={() => handleCopyLink(p)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Copy individual link">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => handleDeleteOne(p)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete participant">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ], [sendingId, handleSendOne, handleCopyLink, handleDeleteOne]);

  const pendingCount = participants.filter(p => p.status === 'pending').length;
  const respondedCount = participants.filter(p => p.status === 'responded').length;
  const pendingWithEmail = participants.filter(p => p.status === 'pending' && p.email).length;

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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmSendAll(true)}
                  disabled={sending || pendingWithEmail === 0}
                  title={pendingWithEmail > 0 ? `Send invitations to ${pendingWithEmail} pending participant(s)` : 'No pending participants with email'}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {sending ? 'Sending...' : 'Send invitations'}
                </Button>
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
            <DataTable<Participant>
              columns={participantColumns}
              data={participants}
              rowKey={(p) => p.id}
              size="compact"
              stickyHeader
            />
          </div>
        ) : null}

        {/* Confirmation dialog for bulk send */}
        {confirmSendAll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Send invitations?</h4>
              <p className="text-sm text-gray-600 mb-4">
                This will send an email invitation to <strong>{pendingWithEmail}</strong> pending participant(s) with email address.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmSendAll(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSendAll}>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
