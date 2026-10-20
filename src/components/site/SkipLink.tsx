/** First focusable element on every page; targets <main id="main" tabIndex={-1}> in the root layout. */
export function SkipLink({ target = "main" }: { target?: string }) {
  return (
    <a className="bl-skip" href={`#${target}`}>
      Skip to main content
    </a>
  );
}
