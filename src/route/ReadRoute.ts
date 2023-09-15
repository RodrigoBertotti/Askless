import {ClientInfo, Clients, RouteBeingListen} from "../client_middleware/Clients";
import {
  AsklessResponse,
} from "../client/response/OtherResponses";
import {NewDataForListener, AsklessErrorCode, AuthenticateUserContext, AsklessServer} from "..";
import {AsklessError} from "..";
import {CrudRequestType, OnReceived, OnReceivedContext} from "../client/Types";
import {AsklessErrorParams} from "../client/response/AsklessError";
import {ErrorResponse} from "./ErrorResponse";
import {AsklessSuccess} from "../client/response/RespondSuccess";
import {copy} from "../Utils";


export type WhereContext = { params:object };

/**
 * Params for the method {@link ReadRoute.notifyChanges notifyChanges}, being them:
 *
 * {@link @link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here for full details</b>}.
 *
 * */
export interface NotifyChangesParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS extends (AuthenticateUserContext<any> | {})> {

  /**
   * If where(..) parameter is defined, handleRead(..) implementation will be triggered for only the user(s) in the App that fulfills the condition.
   *
   * @example
   * readAllProductsRouteInstance.notifyChanges({
   *     where: (context) => {
   *         return context.userId == 1; // only user 1 will receive the latest changes from `handleRead(..)`
   *     },
   * });
   * */
  where?: (context: LOGGED_IN_OR_NOT & WhereContext) => Promise<boolean> | boolean;

  /**
   * If `handleReadOverride(context)` parameter is defined,
   * `handleReadOverride(context)` will take the place of `handleRead(context)`,
   * this is useful when you want to avoid making too many operations in the database. <br>
   *
   * **If params are specified, remember to handle those again** <br>
   *
   * Please notice that we are still using entities rather than outputs as parameters of  `successCallback(entity)`. <br>
   *
   * @example
   *     this.readAllProductsRouteInstance.notifyChanges({
   *         handleReadOverride: context => {
   *             if (context.params && context.params['search']) {
   *                 const search = context.params['search'].toString().trim().toLowerCase();
   *                 const matchedProductsEntiesCache = allProductsEntiesCache
   *                     .filter((product => product.name.trim().toLowerCase().includes(search) || product.price.toString().trim().toLowerCase().includes(search)));
   *                 context.successCallback(matchedProductsEntiesCache);
   *             } else {
   *                 context.successCallback(allProductsEntiesCache);
   *             }
   *         },
   *         where: (context) => {
   *             return context.userId == 1;
   *         },
   *     })
   * */
  handleReadOverride?: (context: LOGGED_IN_OR_NOT & {
    successCallback: (entity: ENTITY) => void,
    params:object,
    locals: LOCALS,
  }) => void;
}


/** <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Click here to check the documentation}.</b> */
export interface ReadRouteContext<LOCALS extends { [key: string]: any } = {}, ENTITY = any> {
  /** Additional data, it's useful in case you want to filter data. */
  readonly params:object;

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
   *         description: "Only authenticated users can read/listen to this route"
   *     });
   * */
  readonly errorCallback : (params:AsklessErrorParams) => void;

  /** An object where you can add custom data that is valid only for the context of the current request. */
  readonly locals: LOCALS;
}

/** <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Click here to check the documentation}.</b> */
export interface ReadParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS extends (AuthenticateUserContext<any> | {})> {
  /** The READ route name */
  route: string;

