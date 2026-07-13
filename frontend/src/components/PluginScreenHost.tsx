import { Fragment } from "react";

import { usePlugins } from "../lib/pluginRegistry";
import type { PluginScreen, VsPlugin } from "../lib/pluginTypes";

export function PluginScreenHost() {
  const plugins = usePlugins();
  const screens = plugins.filter(
    (p): p is VsPlugin & { screen: PluginScreen } => Boolean(p.screen)
  );

  if (screens.length === 0) {
    return null;
  }

  return (
    <Fragment>
      {screens.map((p) => {
        const Layer = p.screen.Layer;
        return <Layer key={p.id} />;
      })}
    </Fragment>
  );
}
