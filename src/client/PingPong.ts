/** @internal */
export class PingPong {
  public static readonly type = "_class_type_pingpong";
  private readonly _class_type_pingpong = "_";

  constructor(
    public listeningToRoutes: Array<{
      route: string;
      params;
      listenId: string;
      clientRequestId: string;
    }>
  ) {}
}
