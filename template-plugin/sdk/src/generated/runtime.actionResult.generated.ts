// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts

export interface ActionResultOptions {
  userMessage?: string;
}

export const actionResult = {
  text: (text: string, options?: ActionResultOptions): { result: { resultKind: 'text'; text: string }; userMessage: string | undefined } => ({
    result: { resultKind: 'text', text },
    userMessage: options?.userMessage,
  }),
  image: (imageTempPath: string, options?: { imageFormatHint?: string } & ActionResultOptions): { result: { resultKind: 'image'; imageTempPath: string; imageFormatHint?: string }; userMessage: string | undefined } => ({
    result: { resultKind: 'image', imageTempPath, ...(options && 'imageFormatHint' in options ? { imageFormatHint: (options as { imageFormatHint?: string }).imageFormatHint } : {}) },
    userMessage: options?.userMessage,
  }),
  none: (options?: ActionResultOptions): { result: { resultKind: 'none' }; userMessage: string | undefined } => ({
    result: { resultKind: 'none' },
    userMessage: options?.userMessage,
  }),
};
