import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const rspackPath = require.resolve("@rspack/core");
const { normalizeUrl } = (await import(path.join(rspackPath, '../cssExtractHmr.js')));
const dataUrls = require("./fixtures/json/data-urls.json");

describe("normalize-url", () => {
	dataUrls.main.forEach(entry => {
		const [url, expected] = entry;

		it(`should work with "${url}" url`, async () => {
			const result = normalizeUrl(url);

			expect(result).toBe(expected);
		});
	});
});
