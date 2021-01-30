import { CrudRequestType } from "../client/Types";
import {RespondSuccess} from "..";
import {RespondError} from "..";
import {RespondSuccessParams} from "../client/response/RespondSuccess";
import {RespondErrorParams} from "../client/response/RespondError";

export interface CreateRouteContext {
  readonly body;
  readonly query;
  readonly ownClientId: string | number | undefined;
  readonly headers: object;
  readonly respondSuccess : (response?:RespondSuccessParams) => void;
  readonly respondError : (response?:RespondErrorParams) => void;
}

export abstract class CreateRoute {
  private readonly _type_create_route = "_";
  public readonly requestType: CrudRequestType = CrudRequestType.CREATE;

  protected constructor(public route: string) {}

  /**
     Implement a behavior to `CREATE` data. <br>

     Type:<br>

     `(context) => void`<br>

     Fields of `context`:<br>

     - {@link CreateRouteContext.body body}<br>
     - {@link CreateRouteContext.query query}<br>
     - {@link CreateRouteContext.ownClientId ownClientId}<br>
     - {@link CreateRouteContext.headers headers}<br>
     - {@link CreateRouteContext.respondSuccess respondSuccess(...)}<br>
     - {@link CreateRouteContext.respondError respondError(...)}<br>

     Each `route` must call {@link CreateRouteContext.respondSuccess respondSuccess(...)}
     or {@link CreateRouteContext.respondError respondError(...)}
     to finish the request.

  */
  public abstract create(
    context: CreateRouteContext
  ): void;


  /** @internal */
  public createInternal(context) : Promise<RespondSuccess | RespondError>{
    return new Promise((resolve) => {
        this.create({
          body: context.body,
          headers: context.headers,
          ownClientId: context.ownClientId,
          query: context.query,
          respondError: params => resolve(new RespondError(params)),
          respondSuccess: params => resolve(new RespondSuccess(params))
        })
    });
  }
}

export type CreateFunc = (
  context: CreateRouteContext
) => void;

export class CreateRouteImp extends CreateRoute {
  constructor(route: string, public func: CreateFunc) {
    super(route);
  }

  public create(context: CreateRouteContext) : void {
    return this.func(context);
  }
}

export interface CreateParams {
  /** The route name */
  route: string;

  /**
     Implement a behavior to `CREATE` data. <br>

     Type:<br>

     `(context) => void`<br>

     Fields of `context`:<br>

   - {@link CreateRouteContext.body body}<br>
   - {@link CreateRouteContext.query query}<br>
   - {@link CreateRouteContext.ownClientId ownClientId}<br>
   - {@link CreateRouteContext.headers headers}<br>
   - {@link CreateRouteContext.respondSuccess respondSuccess(...)}<br>
   - {@link CreateRouteContext.respondError respondError(...)}<br>

   Each `route` must call {@link CreateRouteContext.respondSuccess respondSuccess(...)}
   or {@link CreateRouteContext.respondError respondError(...)}
   to finish the request.

  */
  create: CreateFunc;
}
