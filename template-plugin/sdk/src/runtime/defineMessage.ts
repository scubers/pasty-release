import type { MessageContract } from '../shared/defineMessage.js';
import type { MessageHandler, MessageHandlerContext } from '../generated/runtime.definePlugin.generated.js';

export interface RuntimeMessageContract<TReq, TResp> extends MessageContract<TReq, TResp> {
  handle(
    fn: (req: TReq, ctx: MessageHandlerContext) => Promise<TResp> | TResp,
  ): readonly [string, MessageHandler];
}

export function defineMessage<TReq, TResp>(key: string): RuntimeMessageContract<TReq, TResp> {
  return {
    key,
    handle: (fn) =>
      [key, ((req: unknown, ctx: MessageHandlerContext) => fn(req as TReq, ctx)) as MessageHandler] as const,
  };
}
