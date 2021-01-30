import { CrudRequestType } from "../client/Types";
import { CreateRoute, CreateRouteContext } from "./CreateRoute";
import {RespondSuccess} from "..";
import {RespondError} from "..";
import {RespondSuccessParams} from "../client/response/RespondSuccess";
import {RespondErrorParams} from "../client/response/RespondError";

export interface UpdateRouteContext {
  readonly body;
  readonly query: object;
  readonly ownClientId: string | number | undefined;
  readonly headers: object;

  readonly respondSuccess : (response?:RespondSuccessParams) => void;
  readonly respondError : (response?:RespondErrorParams) => void;
}
export abstract class UpdateRoute {
  private readonly _type_update_route = "_";
  public readonly requestType: CrudRequestType = CrudRequestType.UPDATE;

  protected constructor(public route: string) {}

  /**
     Implement a behavior to `UPDATE` data. <br>

     Type:<br>

     `(context) => void`<br>

     Fields of `context`:<br>

     * @param context:
     * {@link UpdateRouteContext.body body }<br>
     * {@link UpdateRouteContext.query query }<br>
     * {@link UpdateRouteContext.ownClientId ownClientId }<br>
     * {@link UpdateRouteContext.headers headers }<br>
     * {@link UpdateRouteContext.respondSuccess respondSuccess(...) }<br>
     * {@link UpdateRouteContext.respondError respondError(...) }<br>

     Each `route` must call {@link UpdateRouteContext.respondSuccess respondSuccess(...)}
     or {@link UpdateRouteContext.respondError respondError(...)}
     to finish the request.
  */
  public abstract update(
    context: UpdateRouteContext
  ): void;

  /** @internal */
  public updateInternal(context) : Promise<RespondSuccess | RespondError>{
    return new Promise((resolve) => {
      this.update({
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

export type UpdateFunc = (
  context: UpdateRouteContext
) => void;

export class UpdateRouteImp extends UpdateRoute {
  constructor(route: string, public func: UpdateFunc) {
    super(route);
  }

  update(
    context: UpdateRouteContext
  ): void {
    return this.func(context);
  }
}

export interface UpdateParams {
  /** The route name */
  route: string;

  /**
     Implement a behavior to `UPDATE` data. <br>

     Type:<br>

     `(context) => void`<br>

     Fields of `context`:<br>

     * @param context:
     * {@link UpdateRouteContext.body body }<br>
     * {@link UpdateRouteContext.query query }<br>
     * {@link UpdateRouteContext.ownClientId ownClientId }<br>
     * {@link UpdateRouteContext.headers headers }<br>
     * {@link UpdateRouteContext.respondSuccess respondSuccess(...) }<br>
     * {@link UpdateRouteContext.respondError respondError(...) }<br>

     Each `route` must call {@link UpdateRouteContext.respondSuccess respondSuccess(...)}
     or {@link UpdateRouteContext.respondError respondError(...)}
     to finish the request.

   */
  update: UpdateFunc;
}
