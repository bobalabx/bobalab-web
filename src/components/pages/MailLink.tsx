/**
 * The lab's contact address as a real mailto: link (brief §D11: one contact
 * email throughout, as a link). The address always comes from content
 * (site.yml → email); components never hard-code it.
 */
import { Icon } from "@/components/ui/icons";
import "./pages.css";

export function mailtoHref(email: string, subject?: string): string {
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

/** True when Markdown already links the address (so a separate contact link would repeat it). */
export function linksEmail(markdown: string | undefined | null, email: string): boolean {
  if (!markdown) return false;
  return markdown.toLowerCase().includes(`mailto:${email.toLowerCase()}`);
}

export function MailLink({
  email,
  subject,
  label,
  className,
}: {
  email: string;
  subject?: string;
  /** Visible text before the address, e.g. "Email". The address is always shown. */
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={mailtoHref(email, subject)}
      className={["pg-mail", className].filter(Boolean).join(" ")}
    >
      <Icon name="mail" />
      <span>
        {label ? `${label} ` : null}
        {email}
      </span>
    </a>
  );
}
