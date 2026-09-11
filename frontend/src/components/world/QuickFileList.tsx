import { useState } from "react";
import { type WorkspaceTab } from "../../lib/api";

export function QuickFileList({
  title,
  items,
  onOpen,
  collapsible = false,
  defaultOpen = true,
  emptyLabel = "None"
}: {
  title: string;
  items: WorkspaceTab[];
  onOpen: (tab: WorkspaceTab) => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const visible = !collapsible || open;

  return (
    <section className="quick-section" aria-label={title}>
      {collapsible ? (
        <button
          aria-expanded={open}
          className="quick-heading quick-heading-button"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span className="section-label">{title}</span>
          <span className="quick-count">{items.length}</span>
        </button>
      ) : (
        <div className="quick-heading">
          <span className="section-label">{title}</span>
          <span className="quick-count">{items.length}</span>
        </div>
      )}
      {visible && items.length === 0 ? (
        <p>{emptyLabel}</p>
      ) : null}
      {visible && items.length > 0 ? (
        <div className="quick-list">
          {items.map((item) => (
            <button
              className="quick-item"
              key={item.path}
              onClick={() => onOpen(item)}
              type="button"
            >
              <span>{item.title ?? item.name}</span>
              <small>{item.path}</small>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