  /**
     Implement the handler to read and stream (listen) data. <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Click here for a full documentation with example.}</b> <br>

     This function will also be called automatically by Askless every time you trigger `notifyChanges(..)`.

     You should either {@link ReadRouteContext.successCallback context.successCallback(...)}
     or {@link ReadRouteContext.errorCallback context.errorCallback(...)}
     to finish the request.

     @param context
     <br>
     context.params: Additional data, it's useful in case you want to filter data.<br>
     context.locals: An object where you can add custom data that is valid only for the context of the current request.<br>
     context.successCallback(entity): Call `successCallback(entity)` when the request is handled successfully. {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes Do not pass the output as parameter, use the entity of your server instead.}<br>
     context.errorCallback(...): to reject the request by sending an error. <br>
     context.userId (only if authenticated): The user ID is performing the request. Only in case the user is authenticated, otherwise is `undefined`. <br>
     context.claims (only if authenticated): The claims the user is performing the request has. Example: `["admin"]`. Only in case the user is authenticated, otherwise is `undefined`.<br>

      @example
      const readAllProductsRouteInstance = server.addRoute.forAllUsers.read<ProductEntity>({ // choose between "forAllUsers" and "forAuthenticatedUsers"
        route: "product/all",
        handleRead: async context => {
          const entityList = productsRepository.readList(context.params != null ? context.params['search'] : null);
          context.successCallback(entityList);
        },
        // convert the entity to the data the client will receive with toOutput(..)
        toOutput: (entityList) => ProductModel.fromEntityList(entityList).output(),
        onReceived: (entity, context) => { console.log("client received output successfully "); },
        onClientStartsListening: (context)  => { console.log("client started listening to [READ] \"product/all\""); },
        onClientStopsListening:  (context)  => { console.log("client stopped listening to [READ] \"product/all\""); }
      });
   */
  handleRead: (context: LOGGED_IN_OR_NOT & ReadRouteContext<LOCALS, ENTITY>) => void;

  /** A callback that is triggered when a client starts listening to this route. */
  onClientStartsListening?: (context: LOGGED_IN_OR_NOT & ClientAndRouteContext) => void;

  /** A callback that is triggered when a client stops listening to this route. */
  onClientStopsListening?: (context: LOGGED_IN_OR_NOT & ClientAndRouteContext) => void;

  /** A listener that is triggered every time the client receives `output` (optional).
   *
   * This function will also be called automatically by Askless every time you trigger `notifyChanges(..)`.
   * */
  onReceived?: OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>;

  /**
   * Convert the entity to the output the client will receive.
   *
   * This function will also be called automatically by Askless every time you trigger `notifyChanges(..)`.
   * */
  toOutput?: (entity: ENTITY) => any;
}

abstract class _ReadRoute<ENTITY, LOGGED_IN_OR_NOT, LOCALS extends (AuthenticateUserContext<any> | {})> {
  private readonly _type_read_route = "_";
  public readonly requestType: CrudRequestType = CrudRequestType.READ;

  /** @internal */
  public askless: AsklessServer;

  protected constructor(
      public readonly route: string,
      public readonly onReceived:OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>,
      public readonly authenticationStatus: "authenticatedOrNot" | "authenticatedOnly",
  ) {}

  public abstract handleRead(
    context: LOGGED_IN_OR_NOT & ReadRouteContext<ENTITY>
  ): void;

  public readInternal(context: AuthenticateUserContext<any> & ReadRouteContext<ENTITY> & SetEntityGetter<ENTITY>): Promise<AsklessSuccess | AsklessError> {
    return new Promise((resolve) => {
      const data: AuthenticateUserContext<any> & ReadRouteContext<ENTITY> = {
        userId: context.userId,
        params: context.params,
        claims: context.claims,
        errorCallback: params => {
          context.setEntityGetter(() => null);
          return resolve(new AsklessError(params));
        },
        successCallback: entity => {
          context.setEntityGetter(() => entity);
          return resolve(new AsklessSuccess(this.toOutput == null ? copy(entity) : this.toOutput(copy(entity))));
        },
        locals: context.locals,
      };
      this.handleRead(data as any)
    });
  };

  /**
   * Call this method whenever you want to notify the clients
   * the `output` have changed.
   *
   * {@link @link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here for full details</b>}.
   * */
  notifyChanges(notifyChangesParams?: NotifyChangesParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS>): void {
    // noinspection JSIgnoredPromiseFromCall
    this._notifyChangesAsync(notifyChangesParams);
  }

