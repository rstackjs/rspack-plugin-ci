const path = require("path");

/** @type {import('jest').Config} */
const config = {
	testEnvironment: "./patch-node-env.cjs",
	testMatch: [
		"<rootDir>/**/*.test.js",
		"<rootDir>/**/*.test.mjs",
		"<rootDir>/**/*.test.ts"
	],
	testTimeout: process.env.CI ? 60000 : 30000,
	prettierPath: require.resolve("prettier-2"),
	cache: false,
	setupFilesAfterEnv: ["<rootDir>/setupTestEnv.cjs"],
	snapshotFormat: {
		escapeString: true,
		printBasicPrototype: true
	},
	globals: {
		updateSnapshot:
			process.argv.includes("-u") || process.argv.includes("--updateSnapshot")
	},
};

module.exports = config;
