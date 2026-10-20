import type { ReactNode, ElementType } from "react";

/** Text for assistive technology only. */
export function VisuallyHidden({
  children,
  as: Tag = "span",
}: {
  children: ReactNode;
  as?: ElementType;
}) {
  return <Tag className="vh">{children}</Tag>;
}
