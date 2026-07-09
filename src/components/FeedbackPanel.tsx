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
      <div className="mx-4 mb-2 p-5 offsuit-module">
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
    <div className="mx-4 mb-2 space-y-3">
      <h3 className="text-sm font-semibold text-offsuit-grey px-1">How did you do?</h3>
      {readable.map((fb, i) => {
        const style = RATING_STYLES[fb.rating];
        return (
          <div
            key={i}
            className={`p-4 rounded-module border ${style.bg} ${style.border} animate-slide-up`}
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-sm font-medium text-white leading-snug">{fb.headline}</p>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${style.badge}`}>
                {style.label}
              </span>
            </div>

            <p className="text-sm text-offsuit-grey leading-relaxed mb-3">{fb.explanation}</p>

            <div className="pt-3 border-t border-white/5">
              <p className="text-xs text-offsuit-grey leading-relaxed">
                <span className="text-white/70 font-medium">Tip: </span>
                {fb.tip}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
