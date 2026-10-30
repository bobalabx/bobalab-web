/** Human labels for enum values (shared by components and page packages). */
import type { NewsType, PublicationStatus, PublicationType } from "@/lib/content/schema";

export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  journal: "Journal article",
  "working-paper": "Working paper",
  conference: "Conference paper",
  chapter: "Book chapter",
  dissertation: "Dissertation",
  "work-in-progress": "Work in progress",
  other: "Other",
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  "in-progress": "Work in progress",
  "under-review": "Under review",
  "under-revision": "Under revision",
  published: "Published",
};

export const NEWS_TYPE_LABELS: Record<NewsType, string> = {
  publication: "Publication",
  award: "Award",
  talk: "Talk",
  media: "Media",
  people: "People",
  grant: "Grant",
  "lab-life": "Lab life",
};