  async _notifyChangesAsync(params?: NotifyChangesParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS>): Promise<void> {
    setTimeout(async () => {
      this.askless.logger("notifyChanges -> started " + this.route, "debug");

      const clientId_info = this.askless.clientMiddleware.clients.getAllClientsInfos();

      for (const clientIdInternalApp of Object.keys(clientId_info)) {
        if (clientIdInternalApp == null) {
          throw Error("_notifyChangesAsync: clientIdInternalApp == null");
        }

        this.askless.logger("notifyChanges -> client " + clientIdInternalApp, "debug");

        const clientInfo = clientId_info[clientIdInternalApp];

        // Embora um cliente deva ouvir apenas uma rota, em alguns milissegundos ele pode estar ouvindo 2 vezes a mesma rota
        // isso acontece por exemplo quando no exemplo do catalog o usuário muda a params muito rapidamente, ex: '' -> 'f' -> ''
        const routeClientListeningByThisClientArray = clientInfo.routesBeingListen
            .filter((route) => route.route == this.route);

        if (!routeClientListeningByThisClientArray?.length) {
          this.askless.logger("notifyChanges -> client " + clientIdInternalApp + " is not listening to " + this.route, "debug", JSON.stringify(routeClientListeningByThisClientArray));
          continue;
        }

        this.askless.logger("notifyChanges -> " + clientIdInternalApp + " listen to: " + clientInfo.routesBeingListen.length, "debug");

        for(let r=0;r<routeClientListeningByThisClientArray.length;r++){ // this loop was created because of the uncommon cases where the same client listening implementation (internal code, not interface code) is listening multiple times for the same response
          if(routeClientListeningByThisClientArray[r].authenticationStatus == "authenticatedOnly" && clientInfo.authentication != "authenticated"){
            this.askless.logger("notifyChanges -> Desconsidering \"where\" check for \""+routeClientListeningByThisClientArray[r].route+"\" and user \""+clientIdInternalApp+"\" ("+typeof clientIdInternalApp+") because authorization is \""+clientInfo.authentication+"\"", "debug");
            continue;
          }
          const whereContext: AuthenticateUserContext<any> & WhereContext = {
            params: routeClientListeningByThisClientArray[r].params,
            userId: clientInfo.userId,
            claims: clientInfo.claims,
          };
          const localsInstance = routeClientListeningByThisClientArray[r].locals;

          if(params?.where != null && !(await params.where(whereContext as any))){
            this.askless.logger("notifyChanges -> " + clientIdInternalApp + " NOT notifing because whereContext(..) exists and its result is false", "debug");
            continue;
          }

          let _getEntity:() => ENTITY;
          // noinspection PointlessBooleanExpressionJS
          const response: AsklessSuccess | AsklessError =
              params?.handleReadOverride == null
                  ? await this.readInternal({
                    ...whereContext,
                    errorCallback: null,
                    successCallback: null,
                    locals: localsInstance,
                    setEntityGetter: (getEntity) => { _getEntity = getEntity; }
                  }) : await new Promise(resolve => {
                    const c: AuthenticateUserContext<any> & ReadRouteContext<LOCALS, ENTITY> = {
                      ...whereContext,
                      locals: localsInstance,
                      successCallback: (entity) => {
                        _getEntity = () => entity;
                        resolve(new AsklessSuccess(this.toOutput == null ? copy(entity) : this.toOutput(copy(entity))));
                      },
                      // errorCallback: (params) => resolve(new AsklessError(params)),
                      errorCallback: (_) => {throw new Error("Ops, this shouldn't happen"); },
                    };
                    params.handleReadOverride(c as any);
                  });

          if (response == null || (!(response instanceof AsklessError) && !(response instanceof AsklessSuccess)))
            throw Error(
                "response of read " +
                this.route +
                " must be an instance of Success or AsklessError"
            );

          if (response instanceof AsklessSuccess) {
            this.askless.logger("notifyChanges -> Notifying client " + clientIdInternalApp, "debug");

            this.askless.clientMiddleware.assertSendDataToClient(
                clientIdInternalApp,
                new NewDataForListener(response.output, routeClientListeningByThisClientArray[r].listenId),
                true,
                () => {
                  if (this.onReceived) {
                    const context:OnReceivedContext<AuthenticateUserContext<any>, any> = {
                      userId: clientInfo.userId,
                      locals: routeClientListeningByThisClientArray[r].locals,
                      params: routeClientListeningByThisClientArray[r].params,
                      claims: clientInfo.claims,
                    };
                    this.onReceived(_getEntity(), context as any);
                  }
                },
            );
          } else {
            this.askless.logger("notifyChanges -> " + this.route + " could not send the data, because read failed, try passing the output as parameter on notifyChanges method", "error", response);
          }
        }
      }
      // To avoid the bug where the App doesn't receive event updates
      // (when the App is waiting to the server to get back on, and the server starts and  right after calls notifyChanges)
    }, this.askless.startedAt.getTime() + (4 * 1000) - Date.now());
  }

