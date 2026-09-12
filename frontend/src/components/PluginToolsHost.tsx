import { useState } from "react";

import type { Translator } from "../lang";
import type { PluginTool } from "../lib/pluginTypes";
import { imageGenTool } from "../plugins/image-gen/plugin";
import { Modal } from "./Modal";

const PLUGIN_TOOLS: PluginTool[] = [imageGenTool];

export function PluginToolsHost({
  worldId,
  t
}: {
  worldId: string | null;
  t: Translator;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openTool = PLUGIN_TOOLS.find((tool) => tool.id === openId) ?? null;

  return (
    <>
      <div className="plugin-dock">
        {PLUGIN_TOOLS.map((tool) => {
          const title = tool.title(t);
          return (
            <button
              aria-label={title}
              className="plugin-dock-button"
              key={tool.id}
              onClick={() => setOpenId(tool.id)}
              title={title}
              type="button"
            >
              {tool.icon}
            </button>
          );
        })}
      </div>
      {openTool ? (
        <Modal
          ariaLabel={openTool.title(t)}
          closeLabel={t("app.close")}
          closeOnEscape
          onClose={() => setOpenId(null)}
          title={openTool.title(t)}
        >
          <openTool.Panel t={t} worldId={worldId} />
        </Modal>
      ) : null}
    </>
  );
}
