export interface MessageContract<TReq, TResp> {
  readonly key: string;
  readonly __types?: { req: TReq; resp: TResp }; // phantom for type inference; never set at runtime
}