  /** @internal */
  listen(
    clientIdInternalApp: string,
    clientRequestId: string,
    params: object,
    listenId: string
  ): Promise<String|undefined> {
    if (clientRequestId == null) { throw Error("clientRequestId is null!!"); }
    // if(this.clientIsAlreadyListeningTo(listenId)){
    //   this.server.logger("server is already server the client listening request about listenId:"+listenId+" & clientRequestId: "+clientRequestId, "debug");
    //   return;
    // }
    return new Promise<String|undefined>(async (resolve) => {
      this.stopListening(  clientIdInternalApp, listenId, this.route);
      const clientInfo = this.askless.clientMiddleware.clients.getOrCreateClientInfo(  clientIdInternalApp);
      // const start = Date.now();
      const locals = Object.assign({}, clientInfo.locals);

      clientInfo.routesBeingListen.push({
        clientIdInternalApp: clientIdInternalApp,
        listenId: listenId,
        route: this.route,
        params: params,
        locals: locals,
        authenticationStatus: this.authenticationStatus,
      });

      let _getEntity: () => ENTITY;
      let response;
      if (this.authenticationStatus == "authenticatedOnly" && clientInfo.authentication != "authenticated") {
        response = new AsklessError({
          code: AsklessErrorCode.PENDING_AUTHENTICATION,
          description: "Could not perform the operation on (LISTEN) \""+this.route+"\" because authentication is required",
        });
      } else {
        response = await this.readInternal({
          params: params,
          userId: clientInfo.userId,
          claims: clientInfo.claims,
          locals: locals,
          errorCallback: null,
          successCallback: null,
          setEntityGetter: (getEntity) => { _getEntity = getEntity; }
        } as AuthenticateUserContext<any> & ReadRouteContext<any> & SetEntityGetter<ENTITY>);
        if (
            response == null ||
            (!(response instanceof AsklessError) &&
                !(response instanceof AsklessSuccess))
        ) {
          throw Error(
              "response of read " +
              this.route +
              " must be an instance of Success or AsklessError"
          );
        }
      }

      const listenCallbackError = async (error, resolve:Function) => {
        this.askless.logger("listen: READ error", "debug", error);
        if (clientInfo.authentication != "authenticated" && (response.code == AsklessErrorCode.PERMISSION_DENIED || response.code == AsklessErrorCode.PENDING_AUTHENTICATION)) {
          this.askless.logger("respondWithError: the client \""+(clientInfo.userId ?? "(no ID)")+"\" " +
              "could not perform the operation on (" + this.requestType + ")" + this.route + ", result is "+response.code+
              ", authentication is \""+clientInfo.authentication+"\", did you handle the onUnauthenticatedListener on the App side? (initAndConnect)", "warning");
        }

        this.askless.clientMiddleware.assertSendDataToClient(
              clientIdInternalApp,
            new AsklessResponse(clientRequestId, null, error),
            true,
            undefined,
        );
        if (error?.code == AsklessErrorCode.PERMISSION_DENIED || error?.code == AsklessErrorCode.PENDING_AUTHENTICATION) {
          this.askless.logger("listen: the error is \""+error.code+"\", calling stopListening...", "error", error);
          this.stopListening(  clientIdInternalApp, listenId, this.route);
          this.askless.logger("onClientStartsListening not called", "error");
        }
        resolve(undefined);
      };
      const listenCallbackSuccess = async (entity: ENTITY) => {
        this.askless.clientMiddleware.assertSendDataToClient(
            clientIdInternalApp,
            new AsklessResponse(clientRequestId, listenId),
            true,
            () => {
              this.askless.logger("onClientReceiveOutputWithSuccess being ignored for route "+this.route+" (listen)", "info");
            },
        );
        const contextNewDataForListener: OnReceivedContext<AuthenticateUserContext<any>, any> = {
          params: params,
          userId: clientInfo.userId,
          claims: clientInfo.claims,
          locals: locals,
        };

        this.askless.clientMiddleware.assertSendDataToClient(
            clientIdInternalApp,
            new NewDataForListener(this.toOutput == null ? copy(entity) : this.toOutput(copy(entity)), listenId),
            true,
            () => {
              this.onReceived(entity, contextNewDataForListener as OnReceivedContext<any, any>);
            },
        );

        const contextOnStartListening: AuthenticateUserContext<any> & ClientAndRouteContext = {
          userId: clientInfo.userId,
          claims: clientInfo.claims,
          params: params,
          locals: locals,
        };
        this.onClientStartsListening(contextOnStartListening as any);

        resolve(listenId);
      };


      if (response instanceof AsklessError) {
        this.askless.logger("AsklessError: "+(response.code ?? "") + " " + (response.description ?? ""), response.code != null ? "debug" : "error");
        await listenCallbackError(
        response.code != null
           ? response
           : {
               code: AsklessErrorCode.INTERNAL_ERROR,
               description: response?.description,
           },
           resolve,
        );
      } else {
        await listenCallbackSuccess(_getEntity());
      }
    });
  }

