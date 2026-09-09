import { existsSync } from "node:fs";

if (
  process.env.HUSKY === "0" ||
  process.env.CI ||
  process.env.NODE_ENV === "production" ||
  process.env.npm_config_omit?.split(/\s+/).includes("dev") ||
  !existsSync(".git")
) {
  process.exit(0);
}

const { default: husky } = await import("husky");
const error = husky();

if (error) {
  throw new Error(error);
}
