import { pasty } from '../generated/ui.pasty.generated.js';
import type { MessageContract } from '../shared/defineMessage.js';

export interface UIMessageContract<TReq, TResp> extends MessageContract<TReq, TResp> {
  invoke(payload: TReq, options?: { timeoutMs?: number }): Promise<TResp>;
}

export function defineMessage<TReq, TResp>(key: string): UIMessageContract<TReq, TResp> {
  return {
    key,
    invoke: async (payload, options) =>
      (await pasty.runtime.invoke({ key, payload, timeoutMs: options?.timeoutMs })) as TResp,
  };
}