  /** A callback that is triggered when a client starts listening to this route. */
  onClientStartsListening(context: LOGGED_IN_OR_NOT & ClientAndRouteContext){
    this.askless.logger("onClientStartsListening is not overriden for route "+this.route, "debug");
  };

  /** A callback that is triggered when a client stops listening to this route. */
  onClientStopsListening(context: LOGGED_IN_OR_NOT & ClientAndRouteContext){
    this.askless.logger("onClientStopsListening is not overriden for route "+this.route, "debug");
  };

  /**
    To convert the entity to the output the client will receive.

    This function will also be called automatically by Askless every time you trigger `notifyChanges(..)`.
  */
  toOutput(entity: ENTITY):any {};

  /** @internal */
  stopListening(clientIdInternalApp: string,
    listenId?:string,
    route?: string
  ): void {
    if (clientIdInternalApp == null) throw Error("clientIdInternalApp is undefined");
    if (listenId == null && route != null)
      throw Error("please, inform the listenId");

    const clientInfo = this.askless.clientMiddleware.clients.getOrCreateClientInfo(clientIdInternalApp);

    let remove: Array<RouteBeingListen> = [];
    if (listenId) {
      const s = clientInfo.routesBeingListen.find(
        (c) => c.listenId == listenId
      );
      if (s != null) remove = [s];
    } else {
      remove = clientInfo.routesBeingListen;
    }
    if (!remove.length){
      this.askless.logger("stopListening: NO item for "+(this.route ?? 'unknown route') + " listenId: "+listenId + '  ' +JSON.stringify(clientInfo.routesBeingListen.map(e => e.listenId + " ("+e.route+")")), "debug");
    }
    remove.forEach(async (p) => {
      const context:AuthenticateUserContext<any> & ClientAndRouteContext = {
        userId: clientInfo.userId,
        claims: clientInfo.claims,
        locals: p.locals,
        params: p.params,
      };
      await this.onClientStopsListening(context as any);
    });
    remove.forEach((r) => {
          clientInfo.routesBeingListen.splice(clientInfo.routesBeingListen.indexOf(r), 1);
        }
    );
  }
}

