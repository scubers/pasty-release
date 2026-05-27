// Gallery attachment payload shape — shared by detector, renderers, and UI.
// kind discriminates between the 3 attachmentRenderer height shapes
// (fixed / auto / bounded). All other fields are identical across the three.

export type GalleryAttachmentKind = "fixed" | "auto" | "bounded";

export type GalleryInputKind = "text" | "image" | "path_reference";

export interface GalleryAttachmentPayload {
  kind: GalleryAttachmentKind;
  title: string;
  inputKindSeen: GalleryInputKind;
  capabilityCount: number;
  capabilitiesShown: string[];
}

export function encodeGalleryPayload(payload: GalleryAttachmentPayload): string {
  return JSON.stringify(payload);
}

export function decodeGalleryPayload(payloadJson: string | null | undefined): GalleryAttachmentPayload | null {
  if (typeof payloadJson !== "string" || payloadJson.length === 0) {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(payloadJson);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = r.kind;
  if (kind !== "fixed" && kind !== "auto" && kind !== "bounded") return null;
  const inputKind = r.inputKindSeen;
  if (inputKind !== "text" && inputKind !== "image" && inputKind !== "path_reference") return null;
  const capabilitiesShown = Array.isArray(r.capabilitiesShown)
    ? r.capabilitiesShown.map((v) => String(v))
    : [];
  return {
    kind,
    title: String(r.title ?? ""),
    inputKindSeen: inputKind,
    capabilityCount: Number.isFinite(r.capabilityCount) ? Number(r.capabilityCount) : capabilitiesShown.length,
    capabilitiesShown,
  };
}

export const GALLERY_ATTACHMENT_TYPES = {
  fixed: "plugin.template.full.gallery.fixed",
  auto: "plugin.template.full.gallery.auto",
  bounded: "plugin.template.full.gallery.bounded",
} as const;
