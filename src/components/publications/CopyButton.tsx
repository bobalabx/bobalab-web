"use client";
/**
 * "Copy" for a citation (brief §D8, §G1 4.1.3): copies the text of the element
 * with `targetId` and announces "Copied" through a polite live region. If the
 * Clipboard API is unavailable or refused, it selects the text instead and
 * says how to copy it. Without JavaScript the button stays hidden and the text
 * remains selectable (the fallback).
 *
 * D-13: a plain underlined text button ("Copy"), no icon. Its accessible name
 * says what it copies ("Copy BibTeX").
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

type Status = "idle" | "copied" | "selected";

export function CopyButton({ targetId, what = "BibTeX" }: { targetId: string; what?: string }) {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const settle = (s: Status) => {
    setStatus(s);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 4000);
  };

  const onClick = async () => {
    const el = document.getElementById(targetId);
    const text = el?.textContent ?? "";
    if (!text) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      settle("copied");
    } catch {
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      settle("selected");
    }
  };

  return (
    <>
      <button
        type="button"
        className="pub-copy"
        hidden={!isClient}
        onClick={onClick}
        data-status={status}
      >
        {status === "copied" ? "Copied" : "Copy"}
        <span className="vh"> {what}</span>
      </button>
      <span className="vh" role="status" aria-live="polite" aria-atomic="true">
        {status === "copied"
          ? "Copied"
          : status === "selected"
            ? "Selected. Press Control C, or Command C on a Mac, to copy."
            : ""}
      </span>
    </>
  );
}
