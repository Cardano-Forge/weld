import type { WeldPlugin } from "@/internal/plugins/types";
import { eternlPlugin } from "./eternl";

export const builtinPlugins: WeldPlugin[] = [eternlPlugin];
