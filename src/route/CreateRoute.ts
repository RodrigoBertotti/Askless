import {CrudRequestType, OnReceived} from "../client/Types";
import {AsklessError, AuthenticateUserContext, UpdateRouteContext} from "..";
import {AsklessErrorParams} from "../client/response/AsklessError";
import {ErrorResponse} from "./ErrorResponse";
import {AsklessSuccess} from "../client/response/RespondSuccess";
import {SetEntityGetter} from "./ReadRoute";
import {copy} from "../Utils";

export interface CreateRouteContext<ENTITY = any, LOCALS extends { [key: string]: any } = {}> {
  /** The data that will be created.*/
  readonly body;

  /** Additional data (optional). */
  readonly params;

  /**
   *  Call `successCallback` when the request is handled successfully.
   *
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Do not pass the output as parameter, use the entity of your server instead.}</b>
   *
   *  @param entity the response data BEFORE converting it to the output.
   * */
  readonly successCallback : (entity: ENTITY) => void;

  /**
   *  Call `errorCallback` to reject the request by sending an error.
   *
   *  @param errorParams Error details object
   *  @param errorParams.code (string) Code of the error and also  set a custom error code.
   *  @param errorParams.description (string) Description of the error
   *
   *  @example
   *  context.errorCallback({
   *     code: "PERMISSION_DENIED",
   *     description: "The user only can edit data he created"
   *  });
   * */
  readonly errorCallback : (errorParams?:AsklessErrorParams) => void;

  /** An object where you can add custom data that is valid only for the context of the current request  */
  readonly locals: LOCALS,

}

export abstract class CreateRoute<ENTITY,LOGGED_IN_OR_NOT, LOCALS extends (AuthenticateUserContext<any> | {})> {
  private readonly _type_create_route = "_";
  public readonly requestType: CrudRequestType = CrudRequestType.CREATE;

  protected constructor(
      public readonly route: string,
      public readonly onReceived:OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>,
      public readonly toOutput: (entity: ENTITY) => any,
      public readonly authenticationStatus: "authenticatedOrNot" | "authenticatedOnly"
  ) {}

  /**
     Adds a new route to create data <br>


  */
  public abstract create(
    context: LOGGED_IN_OR_NOT & CreateRouteContext<ENTITY>
  ): void;


  /** @internal */
  public createPromise(context:AuthenticateUserContext<any> & CreateRouteContext<ENTITY> & SetEntityGetter<ENTITY>) : Promise<AsklessSuccess | AsklessError>{
    return new Promise((resolve) => {
        const createRouteContext: AuthenticateUserContext<any> & CreateRouteContext<ENTITY> = {
          body: context.body,
          userId: context.userId,
          locals: context.locals,
          claims: context.claims,
          params: context.params,
          errorCallback: params => resolve(new AsklessError(params)),
          successCallback: entity => {
            context.setEntityGetter(() => entity);
            resolve(new AsklessSuccess(this.toOutput == null ? copy(entity) : this.toOutput(copy(entity))));
          },
        };
        this.create(createRouteContext as any);
    });
  }
}

export class CreateRouteImp<ENTITY, LOGGED_IN_OR_NOT, LOCALS extends (AuthenticateUserContext<any> | {})> extends CreateRoute<ENTITY, LOGGED_IN_OR_NOT, LOCALS> {

  constructor(
      route: string,
      public func: CreateFunc<ENTITY, LOGGED_IN_OR_NOT>,
      onReceived:OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>,
      toOutput: (entity: ENTITY) => any,
      authenticationStatus: "authenticatedOrNot" | "authenticatedOnly"
  ) {
    super(route, onReceived ?? (() => {}), toOutput, authenticationStatus);
  }

  public async create(context: LOGGED_IN_OR_NOT & CreateRouteContext<ENTITY>) : Promise<void> {
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
export interface CreateParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS> {
  /** The route name */
  route: string;

  /**
   Implement the handler to create data. <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Click here for a full documentation with example.}</b> <br>

   You should either {@link CreateRouteContext.successCallback context.successCallback(...)}
   or {@link CreateRouteContext.errorCallback context.errorCallback(...)}
   to finish the request.

   @param context
   <br>
   context.params: Additional data.<br>
   context.body: The data input that will be created. <br>
   context.locals: An object where you can add custom data that is valid only for the context of the current request.<br>
   context.successCallback(entity): Call `successCallback(entity)` when the request is handled successfully. {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Do not pass the output as parameter, use the entity of your server instead.}<br>
   context.errorCallback(...): to reject the request by sending an error. <br>
   context.userId (only if authenticated): The user ID is performing the request. Only in case the user is authenticated, otherwise is `undefined`. <br>
   context.claims (only if authenticated): The claims the user is performing the request has. Example: `["admin"]`. Only in case the user is authenticated, otherwise is `undefined`.<br>
  */
  handleCreate: CreateFunc<ENTITY, LOGGED_IN_OR_NOT>;

  /** A listener that is triggered every time the client receives `output` (optional).*/
  onReceived?: OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>;

  /** Converts the entity to the output the client will receive */
  toOutput?: (entity: ENTITY) => any;
}

export type CreateFunc<ENTITY, LOGGED_IN_OR_NOT> = (context: LOGGED_IN_OR_NOT & CreateRouteContext) => void | Promise<void>;
