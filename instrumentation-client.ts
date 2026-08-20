import { initBotId } from "botid/client/core";
import { BOT_PROTECTED_ROUTES } from "@/lib/security/route-policy";

initBotId({
  protect: BOT_PROTECTED_ROUTES.map((route) => ({
    path: route.path,
    method: route.method,
    advancedOptions: {
      checkLevel: route.checkLevel,
    },
  })),
});
