import { load as loadEnv } from "loadenv";
import { getProcessedEnvs } from "shared/utils/main.ts";
import { System } from "modules/system/main.ts";

// Use "production" to avoid development mode port multiplication
const envs = getProcessedEnvs({
  version: "production",
  //@ts-ignore
  upgrade: false,
});

await loadEnv();
System.load(envs);
