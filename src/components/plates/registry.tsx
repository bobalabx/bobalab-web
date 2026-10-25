/**
 * Study-design plates (DECISIONS D-13 item 8): one code component per paper,
 * keyed by publication slug. A plate shows DESIGN FACTS ONLY (never a
 * schedule or a result) and states its source. It renders only when the
 * publication's `plate_verified` is true, or in a preview build (see
 * `showStudyPlate` in src/lib/content/queries.ts), and pages use
 * `<StudyPlate>` for both checks.
 *
 * Not registered, on purpose:
 *   - deng-2025-learning-to-gig ("Learning to Gig"): the P3 draft states
 *     "jobs are offered one at a time" and "a declined job goes back to the
 *     platform", neither of which is in the content (JUDGE.md §4). It stays
 *     off until it is redrawn from the paper's model section.
 */
import type { ComponentType, ReactNode } from "react";
import { BastaniPlate } from "./BastaniPlate";

export interface PlateDef {
  /** The publication this plate belongs to. */
  slug: string;
  /** One sentence per step of the step-through, in order. */
  steps: string[];
  /** The caption after "Figure N." (what the panels show; "not data"). */
  caption: ReactNode;
  /** Where the design facts come from. */
  source: string;
  Body: ComponentType;
}

export const PLATES: Readonly<Record<string, PlateDef>> = {
  "bastani-2026-rl-tips": {
    slug: "bastani-2026-rl-tips",
    steps: [
      "Orders arrive: four burger orders per round.",
      "Each order splits into three subtasks in a fixed order, chop then cook then plate. The player assigns every subtask to a worker.",
      "The chef leaves. In the disrupted configuration four of six rounds are understaffed, and the optimal finish moves from 20 to 34 ticks.",
      "Phase II: after a first phase without tips, play is randomised into four arms.",
    ],
    caption: (
      <>
        Study design of Bastani, Bastani &amp; Sinchaisri (2026), <cite>Management Science</cite>{" "}
        72(1). (a) Players manage three virtual workers; each of the four burger orders in a round
        is three subtasks in a fixed order. (b) Line length is the optimal finish time. (c) Phase I
        has no tips; R marks random assignment into the four Phase II arms. Redrawn as a schematic
        from the paper&rsquo;s description; not data. No assignment schedule and no result is drawn.
      </>
    ),
    source: "Source: the description of the experiment in arXiv:2108.08454, version 5.",
    Body: BastaniPlate,
  },
};

export const plateFor = (slug: string): PlateDef | undefined =>
  Object.hasOwn(PLATES, slug) ? PLATES[slug] : undefined;

export const hasPlate = (slug: string): boolean => plateFor(slug) !== undefined;
