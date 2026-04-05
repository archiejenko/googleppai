/**
 * TranscriptViewer — stub component (L1)
 *
 * Accepts a timestamp and highlights the relevant segment.
 * Full transcript rendering is out of scope for L1.
 */

interface TranscriptViewerProps {
  callId:            string;
  activeTimestamp:   number | null;
}

export default function TranscriptViewer({ callId, activeTimestamp }: TranscriptViewerProps) {
  void callId;

  return (
    <div className="border border-[rgb(var(--border-default))] p-4 space-y-2">
      <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
        Transcript
      </p>
      {activeTimestamp !== null ? (
        <p className="text-xs text-[rgb(var(--text-secondary))]">
          Showing context at{' '}
          <span
            className="font-mono text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'DM Mono, monospace' }}
          >
            {Math.floor(activeTimestamp / 60)}:{String(activeTimestamp % 60).padStart(2, '0')}
          </span>
          {' '}— full transcript rendering coming in a future release.
        </p>
      ) : (
        <p className="text-xs text-[rgb(var(--text-muted))]">
          Click a point on the timeline to jump to that moment.
        </p>
      )}
    </div>
  );
}
