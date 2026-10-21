/**
 * Person avatar (brief §D9 "Card"): the photo only when the person consented
 * (the loader removes `photo` unless `photo_consent: true`), otherwise a
 * pearl-initial avatar in a deterministic swatch colour (model.avatarSwatch).
 * Decorative in both cases next to the name, except that a consented photo
 * keeps its editor-written alt text.
 */
import type { CSSProperties } from "react";
import type { PublicPerson } from "@/lib/content/people";
import type { SwatchId } from "@/lib/content/palette";
import { Pearl } from "@/components/ui/Pearl";
import { Img } from "@/components/ui/Img";

export type AvatarSize = "row" | "card" | "profile";

const PX: Record<AvatarSize, number> = { row: 44, card: 64, profile: 112 };

export function PersonAvatar({
  person,
  swatch,
  initials,
  size = "card",
}: {
  person: Pick<PublicPerson, "photo" | "photo_alt">;
  swatch: SwatchId;
  initials: string;
  size?: AvatarSize;
}) {
  const px = PX[size];
  if (person.photo) {
    return (
      <Img
        src={person.photo}
        alt={person.photo_alt ?? ""}
        width={px}
        height={px}
        sizes={`${px}px`}
        className={`pp-avatar pp-avatar--${size}`}
      />
    );
  }
  return (
    <Pearl
      size={size === "row" ? "row" : "avatar"}
      initials={initials}
      swatch={swatch}
      className={`pp-avatar pp-avatar--${size}`}
      style={size === "profile" ? ({ "--pd": `${px}px` } as CSSProperties) : undefined}
    />
  );
}
