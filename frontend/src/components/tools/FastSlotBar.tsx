import { type Translator } from "../../lang";
import { type FastSlot } from "../../lib/api";
import { fastSlotSummary } from "../../lib/fastSlots";

export function FastSlotBar({
  slots,
  t,
  onTrigger
}: {
  slots: FastSlot[];
  t: Translator;
  onTrigger: (slot: FastSlot) => void;
}) {
  const slotByPosition = new Map(slots.map((slot) => [slot.position, slot]));

  return (
    <nav className="fast-slot-bar" aria-label={t("fastSlots.title")}>
      {Array.from({ length: 10 }, (_, index) => index + 1).map((position) => {
        const slot = slotByPosition.get(position);
        const keyLabel = position === 10 ? "0" : String(position);
        return (
          <button
            aria-label={
              slot
                ? t("fastSlots.slot", { position: keyLabel, label: slot.label })
                : t("fastSlots.slotEmpty", { position: keyLabel })
            }
            className={`fast-slot${slot ? " fast-slot-assigned" : ""}`}
            disabled={!slot}
            key={position}
            onClick={() => slot && onTrigger(slot)}
            title={slot ? fastSlotSummary(slot) : `Alt+${position === 10 ? 0 : position}`}
            type="button"
          >
            <span>{keyLabel}</span>
            <strong>{slot?.icon ?? slot?.label ?? t("fastSlots.empty")}</strong>
          </button>
        );
      })}
    </nav>
  );
}
