import type { DecisionFeedback } from '../feedback/feedback-engine';
import { toReadableFeedback, RATING_STYLES } from '../feedback/feedback-copy';

interface FeedbackPanelProps {
  feedback: DecisionFeedback[];
  isLoading?: boolean;
  bigBlind?: number;
}

export function FeedbackPanel({ feedback, isLoading, bigBlind = 2 }: FeedbackPanelProps) {
  if (isLoading) {
    return (
      <div className="mb-2 p-5 offsuit-module">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-offsuit-grey">Reviewing your plays...</span>
        </div>
      </div>
    );
  }

  if (feedback.length === 0) return null;

  const readable = feedback.map((fb) => toReadableFeedback(fb, bigBlind));

  return (
    <div className="mb-2 space-y-3">
      <div className="offsuit-module px-4 py-2.5">
        <h3 className="offsuit-section-title">How did you do?</h3>
      </div>
      {readable.map((fb, i) => {
        const style = RATING_STYLES[fb.rating];
        return (
          <div
            key={i}
            className={`p-4 rounded-module border ${style.bg} ${style.border} animate-slide-up`}
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-[15px] font-semibold text-white leading-snug">{fb.headline}</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${style.badge}`}>
                {style.label}
              </span>
            </div>

            <p className="text-sm text-offsuit-grey leading-relaxed mb-3">{fb.explanation}</p>

            <div className="pt-3 border-t border-white/5">
              <div className="px-3 py-2 rounded-full bg-surface-raised">
                <p className="text-[13px] text-offsuit-grey leading-relaxed">
                  <span className="text-white font-medium">Tip: </span>
                  {fb.tip}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
