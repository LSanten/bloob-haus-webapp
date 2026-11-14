/**
 * The `license:` setting (scripts/utils/license.js): the common ways people write a Creative
 * Commons license all map to one plain name and the canonical creativecommons.org URL; anything
 * else is kept as written, with no link.
 */
import { describe, it, expect } from "vitest";
import { parseLicense, pageLicense, isNoLicense } from "../../scripts/utils/license.js";

const BY_NC_SA = { name: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/", known: true };
const CC0 = { name: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/", known: true };

describe("parseLicense: Creative Commons, written the usual ways", () => {
  for (const written of [
    "CC BY-NC-SA 4.0",
    "CC-BY-NC-SA-4.0",
    "cc by-nc-sa 4.0",
    "CC BY NC SA 4.0",
    "  CC BY-NC-SA 4.0  ",
    "Creative Commons BY-NC-SA 4.0",
    "Attribution-NonCommercial-ShareAlike 4.0 International",
    "CC BY-NC-SA 4.0 International",
    "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "http://creativecommons.org/licenses/by-nc-sa/4.0",
    "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en",
  ]) {
    it(`reads "${written}"`, () => {
      expect(parseLicense(written)).toEqual(BY_NC_SA);
    });
  }

  it("puts the parts in Creative Commons' own order", () => {
    expect(parseLicense("CC BY-SA-NC 4.0")).toEqual(BY_NC_SA);
  });

  it("knows all six licenses", () => {
    expect(parseLicense("CC BY 4.0").url).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(parseLicense("CC BY-SA 4.0").name).toBe("CC BY-SA 4.0");
    expect(parseLicense("CC BY-ND 4.0").name).toBe("CC BY-ND 4.0");
    expect(parseLicense("CC BY-NC 4.0").name).toBe("CC BY-NC 4.0");
    expect(parseLicense("CC BY-NC-ND 4.0").url).toBe("https://creativecommons.org/licenses/by-nc-nd/4.0/");
    expect(parseLicense("Creative Commons Attribution-NoDerivatives 4.0 International License").name).toBe("CC BY-ND 4.0");
  });

  it("keeps an older version", () => {
    expect(parseLicense("CC BY-SA 3.0")).toEqual({
      name: "CC BY-SA 3.0",
      url: "https://creativecommons.org/licenses/by-sa/3.0/",
      known: true,
    });
    expect(parseLicense("CC BY 2.5").url).toBe("https://creativecommons.org/licenses/by/2.5/");
  });

  it("takes the current version (4.0) when none is written", () => {
    expect(parseLicense("CC BY-NC-SA")).toEqual(BY_NC_SA);
  });

  it("reads CC0", () => {
    for (const written of ["CC0", "cc0", "CC0 1.0", "CC0-1.0", "CC0 1.0 Universal", "CC 0", "Creative Commons Zero",
      "https://creativecommons.org/publicdomain/zero/1.0/"]) {
      expect(parseLicense(written), written).toEqual(CC0);
    }
  });
});

describe("parseLicense: anything else is kept as written, with no link", () => {
  for (const written of [
    "All rights reserved",
    "MIT",
    "Public domain",
    "CC BY-SA-ND 4.0", // SA and ND can't go together
    "CC NC-SA 4.0", // every CC license but CC0 has BY
    "CC BY 1.0", // 1.0 named its licenses differently
    "BY-NC-SA 4.0", // without "CC" it could mean anything
    "CC BY-NC-SA 4.0 and 3.0",
  ]) {
    it(`keeps "${written}"`, () => {
      expect(parseLicense(written)).toEqual({ name: written, url: null, known: false });
    });
  }
});

describe("parseLicense: nothing set", () => {
  it("is null when empty, missing, or none", () => {
    for (const raw of [undefined, null, "", "   ", "none", "None", "no", "off", false]) {
      expect(parseLicense(raw)).toBeNull();
    }
  });

  it("is null for a value that is not text", () => {
    expect(parseLicense({ name: "x" })).toBeNull();
    expect(parseLicense(["CC BY 4.0"])).toBeNull();
  });
});

describe("pageLicense: a note's own license wins over the site's", () => {
  const site = BY_NC_SA;

  it("uses the site's when the note has none", () => {
    expect(pageLicense(undefined, site)).toBe(site);
    expect(pageLicense("", site)).toBe(site);
    expect(pageLicense(null, site)).toBe(site);
  });

  it("uses the note's own when it has one", () => {
    expect(pageLicense("CC0", site)).toEqual(CC0);
    expect(pageLicense("All rights reserved", site)).toEqual({ name: "All rights reserved", url: null, known: false });
  });

  it("takes the license away with `license: none`", () => {
    expect(pageLicense("none", site)).toBeNull();
    expect(pageLicense(false, site)).toBeNull();
  });

  it("is null when neither has one", () => {
    expect(pageLicense(undefined, null)).toBeNull();
  });
});

describe("isNoLicense", () => {
  it("is true only for an explicit none", () => {
    expect(isNoLicense("none")).toBe(true);
    expect(isNoLicense(false)).toBe(true);
    expect(isNoLicense(undefined)).toBe(false);
    expect(isNoLicense("CC0")).toBe(false);
  });
});
