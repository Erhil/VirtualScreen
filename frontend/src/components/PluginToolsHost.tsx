import { useState } from "react";

import type { Translator } from "../lang";
import { usePlugins } from "../lib/pluginRegistry";
import type { PluginTool, VsPlugin } from "../lib/pluginTypes";
import { Modal } from "./Modal";

export function PluginToolsHost({
  worldId,
  t
}: {
  worldId: string | null;
  t: Translator;
}) {
  const plugins = usePlugins();
  const tools = plugins.filter(
    (p): p is VsPlugin & { tool: PluginTool } => Boolean(p.tool)
  );
  const [openId, setOpenId] = useState<string | null>(null);

  if (tools.length === 0) {
    return null;
  }

  const openPlugin = tools.find((plugin) => plugin.id === openId) ?? null;

  return (
    <>
      <div className="plugin-dock">
        {tools.map((plugin) => {
          const title = plugin.tool.title(t);
          return (
            <button
              aria-label={title}
              className="plugin-dock-button"
              key={plugin.id}
              onClick={() => setOpenId(plugin.id)}
              title={title}
              type="button"
            >
              {plugin.tool.icon ?? "\u{1F9E9}"}
            </button>
          );
        })}
      </div>
      {openPlugin
        ? (() => {
            const title = openPlugin.tool.title(t);
            const Panel = openPlugin.tool.Panel;
            return (
              <Modal
                ariaLabel={title}
                closeLabel={t("app.close")}
                onClose={() => setOpenId(null)}
                title={title}
              >
                <Panel t={t} worldId={worldId} />
              </Modal>
            );
          })()
        : null}
    </>
  );
}
