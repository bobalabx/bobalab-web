import { serializeJsonLd } from "@/lib/seo/jsonld";

/** JSON-LD script; "<" is escaped so content can never close the tag. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
