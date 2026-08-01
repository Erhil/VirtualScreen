import { definePlugin } from "../../lib/pluginTypes";
import { ImageGenTool } from "./ImageGenTool";

export default definePlugin({
  id: "image-gen",
  name: "Image Generation",
  tool: { icon: "🎨", title: () => "Image Generation", Panel: ImageGenTool }
});
