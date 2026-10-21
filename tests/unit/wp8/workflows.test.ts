/**
 * WP8: invariants of the GitHub Actions workflows that no local run exercises.
 *
 *   - every `uses:` is pinned by a full commit SHA (brief §G4);
 *   - the jobs that build pages check out full (blobless) history: direction
 *     pages date themselves from `git log -1 -- <their content files>`
 *     (§D5.11, src/components/direction/lastUpdated.ts), and in a depth-1
 *     clone that returns the HEAD commit for every file;
 *   - record-slugs, the one job with a write-scoped token, never stores the
 *     token in .git/config and runs no npm install scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DIR = path.join(ROOT, ".github/workflows");

interface Step {
  uses?: string;
  run?: string;
  name?: string;
  with?: Record<string, unknown>;
}
interface Job {
  steps: Step[];
  permissions?: Record<string, string>;
}
interface Workflow {
  jobs: Record<string, Job>;
}

const load = (file: string) =>
  YAML.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as Workflow;
const checkout = (job: Job) => job.steps.find((s) => s.uses?.startsWith("actions/checkout@"));

describe("workflows", () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".yml"));

  it("pin every action by full commit SHA", () => {
    const loose: string[] = [];
    for (const f of files) {
      for (const [name, job] of Object.entries(load(f).jobs)) {
        for (const s of job.steps ?? []) {
          if (s.uses && !/@[0-9a-f]{40}$/.test(s.uses)) loose.push(`${f} ${name}: ${s.uses}`);
        }
      }
    }
    expect(loose).toEqual([]);
  });

  it.each([
    ["deploy.yml", "build"],
    ["ci.yml", "build"],
  ])("%s %s checks out full blobless history (direction Last updated)", (file, name) => {
    const job = load(file).jobs[name]!;
    const co = checkout(job);
    expect(co?.with?.["fetch-depth"]).toBe(0);
    expect(co?.with?.filter).toBe("blob:none");
  });

  it("deploy.yml fails the build if the checkout is shallow anyway", () => {
    const { steps } = load("deploy.yml").jobs.build!;
    const guard = steps.findIndex((s) => s.run?.includes("--is-shallow-repository"));
    const build = steps.findIndex((s) => s.run === "npm run build");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(build);
  });

  it("no job that can write keeps the token in .git/config or runs install scripts", () => {
    const problems: string[] = [];
    for (const f of files) {
      for (const [name, job] of Object.entries(load(f).jobs)) {
        const co = checkout(job);
        if (co && co.with?.["persist-credentials"] !== false) {
          problems.push(`${f} ${name}: checkout persists credentials`);
        }
        const writes = Object.entries(job.permissions ?? {}).some(
          ([k, v]) => v === "write" && k !== "id-token" && k !== "pages" && k !== "issues",
        );
        if (!writes) continue;
        for (const s of job.steps) {
          if (s.run && /\bnpm (ci|install)\b/.test(s.run) && !s.run.includes("--ignore-scripts")) {
            problems.push(`${f} ${name}: "${s.run.trim()}" runs install scripts`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("record-slugs passes the token only to the push", () => {
    const job = load("deploy.yml").jobs["record-slugs"]!;
    const pr = job.steps.find((s) => s.run?.includes("git push"))!;
    expect(pr.run).toMatch(
      /git push --force "https:\/\/x-access-token:\$\{GH_TOKEN\}@github\.com\//,
    );
    expect(pr.run).not.toMatch(/git push[^\n]* origin /);
  });
});
