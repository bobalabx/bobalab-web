/**
 * Study-design plate: Bastani, Bastani & Sinchaisri (2026), "Improving Human
 * Sequential Decision Making with Reinforcement Learning", Management Science
 * 72(1). Ported from docs/redesign/prototypes/p3/paper.html with the judge's
 * changes (docs/redesign/prototypes/JUDGE.md §6, item 7):
 *   - P1's panel lettering (a, b, c) and P1's panel (b) encoding: the length
 *     of each round's glyph IS the optimal finish time (20 or 34 ticks), which
 *     replaces P3's separate tick axis;
 *   - every label is HTML text (it never shrinks with the drawing); only the
 *     strokes and pearls are SVG, including the experiment's arm lines.
 *
 * DESIGN FACTS ONLY, all from the paper's description of the experiment
 * (arXiv:2108.08454 v5; DIRECTION.md C.3; checked in JUDGE.md §4):
 *   3 workers (chef, sous-chef, server); 4 burger orders per round, each three
 *   subtasks in a fixed order (chop, cook, plate), so 12 subtasks; a worker's
 *   speed on a task is revealed only after assignment; time runs in ticks;
 *   optimal finish 20 ticks fully staffed and 34 without the chef; normal
 *   configuration = 3 full rounds, disrupted = 2 full + 4 understaffed;
 *   Phase I without tips, then Phase II randomised into 4 arms; a tip is one
 *   if-then rule. No assignment schedule and no result is drawn.
 *
 * `data-k` marks the step of the step-through each element belongs to
 * (see PlateStepper and plates.css): 1 orders arrive, 2 they split and the
 * precedence arrows grow, 3 the chef leaves, 4 the Phase II arms grow from R.
 * "3o" is shown only before step 3 (the chef still on the line), "3x" from
 * step 3 and at rest.
 */
import type { CSSProperties } from "react";

/* Panel a geometry (user units): three subtask pearls per order. */
const PEARL_X = [35, 105, 175] as const;
const ORDERS = [1, 2, 3, 4] as const;
const WORKERS = ["Chef", "Sous-chef", "Server"] as const;

/* Panel b: line length = optimal finish time, 1.8 user units per tick. */
const TICK = 1.8;
const GAP = 8;
const FULL = 20 * TICK; // 36
const SHORT = 34 * TICK; // 61.2

type Round = { x: number; len: number; chef: boolean; k: string };

function rounds(spec: Array<{ len: number; chef: boolean; k: string }>): Round[] {
  let x = 0;
  return spec.map((r) => {
    const out = { ...r, x };
    x += r.len + GAP;
    return out;
  });
}

const NORMAL = rounds([
  { len: FULL, chef: true, k: "1" },
  { len: FULL, chef: true, k: "1" },
  { len: FULL, chef: true, k: "1" },
]);
const DISRUPTED = rounds([
  { len: FULL, chef: true, k: "1" },
  { len: FULL, chef: true, k: "1" },
  { len: SHORT, chef: false, k: "3" },
  { len: SHORT, chef: false, k: "3" },
  { len: SHORT, chef: false, k: "3" },
  { len: SHORT, chef: false, k: "3" },
]);

/** One round: three lines, one per worker, chef on top; a dotted top line when the chef is gone. */
function Glyph({ r }: { r: Round }) {
  return (
    <g data-k={r.k}>
      <path className={r.chef ? "pl-lane" : "pl-lane pl-lane--off"} d={`M${r.x} 3h${r.len}`} />
      <path className="pl-lane" d={`M${r.x} 11h${r.len}M${r.x} 19h${r.len}`} />
    </g>
  );
}

/**
 * One key entry: a line drawn at the glyphs' scale (its length is the time),
 * in a mark column as wide as the longest line, so every label starts at the
 * same x.
 */
