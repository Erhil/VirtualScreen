import { useEffect, type ReactNode } from "react";
import { useStableHandler } from "../hooks/useStableHandler";

export function Modal({
  ariaLabel,
  title,
  closeLabel,
  onClose,
  children,
  className,
  dataHelpContext,
  dismissOnBackdrop = false,
  closeOnEscape = false
}: {
  ariaLabel: string;
  title: ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  dataHelpContext?: string;
  dismissOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}) {
  const stableOnClose = useStableHandler(onClose);

  useEffect(() => {
    if (!closeOnEscape) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        stableOnClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, stableOnClose]);

  return (
    <div
      className="dialog-overlay"
      onMouseDown={dismissOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <section
        aria-label={ariaLabel}
        className={className ? `file-dialog ${className}` : "file-dialog"}
        data-help-context={dataHelpContext}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{title}</h2>
          <button aria-label={closeLabel} onClick={onClose} type="button">
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