export type ClientAndRouteContext = {
  /** Additional data, it's useful in case you want to filter data. */
  readonly params:object;
  /** An object where you can add custom data that is valid only for the context of the current request. */
  readonly locals:object;
}

/**
 * Read instance.
 *
 * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here for full details</b>}.
 *
 * */
export interface ReadRouteInstance<ENTITY, LOGGED_IN_OR_NOT, LOCALS = any> {
  /**
   * Call `notifyChanges` whenever you want to notify the clients
   * the `output` have changed.
   *
   * {@link @link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here for full details</b>}.
   * */
  notifyChanges: (notify?: NotifyChangesParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS>) => void;

  /** Call `stopListening` when you want to make a user stop listening to a route */
  stopListening : (userId) => void;
}

export abstract class ReadRoute<ENTITY, LOGGED_IN_OR_NOT, LOCALS> extends _ReadRoute<ENTITY, LOGGED_IN_OR_NOT, LOCALS> {

  protected constructor(
      route: string,
      onReceived:OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>,
      authenticationStatus: "authenticatedOnly" | "authenticatedOrNot"
  ) {
    super(route, onReceived ?? (() => {}), authenticationStatus);
  }
}

export class ReadRouteImp<ENTITY, LOGGED_IN_OR_NOT, LOCALS extends (AuthenticateUserContext<any> | {})> extends ReadRoute<ENTITY, LOGGED_IN_OR_NOT, LOCALS> {
  constructor(
    route: string,
    public readonly _read: (
      context: AuthenticateUserContext<any> & ReadRouteContext<ENTITY>
    ) => void | Promise<void>,
    public readonly _onClientStartsListening: (context: AuthenticateUserContext<any> & ClientAndRouteContext) => void,
    public readonly _onClientStopsListening: (context: AuthenticateUserContext<any> & ClientAndRouteContext) => void,
    public readonly _toOutput: (entity: ENTITY) => any,
    onReceived:OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS>,
    authenticationStatus: "authenticatedOrNot" | "authenticatedOnly"
  ) {
    super(route, onReceived, authenticationStatus);
  }

  //override
  async handleRead(c): Promise<void> {
    const context:AuthenticateUserContext<any> & ReadRouteContext<ENTITY> = c as any;
    if (this._read) {
      try {
        return (await this._read(context));
      } catch (e) {
        if (e instanceof ErrorResponse) {
          context.errorCallback(e);
          return;
        }
        throw e;
      }
    }
    else throw Error("_read must not be null");
  }

  //override
  onClientStartsListening(c: ClientAndRouteContext) {
    const context = c as AuthenticateUserContext<any> & typeof c;
    if (this._onClientStartsListening)
      return this._onClientStartsListening(context);
    else
      this.askless.logger("onClientStartsListening is null", "debug");
  }

  //override
  onClientStopsListening(c: ClientAndRouteContext) {
    const context = c as AuthenticateUserContext<any> & typeof c;
    if (this._onClientStopsListening)
      return this._onClientStopsListening(context);
    else
      this.askless.logger("_onClientStopsListening is null", "debug");
  }

  //override
  toOutput(entity: ENTITY) {
    if (this._toOutput != null) {
      return this._toOutput(entity);
    } else {
      this.askless.logger("_toOutput is null", "debug");
      return entity;
    }
  }
}

export type SetEntityGetter<ENTITY> = { setEntityGetter: (getEntity: () => ENTITY) => void };
