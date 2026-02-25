import { defineConfig, type ProjectConfig } from "@rstest/core";

const commonProjectConfig: ProjectConfig = {
  globals: true,
  testTimeout: process.env.CI ? 60000 : 30000,
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
  env: {
    UPDATE_SNAPSHOT:
      process.argv.includes("-u") || process.argv.includes("--updateSnapshot")
        ? "true"
        : undefined,
  },
};

export default defineConfig({
  projects: [
    {
      extends: commonProjectConfig,
      name: "node",
      include: ["**/*.test.js", "**/*.test.mjs", "**/*.test.ts"],
      exclude: ["**/css-extract/HMR.test.js"],
      testEnvironment: "node",
    },
    {
      extends: commonProjectConfig,
      name: "jsdom",
      include: ["**/css-extract/HMR.test.js"],
      testEnvironment: "jsdom",
    },
  ],
});
