import { createCustomWallet } from "@/internal/custom/type";
import { runOnce } from "@/internal/utils/run-once";

export const nufiSnap = createCustomWallet({
  initialize: runOnce(async () => {
    console.log("nufi snap init");
    return true;
  }),
});
