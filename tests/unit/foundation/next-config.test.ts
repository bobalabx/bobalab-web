/**
 * next.config.ts: the static export never carries rewrites or redirects, and
 * `next dev` answers the site.yml redirects (D-05) itself, so an old /people/
 * link (now /#people, D-21) also works in the local preview and the local demo.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { afterEach, describe, expect, it, vi } from "vitest";

type Cfg = {
  output?: string;
  rewrites?: () => Promise<unknown>;
  redirects?: () => Promise<Array<{ source: string; destination: string; permanent: boolean }>>;
};

async function load(env: string): Promise<Cfg> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  return (await import("../../../next.config")).default as Cfg;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("next.config.ts", () => {
  it("builds (production) have no rewrites and no redirects: a static export cannot use them", async () => {
    const c = await load("production");
    expect(c.output).toBe("export");
    expect(c.rewrites).toBeUndefined();
    expect(c.redirects).toBeUndefined();
  });

  it("next dev redirects every site.yml redirect, /people/ → /#people included (307)", async () => {
    const c = await load("development");
    const site = YAML.parse(fs.readFileSync(path.resolve("content", "site.yml"), "utf8")) as {
      redirects?: Array<{ from: string; to: string }>;
    };
    expect(site.redirects).toContainEqual({ from: "/people/", to: "/#people" });
    const got = await c.redirects!();
    for (const r of site.redirects ?? [])
      for (const source of [r.from, `${r.from}index.html`])
        expect(got).toContainEqual({ source, destination: r.to, permanent: false });
    expect(got).toHaveLength(2 * (site.redirects ?? []).length);
  });

  it("a missing or broken site.yml gives no redirects instead of stopping next dev", async () => {
    vi.stubEnv("CONTENT_DIR", "tests/does-not-exist");
    const c = await load("development");
    expect(await c.redirects!()).toEqual([]);
  });
});
