import {CrudRequestType, OnReceived} from "../client/Types";
import {AsklessError, DeleteRouteContext, AuthenticateUserContext} from "..";
import {AsklessErrorParams} from "../client/response/AsklessError";
import {ErrorResponse} from "./ErrorResponse";
import {AsklessSuccess} from "../client/response/RespondSuccess";
import {SetEntityGetter} from "./ReadRoute";
import {copy} from "../Utils";

/** <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Click here to check the documentation}.</b> */
export interface UpdateRouteContext<ENTITY = any, LOCALS extends { [key: string]: any } = {}> {
  /** The data input that will be updated. */
  readonly body;

  /** Additional data. */
  readonly params: object;

  /** An object where you can add custom data that is valid only for the context of the current request. */
  readonly locals: LOCALS;

  /**
   * Call `successCallback(entity)` when the request is handled successfully. {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the docs.}</b>
   * <br>
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Do not pass the output as parameter, use the entity of your server instead.}</b>
   *
   *  @param entity the response data BEFORE converting it to the output.
   * */
  readonly successCallback : (entity: ENTITY) => void;
  /**
   *  Call `errorCallback(..)` to reject the request by sending an error.
   *
   *  @param params
   *  @param params.code: Code of the error and also  set a custom error code.
   *  @param params.description: Description of the error.
   *
   *  @example
   *     context.errorCallback({
   *         code: "PERMISSION_DENIED",
   *         description: "Only authenticated users can update on this route"
   *     });
   * */
  readonly errorCallback : (response?:AsklessErrorParams) => void;
}
export abstract class UpdateRoute<ENTITY, LOGGED_IN_OR_NOT, LOCALS extends (AuthenticateUserContext<any> | {})> {
  private readonly _type_update_route = "_";
  public readonly requestType: CrudRequestType = CrudRequestType.UPDATE;

  protected constructor(
      public route: string,
      public readonly onReceived:OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>,
      public readonly toOutput: (entity: ENTITY) => any,
      public readonly authenticationStatus: "authenticatedOrNot" | "authenticatedOnly"
  ) {}

  public abstract update(
    context: LOGGED_IN_OR_NOT & UpdateRouteContext<ENTITY>
  ): void;

  /** @internal */
  public updatePromise(context: AuthenticateUserContext<any> & UpdateRouteContext<ENTITY> & SetEntityGetter<ENTITY>) : Promise<AsklessSuccess | AsklessError>{
    return new Promise((resolve) => {
      const data: AuthenticateUserContext<any> & UpdateRouteContext<ENTITY> = {
        body: context.body,
        claims: context.claims,
        locals: context.locals,
        userId: context.userId,
        params: context.params,
        errorCallback: params => resolve(new AsklessError(params)),
        successCallback: entity => {
          context.setEntityGetter(() => entity);
          resolve(new AsklessSuccess(this.toOutput == null ? copy(entity) : this.toOutput(copy(entity))));
        },
      };
      this.update(data as any)
    });
  }
}

export type UpdateFunc<ENTITY, LOGGED_IN_OR_NOT> = (
  context: LOGGED_IN_OR_NOT & UpdateRouteContext
) => void | Promise<void>;

export class UpdateRouteImp<ENTITY, LOGGED_IN_OR_NOT, LOCALS> extends UpdateRoute<ENTITY, LOGGED_IN_OR_NOT, LOCALS> {
  constructor(
      route: string,
      public func: UpdateFunc<ENTITY, LOGGED_IN_OR_NOT>,
      onReceived:OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>,
      toOutput: (entity: ENTITY) => any,
      authenticationStatus: "authenticatedOrNot" | "authenticatedOnly"
  ) {
    super(route, onReceived ?? (() => {}), toOutput, authenticationStatus);
  }

  async update(
    context: LOGGED_IN_OR_NOT &  UpdateRouteContext
  ): Promise<void> {
    try {
      return (await this.func(context));
    } catch (e) {
      if (e instanceof ErrorResponse) {
        context.errorCallback(e);
        return;
      }
      throw e;
    }
  }
}

/** <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Click here to check the documentation}.</b> */
export interface UpdateParams <ENTITY, LOGGED_IN_OR_NOT, LOCALS> {
  /** The route name */
  route: string;

  /**
   Implement the handler to update data. <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Click here for a full documentation with example.}</b> <br>

   You should either {@link UpdateRouteContext.successCallback context.successCallback(...)}
   or {@link UpdateRouteContext.errorCallback context.errorCallback(...)}
   to finish the request.

   @param context
   <br>
   context.params: Additional data.<br>
   context.body: The data input that will be updated. <br>
   context.locals: An object where you can add custom data that is valid only for the context of the current request.<br>
   context.successCallback(entity): Call `successCallback(entity)` when the request is handled successfully. {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Do not pass the output as parameter, use the entity of your server instead.}<br>
   context.errorCallback(...): to reject the request by sending an error. <br>
   context.userId (only if authenticated): The user ID is performing the request. Only in case the user is authenticated, otherwise is `undefined`. <br>
   context.claims (only if authenticated): The claims the user is performing the request has. Example: `["admin"]`. Only in case the user is authenticated, otherwise is `undefined`.<br>
  */
  handleUpdate: UpdateFunc<ENTITY, LOGGED_IN_OR_NOT>;

  /** A listener that is triggered every time the client receives `output` (optional).*/
  onReceived?: OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>;

  /** Converts the entity to the output the client will receive */
  toOutput?: (entity: ENTITY) => any,
}
