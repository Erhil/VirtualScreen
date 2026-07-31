export function InnerToolTabs<T extends string>({
  active,
  ariaLabel,
  onChange,
  tabs
}: {
  active: T;
  ariaLabel: string;
  onChange: (tab: T) => void;
  tabs: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="inner-tool-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          aria-selected={active === tab.id}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
