// Single source of truth for the draft-action capability gallery.
// Covers the 3 action-scope verbs and the 3 resultKinds of pasty.action.complete.
//
// IMPORTANT: when the SDK adds an action-scope verb, add a button here and
// update EXPECTED_ACTION_VERBS in galleryWiring.test.cjs.

export interface GalleryActionButton {
  id: string;
  label: string;
  apiSignature: string;
  resultKind?: "text" | "image" | "none";
  /** Notes describing what the button demonstrates; rendered in the UI panel. */
  description: string;
}

export const galleryActionCapabilities: GalleryActionButton[] = [
  {
    id: "action-setButtons",
    label: "setButtons (cycle variant)",
    apiSignature: "pasty.action.setButtons({ buttons })",
    description: "Replace the host-side button strip dynamically by cycling buttonsConfigVariant.",
  },
  {
    id: "action-complete-text",
    label: "complete (text)",
    apiSignature: "pasty.action.complete({ result, userMessage })",
    resultKind: "text",
    description: "Finish the draft and emit a text resultKind back to the host.",
  },
  {
    id: "action-complete-image",
    label: "complete (image)",
    apiSignature: "pasty.action.complete({ result, userMessage })",
    resultKind: "image",
    description: "Bridge runtime.invoke for materialize+copy, then emit image resultKind.",
  },
  {
    id: "action-complete-none",
    label: "complete (none)",
    apiSignature: "pasty.action.complete({ result, userMessage })",
    resultKind: "none",
    description: "Finish with side-effects only; emit none resultKind.",
  },
];
