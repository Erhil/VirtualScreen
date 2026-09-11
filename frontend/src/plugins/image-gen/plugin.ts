import type { PluginTool } from "../../lib/pluginTypes";
import { ImageGenTool } from "./ImageGenTool";

export const imageGenTool: PluginTool = {
  id: "image-gen",
  icon: "🎨",
  title: () => "Image Generation",
  Panel: ImageGenTool
};
