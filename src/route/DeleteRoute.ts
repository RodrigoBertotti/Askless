import { CrudRequestType } from "../client/Types";
import { CreateFunc, CreateRoute, CreateRouteContext } from "./CreateRoute";
import {RespondSuccess} from "..";
import {RespondError} from "..";
import {RespondSuccessParams} from "../client/response/RespondSuccess";
import {RespondErrorParams} from "../client/response/RespondError";

export interface DeleteRouteContext {
  readonly query:object;
  readonly ownClientId: string | number | undefined;
  readonly headers: object;
  readonly respondSuccess : (response?:RespondSuccessParams) => void;
  readonly respondError : (response?:RespondErrorParams) => void;
}
export abstract class DeleteRoute {
  private readonly _type_delete_route = "_";
  public readonly requestType: CrudRequestType = CrudRequestType.DELETE;

  protected constructor(public route: string) {}

  /**
     Implement a behavior to `DELETE` data. <br>

     Type:<br>

     `(context) => void`<br>

     Fields of `context`:<br>

     - {@link DeleteRouteContext.query query}<br>
     - {@link DeleteRouteContext.ownClientId ownClientId}<br>
     - {@link DeleteRouteContext.headers headers}<br>
     - {@link DeleteRouteContext.respondSuccess respondSuccess(...)}<br>
     - {@link DeleteRouteContext.respondError respondError(...)}<br>

     Each `route` must call {@link DeleteRouteContext.respondSuccess respondSuccess(...)}
     or {@link DeleteRouteContext.respondError respondError(...)}
     to finish the request.

   */

  public abstract delete(context: DeleteRouteContext): void;

  /** @internal */
  public deleteInternal(context) : Promise<RespondSuccess | RespondError>{
    return new Promise((resolve) => {
      this.delete({
        headers: context.headers,
        ownClientId: context.ownClientId,
        query: context.query,
        respondError: params => resolve(new RespondError(params)),
        respondSuccess: params => resolve(new RespondSuccess(params))
      })
    });
  }
}

export type DeleteFunc = (
  context: DeleteRouteContext
) => void;

export class DeleteRouteImp extends DeleteRoute {
  constructor(route: string, public func: DeleteFunc) {
    super(route);
  }

  delete(
    context: DeleteRouteContext
  ): void {
    return this.func(context);
  }
}

export interface DeleteParams {
  /** The route name */
  route: string;

  /**
     Implement a behavior to `DELETE` data. <br>

     Type:<br>

     `(context) => void`<br>

     Fields of `context`:<br>

     - {@link DeleteRouteContext.query query}<br>
     - {@link DeleteRouteContext.ownClientId ownClientId}<br>
     - {@link DeleteRouteContext.headers headers}<br>
     - {@link DeleteRouteContext.respondSuccess respondSuccess(...)}<br>
     - {@link DeleteRouteContext.respondError respondError(...)}<br>

     Each `route` must call {@link DeleteRouteContext.respondSuccess respondSuccess(...)}
     or {@link DeleteRouteContext.respondError respondError(...)}
     to finish the request.

   */
  delete: DeleteFunc;
}
