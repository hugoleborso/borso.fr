interface CountFigureProps {
  label: string;
  value: string;
}

// @FollowsBlueprint atom-plain
export function CountFigure({ label, value }: CountFigureProps) {
  return (
    <div className="flex flex-col-reverse pt-2 border-t border-rule">
      <div className="mt-1 text-sm font-bold uppercase tracking-[0.06em] text-ink-muted">
        {label}
      </div>
      <div className="text-5xl font-bold leading-none tracking-[-0.03em] tabular-nums">{value}</div>
    </div>
  );
}
