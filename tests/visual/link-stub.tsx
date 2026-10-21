/** next/link stand-in for static fixture rendering (no router outside Next). */
import type { AnchorHTMLAttributes, ReactNode } from "react";

export default function Link(
  props: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children?: ReactNode;
    transitionTypes?: string[];
    prefetch?: boolean;
  },
) {
  const rest: AnchorHTMLAttributes<HTMLAnchorElement> & Record<string, unknown> = { ...props };
  delete rest.transitionTypes;
  delete rest.prefetch;
  delete rest.children;
  const { href, children } = props;
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