function KeyLine({ len, k, children }: { len: number; k?: string; children: string }) {
  return (
    <p className="pl-key" data-k={k}>
      <span className="pl-key__mark" style={{ width: `calc(100% * ${SHORT} / 360)` }}>
        <svg
          viewBox={`0 0 ${len} 6`}
          style={{ width: `calc(100% * ${len} / ${SHORT})` }}
          aria-hidden="true"
          focusable="false"
        >
          <path className="pl-lane" d={`M0 3h${len}`} />
        </svg>
      </span>
      <span>{children}</span>
    </p>
  );
}

export function BastaniPlate() {
  return (
    <>
      <div className="pl-row">
        {/* (a) One round of the task */}
        <div className="pl-cell">
          <h3 className="pl-h">
            <span className="pl-l">a</span> One round: four orders, three workers
          </h3>
          <p className="pl-t">
            Each burger order is three subtasks in a fixed order: chop, cook, plate. The player
            assigns every subtask to a worker.
          </p>
          <div
            className="pl-orders"
            role="img"
            aria-label="Four orders, each drawn as three linked subtasks: chop, then cook, then plate. Twelve subtasks in all."
          >
            <div className="pl-ohead" aria-hidden="true">
              <span />
              <span>chop</span>
              <span>cook</span>
              <span>plate</span>
            </div>
            {ORDERS.map((o, i) => (
              <div
                key={o}
                className="pl-orow"
                data-k="1"
                style={{ transitionDelay: `${i * 70}ms` }}
                aria-hidden="true"
              >
                <span className="pl-olab">Order {o}</span>
                <svg viewBox="0 0 210 24" focusable="false">
                  <g className="pl-grow" data-k="2">
                    <path className="pl-pk" d="M47 12H88" />
                    <path className="pl-ah" d="M94 12l-7 -4v8z" />
                  </g>
                  <g className="pl-grow" data-k="2">
                    <path className="pl-pk" d="M117 12H158" />
                    <path className="pl-ah" d="M164 12l-7 -4v8z" />
                  </g>
                  {PEARL_X.map((x) => (
                    <circle
                      key={x}
                      className="pl-pe pl-sp"
                      cx={x}
                      cy={12}
                      r={9}
                      style={{ "--dx": `${PEARL_X[0] - x}px` } as CSSProperties}
                    />
                  ))}
                </svg>
              </div>
            ))}
          </div>

          <div
            className="pl-lanes"
            role="img"
            aria-label="Three worker lanes, chef, sous-chef and server, along time in ticks, drawn empty: no schedule. In the disrupted configuration the chef leaves."
          >
            {WORKERS.map((w) => (
              <div key={w} className="pl-lrow" aria-hidden="true">
                <span className="pl-llab">{w}</span>
                <span className="pl-ltrack">
                  {w === "Chef" ? (
                    <>
                      <svg viewBox="0 0 100 6" preserveAspectRatio="none" focusable="false">
                        <path className="pl-lane" data-k="3o" d="M0 3H100" />
                        <path className="pl-lane pl-lane--off" data-k="3x" d="M0 3H100" />
                      </svg>
                      <span className="pl-gone" data-k="3x">
                        leaves in the disrupted configuration
                      </span>
                    </>
                  ) : (
                    <svg viewBox="0 0 100 6" preserveAspectRatio="none" focusable="false">
                      <path className="pl-lane" d="M0 3H100" />
                    </svg>
                  )}
                </span>
              </div>
            ))}
            <div className="pl-lrow pl-axis" aria-hidden="true">
              <span />
              <span className="pl-ltrack">
                <svg viewBox="0 0 100 6" preserveAspectRatio="none" focusable="false">
                  <path className="pl-tick" d="M0 3H100" />
                </svg>
                <span className="pl-axlab">time, in ticks</span>
              </span>
            </div>
          </div>
          <p className="pl-t">
            A worker&rsquo;s speed varies by task and is revealed only after assignment.
          </p>
        </div>

        {/* (b) Two configurations: line length = optimal finish */}
        <div className="pl-cell">
          <h3 className="pl-h">
            <span className="pl-l">b</span> Two configurations
          </h3>
          <p className="pl-t">
            Each glyph is one round, one line per worker with the chef on top. Its length is the
            optimal finish time.
          </p>
          <div
            className="pl-conf"
            role="img"
            aria-label="Normal configuration: three fully staffed rounds of 20 ticks each. Disrupted configuration: two full rounds, then four rounds without the chef of 34 ticks each."
          >
            <p className="pl-cl" aria-hidden="true">
              <b>Normal</b> 3 full rounds
            </p>
            <svg viewBox="0 0 360 22" aria-hidden="true" focusable="false">
              {NORMAL.map((r, i) => (
                <Glyph key={i} r={r} />
              ))}
            </svg>
            <p className="pl-cl" aria-hidden="true">
              <b>Disrupted</b> 2 full rounds, then 4 without the chef
            </p>
            <svg viewBox="0 0 360 22" aria-hidden="true" focusable="false">
              {DISRUPTED.map((r, i) => (
                <Glyph key={i} r={r} />
              ))}
            </svg>
            <p className="pl-t pl-t--order" aria-hidden="true">
              Rounds in order of play, left to right.
            </p>
            <div className="pl-keys" aria-hidden="true">
              <KeyLine len={FULL}>20 ticks: optimal finish, fully staffed</KeyLine>
              <KeyLine len={SHORT} k="3">
                34 ticks: optimal finish without the chef
              </KeyLine>
            </div>
          </div>
          <p className="pl-t">A dotted top line: the chef has left.</p>
        </div>
      </div>

      {/* (c) The experiment */}
      <div className="pl-row">
        <div className="pl-cell pl-wide">
          <h3 className="pl-h">
            <span className="pl-l">c</span> The experiment
          </h3>
          <div className="pl-flow">
            <div className="pl-ph" data-k="4">
              <p>
                <b>Phase I</b> No tips. People play and their decisions are logged as trace data.
                From these logs the algorithm learns a tip: one if-then rule.
              </p>
              <svg
                viewBox="0 0 100 4"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path className="pl-arm" d="M0 2H100" />
              </svg>
            </div>
            <div className="pl-rnode" data-k="4" aria-hidden="true">
              <svg className="pl-rnode__h" viewBox="0 0 14 4" focusable="false">
                <path className="pl-arm" d="M0 2H14" />
              </svg>
              <svg className="pl-rnode__v" viewBox="0 0 4 14" focusable="false">
                <path className="pl-arm" d="M2 0V14" />
              </svg>
              <span className="pl-rrow">
                <span className="pl-r">R</span>
                <span className="pl-p2h pl-p2h--m">
                  <b>Phase II</b>, randomised into four arms
                </span>
              </span>
              <svg className="pl-rnode__v" viewBox="0 0 4 14" focusable="false">
                <path className="pl-arm" d="M2 0V14" />
              </svg>
              <svg className="pl-rnode__h" viewBox="0 0 20 4" focusable="false">
                <path className="pl-arm" d="M0 2H20" />
              </svg>
            </div>
            <div className="pl-phase2">
              <p className="pl-p2h pl-p2h--d">
                <b>Phase II</b>, randomised into four arms
              </p>
              <div className="pl-armsbox">
                <svg
                  className="pl-trunk"
                  viewBox="0 0 2 10"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path className="pl-trunkline" d="M1 0V10" />
                </svg>
                <ul className="pl-arms">
                  {[
                    "No tip",
                    "The algorithm’s tip",
                    "The tip most chosen in Phase I",
                    "A baseline tip",
                  ].map((arm, i) => (
                    <li key={arm} style={{ "--i": i } as CSSProperties}>
                      <svg
                        className="pl-armline"
                        viewBox="0 0 56 4"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path className="pl-arm" d="M0 2H56" />
                      </svg>
                      <span>{arm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
