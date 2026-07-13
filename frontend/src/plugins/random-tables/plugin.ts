import { definePlugin } from "../../lib/pluginTypes";
import { RandomTablesTool } from "./RandomTablesTool";

export default definePlugin({
  id: "random-tables",
  name: "Random Tables",
  tool: { icon: "🎲", title: () => "Random Tables", Panel: RandomTablesTool }
});
