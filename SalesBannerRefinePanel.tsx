import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { middleware_url } from '../../../utils/constants';

export interface SalesBannerVersion {
  version: number;
  label: string;
  url: string;
  blob: Blob;
}

interface SalesBannerRefinePanelProps {
  transactionUuid: string | null;
  versions: SalesBannerVersion[];
  activeVersionIdx: number;
  onNewVersion: (version: SalesBannerVersion) => void;
  onSelectVersion: (idx: number) => void;
  className?: string;
}

export function SalesBannerRefinePanel({
  transactionUuid,
  versions,
  activeVersionIdx,
  onNewVersion,
  onSelectVersion,
  className = '',
}: SalesBannerRefinePanelProps) {
  const [feedback, setFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState('');

  const handleRefine = async () => {
    if (!feedback.trim()) return;
    if (!transactionUuid) {
      setError('No transaction found. Generate a banner first.');
      return;
    }

    setIsRefining(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${middleware_url}/batch_process/sales_platform/banner/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaction_uuid: transactionUuid,
          feedback: feedback.trim(),
          source_version_idx: activeVersionIdx,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || err.detail || `HTTP ${response.status}`);
      }

      const versionNum = parseInt(response.headers.get('X-Version-Number') || '2', 10);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      onNewVersion({
        version: versionNum,
        label: `v${versionNum}`,
        url,
        blob,
      });

      setFeedback('');
    } catch (e: any) {
      setError(e.message || 'Refinement failed');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#b3e0ff] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[#005AC3]" />
          <span className="text-slate-800 font-semibold text-sm">Refine with AI</span>
        </div>
        <p className="text-slate-400 text-xs mt-0.5">Describe what to change and regenerate</p>
      </div>

      {/* Prompt area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Remove the Q1 FY27 section, change the title color to blue, reduce the logo size..."
            rows={5}
            className="w-full rounded-md border border-[#b3e0ff] bg-white text-slate-700 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#53A2FF]/40 placeholder:text-slate-400"
            disabled={isRefining}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={handleRefine}
            disabled={isRefining || !feedback.trim() || !transactionUuid}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium bg-[#53A2FF] hover:bg-[#3d8beb] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefining ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Regenerate Banner
              </>
            )}
          </button>
        </div>

        {/* Versions */}
        {versions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Versions</p>
              <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 font-medium">
                {versions.length} total
              </span>
            </div>
            {/* Pill tab strip */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {versions.map((v, idx) => {
                const isActive = activeVersionIdx === idx;
                const isLatest = idx === versions.length - 1 && versions.length > 1;
                return (
                  <button
                    key={v.version}
                    onClick={() => onSelectVersion(idx)}
                    className={`relative flex-shrink-0 flex flex-col items-center gap-0.5 px-3 pt-2 pb-1.5 rounded-xl border transition-all duration-150 min-w-[56px] ${
                      isActive
                        ? 'border-[#53A2FF] bg-[#53A2FF] text-white shadow-md shadow-[#53A2FF]/30'
                        : 'border-[#d1e9ff] bg-white text-slate-500 hover:border-[#53A2FF]/50 hover:bg-[#f0f8ff]'
                    }`}
                  >
                    {isLatest && (
                      <span className={`absolute -top-1.5 -right-1 text-[9px] font-bold px-1 rounded-full leading-tight ${
                        isActive ? 'bg-white text-[#53A2FF]' : 'bg-[#53A2FF] text-white'
                      }`}>
                        NEW
                      </span>
                    )}
                    <span className="text-sm font-bold leading-none">{v.label}</span>
                    <span className={`text-[9px] font-medium leading-none ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {idx === 0 ? 'Original' : `Rev ${idx}`}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Active version label */}
            <p className="text-[11px] text-slate-400 text-center">
              Viewing: <span className="text-[#005AC3] font-medium">
                {activeVersionIdx === 0 ? 'Original generation' : `Revision ${activeVersionIdx}`}
              </span>
            </p>
          </div>
        )}

        {!transactionUuid && (
          <p className="text-slate-400 text-xs text-center mt-4">
            Generate a banner first to enable refinement
          </p>
        )}
      </div>
    </div>
  );
}
