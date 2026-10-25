/**
 * Person avatar (brief §D9; D-13 item 5): a SQUARE photo, only when the person
 * consented (the loader removes `photo` unless `photo_consent: true`),
 * otherwise a square initials tile (Pearl with `initials`). Decorative in both
 * cases next to the name, except that a consented photo keeps its
 * editor-written alt text. No circles, halos or rounded corners.
 *   card: 64 px (member rows); lead and profile: 160 px (the PI on /people/,
 *   person pages), 120 px on phones. Sizes are set in people.css.
 */
import type { PublicPerson } from "@/lib/content/people";
import type { SwatchId } from "@/lib/content/palette";
import { Pearl } from "@/components/ui/Pearl";
import { Img } from "@/components/ui/Img";

export type AvatarSize = "card" | "lead" | "profile";

const PX: Record<AvatarSize, number> = { card: 64, lead: 160, profile: 160 };

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
      size="avatar"
      initials={initials}
      swatch={swatch}
      className={`pp-avatar pp-avatar--${size}`}
    />
  );
}
