import { type Translator } from "../../lang";
import { type OpenTab } from "../../lib/tabs";
import { IconButton } from "../IconButton";

export function TabStrip({ tabs, activePath, dirtyPaths, onActivate, onClose, t }: {
  tabs: OpenTab[];
  activePath: string | null;
  dirtyPaths: ReadonlySet<string>;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
  t: Translator;
}) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="tab-strip" role="tablist" aria-label={t("workspace.openFiles")}>
      {tabs.map((tab) => {
        const dirty = dirtyPaths.has(tab.path);
        return (
          <div
            className="tab-shell"
            key={tab.path}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                event.stopPropagation();
                onClose(tab.path);
              }
            }}
            onMouseDown={(event) => {
              if (event.button === 1) {
                event.preventDefault();
              }
            }}
          >
            <button
              aria-selected={tab.path === activePath}
              className="tab-button"
              onClick={() => onActivate(tab.path)}
              role="tab"
              type="button"
            >
              {tab.title ?? tab.name}
              {dirty ? " *" : ""}
            </button>
            <IconButton
              className="close-tab"
              label={t("workspace.closeTab", { name: tab.name })}
              name="close"
              onClick={() => onClose(tab.path)}
            />
          </div>
        );
      })}
      <span className="tab-strip-count">{t("workspace.openFileCount", { count: tabs.length })}</span>
    </div>
  );
}
