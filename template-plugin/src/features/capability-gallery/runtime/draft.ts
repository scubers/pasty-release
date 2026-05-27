// Pure draft-shape helpers, safe to import from browser UI bundles.
// Anything that needs Node (fs, path) belongs in draft-action.ts.

export interface GalleryDraft {
  [key: string]: unknown;
  scratchText: string;
  buttonsConfigVariant: "default" | "compact" | "verbose";
}

export function createInitialGalleryDraft(): GalleryDraft {
  return { scratchText: "", buttonsConfigVariant: "default" };
}

export function decodeGalleryDraft(raw: unknown): GalleryDraft {
  const r = raw as Record<string, unknown> | null | undefined;
  const variant = r?.buttonsConfigVariant;
  return {
    scratchText: String(r?.scratchText ?? ""),
    buttonsConfigVariant:
      variant === "compact" || variant === "verbose" ? variant : "default",
  };
}
