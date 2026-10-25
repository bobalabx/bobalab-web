"use client";
/**
 * Reader-triggered step-through of a study-design plate (D-13 item 6; P3
 * site.js "Plates"). Finite: one click per step, N steps, then "Start again".
 * Each step dims what has not happened yet (opacity) and moves only what the
 * step explains (transform), announced in a polite live note.
 *
 * At rest (data-at="0"), without JavaScript and under reduced motion the
 * whole design is shown: the buttons stay hidden (no-JS: `hidden` until
 * hydrated; reduced motion: plates.css hides them and every step rule sits
 * inside the motion gate).
 */
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";

const noopSubscribe = () => () => {};

function StepText({ k, n, text }: { k: number; n: number; text: string }) {
  return (
    <>
      <b>
        Step {k} of {n}.
      </b>{" "}
      {text}
    </>
  );
}

export function PlateStepper({
  heading,
  aside,
  steps,
  children,
}: {
  heading: ReactNode;
  /** Muted note beside the heading (e.g. "pending author check" in preview builds). */
  aside?: ReactNode;
  /** One sentence per step, in order. */
  steps: string[];
  children: ReactNode;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const stepBtn = useRef<HTMLButtonElement>(null);
  const n = steps.length;

  const go = (k: number) => {
    flushSync(() => setAt(k));
    const el = box.current;
    if (k === 1 && el) {
      // The orders arrive: start them just off to the left, then let them
      // transition in (the class is removed after one forced style pass).
      el.classList.add("pl--pre");
      void el.offsetWidth;
      el.classList.remove("pl--pre");
    }
  };

  return (
    <>
      <div className="plate-bar">
        {heading}
        {aside}
        {/* The note's slot is as tall as the longest step while stepping
            (invisible copies of every step share its grid cell), so moving
            between steps never shifts the plate at any width. At rest it is
            empty and takes no room. */}
        <div className="plate-slot">
          <p className="plate-note" aria-live="polite">
            {at > 0 && <StepText k={at} n={n} text={steps[at - 1]!} />}
          </p>
          {at > 0 &&
            steps.map((s, i) => (
              <p key={i} className="plate-ghost" aria-hidden="true">
                <StepText k={i + 1} n={n} text={s} />
              </p>
            ))}
        </div>
        <span className="plate-btns">
          <button
            ref={stepBtn}
            type="button"
            className="plate-btn plate-btn--step"
            hidden={!hydrated}
            onClick={() => go((at % n) + 1)}
          >
            {at === 0 ? "Step through the design" : at < n ? "Next step" : "Start again"}
          </button>
          <button
            type="button"
            className="plate-btn plate-btn--all"
            hidden={!hydrated || at === 0}
            onClick={() => {
              go(0);
              stepBtn.current?.focus();
            }}
          >
            Show all steps
          </button>
        </span>
      </div>
      <div ref={box} className="pl" data-at={at}>
        {children}
      </div>
    </>
  );
}
