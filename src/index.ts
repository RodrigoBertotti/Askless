import * as WebSocket from "ws";
import { ServerOptions } from "ws";
import { SendMessageToClientAgainTask } from "./tasks/SendMessageToClientAgainTask";
import { environment } from "./environment";
import {
  ReadRoute,
  ReadRouteImp,
  ReadRouteContext,
  NotifyChangesParams,
  ReadParams,
  ReadRouteInstance, ClientAndRouteContext,
} from "./route/ReadRoute";
import {
  CreateFunc,
  CreateParams,
  CreateRoute,
  CreateRouteContext,
  CreateRouteImp,
} from "./route/CreateRoute";
import {
  UpdateFunc,
  UpdateParams,
  UpdateRoute,
  UpdateRouteImp,
} from "./route/UpdateRoute";
import {
  DeleteFunc,
  DeleteParams,
  DeleteRoute,
  DeleteRouteImp,
} from "./route/DeleteRoute";
import { Route } from "./route/Route";
import { ClientMiddleware } from "./client_middleware/ClientMiddleware";
import { DisconnectClientsWhoDidntPingTask } from "./tasks/DisconnectClientsWhoDidntPingTask";
import { ClearRuntimeDataFromDisconnectedClientTask } from "./tasks/ClearClientsThoseDisconnectedAfterATimeTask";
import {
  CrudRequestType,
  AsklessErrorCode,
} from "./client/Types";
import {AddInternalRoutesForCalls} from "./internal_routes/AddInternalRoutesForCalls";
import {StopListeningEventEvent} from "./client/response/StopListeningEventEvent";
import {AddInternalRoutesForAuthentication} from "./internal_routes/AddInternalRoutesForAuthentication";

export class ServerError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public data?
  ) {
    super(message);
    if (this.code == null) this.code = AsklessErrorCode.INTERNAL_ERROR;
  }
}

//WS fields
export const ws_isAlive = "isAlive";
export const ws_clientIdInternalApp = "clientIdInternalApp";
export const ws_clientType = "clientType";

export type SendMessageToClientCallback = (message: string) => void;
export type AcceptConnectionAuthenticatedParams<USER_ID> = { userId: USER_ID, claims?:string[], locals?:object };
export type AcceptAuthentication<USER_ID> = { asAuthenticatedUser: (params: AcceptConnectionAuthenticatedParams<USER_ID>) => void, asUnauthenticatedUser: () => void };
export type RejectConnectionParams = { credentialErrorCode?:string };
export type RejectAuthentication = (params?: RejectConnectionParams) => void;

export type Authenticate<USER_ID> = (
    credential,
    accept: AcceptAuthentication<USER_ID>,
    reject: RejectAuthentication,
) => Promise<void> | void;

export type Logger = (
  message: string,
  level: "info" | "debug" | "warning" | "error",
  additionalData?: Object
) => void;

/**
 *  <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md Click here to check documentation in full details}
 * */
export interface IServerConfiguration<USER_ID> {

  /**
   {@link https://github.com/RodrigoBertotti/askless/documentation.md <b>Click here to check the documentation in more details </b>}.

   Handles the client-side authentication request attempt (optional). <br>
   You can choose to either:
   - accept as an authenticated user: `accept.asAuthenticatedUser(userId: 1, claims: [], locals: {})` or `accept.asAuthenticatedUser(userId: 1)`
   - accept as an unauthenticated user: `accept.asUnauthenticatedUser()`
   - or reject the authentication attempt: `reject()` or `reject({credentialErrorCode: "MY_ERROR_CODE"})`

   `credential` is the value the client informed in the client side
   in the connection attempt.

   @example
   server.init({
        // ...
        authenticate: async (credential, accept, reject) => {
            if (credential && credential["accessToken"]) {
                const result = verifyJwtAccessToken(credential["accessToken"]);
                if (!result.valid) {
                    // To reject the connection attempt
                    reject({credentialErrorCode: "EXPIRED_ACCESS_TOKEN"});
                    return;
                }
                // To accept the connection attempt as an authenticated user
                accept.asAuthenticatedUser({ userId: result.userId,  });
            } else {
                // To accept the connection attempt as an unauthenticated user
                accept.asUnauthenticatedUser();
            }
        },
    });
  */
  authenticate?: Authenticate<USER_ID>;

  /**
     If `true`: askless internal errors can be sent to the client (optional) . <br>
     Keep as `false` when the askless is running in production. Default: `false` <br>.
  * */
  sendInternalErrorsToClient?: boolean;

  /** Show Askless internal logs for debugging (optional).
   * Keep as `false` when the askless is running in production.
   * Default: `false` */
  debugLogs?:boolean;

  /** Time in milliseconds that client can wait for a response after requesting it to Askless (optional). <br>
  If `<= 0`: Timeout error never will occur. Default: 7000 (7 seconds). */
  requestTimeoutInMs?: number;

  /**
   * If the logged user is not authenticated in the Flutter App, this is the timeout in milliseconds
   * to wait for the authentication when performing a request to a route that requires authentication.
   *
   * This delay is useful in cases where the user is performing a request while the access token is being refreshed at the same time.
   *
   * no-op:
   *  - no-op when performing a request when the user is already authenticated
   *  - no-op when performing a request for a route that doesn't require authentication.
   *  - no-op when `neverTimeout` is set to true in the request attempt
  */
  waitForAuthenticationTimeoutInMs?:number;

  /**
   * {@link https://github.com/websockets/ws/blob/cd89e077f68ba9a999d408cb4fdb3e91289096a7/doc/ws.md#class-websocketserver Official Documentation} <br>
   * The websocket configuration for {@link https://github.com/websockets/ws ws} (optional).
   * Default: `{ port: 3000 }`.
   * */
  wsOptions?: ServerOptions;
}

//https://stackoverflow.com/a/8440736/4508758
function myIPv4() {
  const nets = require('os').networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

export type AuthenticateUserContext<USER_ID> = {
  /** The user ID is performing the request. */
  userId: USER_ID,

  /**
   * The claims the user is performing the request has
   *
   * @example
   * ["admin"]
   * */
  claims: string[],
};

/**
 * {@link https://github.com/RodrigoBertotti/askless/documentation.md <b>Click here to check the documentation in more details </b>}.
 * */
export type AuthenticateUserOrNotContext<USER_ID> = {
  /** The user ID is performing the request. **Only in case the user is authenticated, otherwise is `undefined`.**.  */
  userId?: USER_ID | undefined,

  /**
   * The claims the user is performing the request has. **Only in case the user is authenticated, otherwise is `undefined`.**.
   *
   * @example
   * ["admin"]
   * */
  claims?: string[] | undefined,
};

/** Welcome to Askless, Please <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md click here to check documentation in full details}.</b> */
export class AsklessServer<USER_ID = string | number> {

  /**
   *  Initialize the server.
   *  @param config {@link IServerConfiguration The askless configuration}.
   *
   *  <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md Click here to check documentation in full details}
   * */
  init(config?: IServerConfiguration<USER_ID>): void {
    if (config == null) throw Error("config is null");
    if (this.config) throw Error("Already initialized");
    this.validateSetDefaultValuesInitConfig(config);
    this.config = config;
    this.wss = new WebSocket.Server(this.config.wsOptions);
    this.clientMiddleware = new ClientMiddleware(this);
    new AddInternalRoutesForCalls().run(this as AsklessServer<string|number>);
    new AddInternalRoutesForAuthentication().run(this as AsklessServer<string|number>);
  }

  /** @internal */
  wss: WebSocket.Server;
  /** @internal */
  startedAt?:Date;
  /** @internal */
  config: IServerConfiguration<USER_ID>;
  /** @internal */
  _logger: Logger;
  /** @internal */
  allRoutes: Array<Route<any>> = [];
  /** @internal */
  clientMiddleware: ClientMiddleware;

  /** @internal */
  readonly disconnectClientsWhoDidntPingTask = new DisconnectClientsWhoDidntPingTask(this);
  /** @internal */
  readonly sendMessageToClientAgainTask: SendMessageToClientAgainTask = new SendMessageToClientAgainTask(this);
  /** @internal */
  readonly clearRuntimeDataFromDisconnectedClientTask: ClearRuntimeDataFromDisconnectedClientTask = new ClearRuntimeDataFromDisconnectedClientTask(this);

  private validateSetDefaultValuesInitConfig(
      config: IServerConfiguration<USER_ID>
  ): void {
    if (config.requestTimeoutInMs == null) {
      config.requestTimeoutInMs = 7 * 1000;
    }
    if (config.waitForAuthenticationTimeoutInMs == null) {
      config.waitForAuthenticationTimeoutInMs = 4 * 1000;
    }

    if (config.authenticate == null) {
      config.authenticate = async (_, accept) => { accept.asUnauthenticatedUser(); }
    }
    config["reconnectClientAfterMillisecondsWithoutServerPong"] = 6 * 1000;
    config[
        "intervalInMillsecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"
    ] = 53 * 1000; //(10x + 3 intervalInSecondsClientPong) in this way, the client can still receive the responde in case he disconnects
    config["millisecondsToDisconnectClientAfterWithoutClientPing"] = 12 * 1000;
    config["intervalInMsClientPing"] = 1000;
    config["intervalInMsClientSendSameMessage"] = 5 * 1000;
    config["intervalInMsServerSendSameMessage"] = 5 * 1000;
    config["millisecondsToStopTryingToSendMessage"] = 40 * 1000;

    if (config["millisecondsToDisconnectClientAfterWithoutClientPing"] <= config["intervalInMsClientPing"]) {
      throw 'Askless: "millisecondsToDisconnectClientAfterWithoutClientPing" should be BIGGER than "intervalInMsClientPing"';
    }
    if (config["millisecondsToDisconnectClientAfterWithoutClientPing"] <= config["reconnectClientAfterMillisecondsWithoutServerPong"]) {
      throw 'Askless: "millisecondsToDisconnectClientAfterWithoutClientPing" should be BIGGER than "reconnectClientAfterMillisecondsWithoutServerPong"';
    }
    if (config["millisecondsToDisconnectClientAfterWithoutClientPing"] > config["intervalInMillsecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"]) {
      throw 'Askless: "millisecondsToDisconnectClientAfterWithoutClientPing" should be SMALLER than "intervalInMillsecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"';
    }

    if (config.sendInternalErrorsToClient == null)
      config.sendInternalErrorsToClient = false;

    if (config.wsOptions == null)
      config.wsOptions = { port: 3000, };

    this._logger = (message, level, additionalData?: Object) => {
      if (level != "debug" || config.debugLogs) {
        console.log(level + ": " + message);
        if (additionalData)
          console.log(JSON.stringify(additionalData));
      }
    };
    if(config.debugLogs){
      this._logger( '\n' +
          '***********************************************************************************\n' +
          '** WARNING: debugLogs is true, set it to false in a production environment       **\n' +
          '***********************************************************************************\n',
          "warning"
      );
    }
  }

  /** @internal */
  logger(
      message: string,
      level: "info" | "debug" | "warning" | "error",
      additionalData?: Object
  ) {
    return this._logger(message, level, additionalData);
  }

  get localUrl () : String {
    return 'ws://'+myIPv4()+':'+(this.wss.options.port?.toString() ?? '????');
  }

  /** @internal */
  getConnectionConfiguration(clientType:'flutter'|'javascript') {
    let clientVersionCodeSupported;
    if(clientType==="javascript"){
      clientVersionCodeSupported = environment.server.clientVersionCodeSupported.javascript;
    }else if(clientType == 'flutter' || clientType == null){
      clientVersionCodeSupported = environment.server.clientVersionCodeSupported.flutter;
    }else{
      throw Error("Invalid clientType: "+clientType);
    }

    return {
      intervalInMsServerSendSameMessage: this.config["intervalInMsServerSendSameMessage"],
      intervalInMsClientSendSameMessage: this.config["intervalInMsClientSendSameMessage"],
      intervalInMsClientPing: this.config["intervalInMsClientPing"],
      millisecondsToDisconnectClientAfterWithoutClientPing: this.config["millisecondsToDisconnectClientAfterWithoutClientPing"],
      reconnectClientAfterMillisecondsWithoutServerPong: this.config["reconnectClientAfterMillisecondsWithoutServerPong"],
      waitForAuthenticationTimeoutInMs: this.config["waitForAuthenticationTimeoutInMs"],
      requestTimeoutInMs: this.config["requestTimeoutInMs"],
      isFromServer: true,
      serverVersion: environment.server.name,
      clientVersionCodeSupported: {
        lessThanOrEqual: clientVersionCodeSupported.lessThanOrEqual,
        moreThanOrEqual: clientVersionCodeSupported.moreThanOrEqual,
      },
    };
  }

  /**
   * Starts the server. <br>
   * This method must be called after the server has been fully configured with `init(..)`.
   *
   *  <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md Click here to check documentation in full details}
   */
  start(): void {
    if (this.config == null)
      throw Error("You must call the method 'init' before 'start'");
    if (this.allRoutes == null)
      throw Error("You need to set the routes first");

    if (this.startedAt) {
      console.error("askless was already started");
      return;
    }
    if (!this.config) throw Error("you need to call askless.init(..) first");
    const self = this;
    this.startedAt = new Date();

    this.clientMiddleware.start();

    this.logger("Server started on " + this.localUrl, "info");

    this.sendMessageToClientAgainTask.start(
        this.config["intervalInMsServerSendSameMessage"]
    );
    this.disconnectClientsWhoDidntPingTask.start(
        (this.config["millisecondsToDisconnectClientAfterWithoutClientPing"]) + 8
    );
    this.clearRuntimeDataFromDisconnectedClientTask.start(
        this.config[
            "intervalInMillsecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"
        ]
    );
    //stopListeningFromRouteWhenClientDontConfirmReceiptInSeconds.start(this.config.stopListeningFromRouteWhenClientDontConfirmReceiptInSeconds * 1000);
  }

  /**
   * To register a new route so the App side can interact to by reading/listening, creating, updating or deleting.
   * <br>
   * <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md Click here to check documentation in full details}
   *  */
  readonly addRoute: AddRouteFor<USER_ID> = new AddRouteFor<USER_ID>(this);

  getRoute<ENTITY>(route: string, requestType: CrudRequestType): Route<ENTITY> {
    //https://stackoverflow.com/questions/44851268/typescript-how-to-extract-the-generic-parameter-from-a-type
    for (let i = 0; i < this.allRoutes.length; i++) {
      const service = this.allRoutes[i];
      if (route == service.route && service.requestType == requestType) {
        return service;
      }
    }
    throw new ServerError(
        "route not found: " +
        requestType.toString().toUpperCase() +
        " " +
        route,
        AsklessErrorCode.INVALID_ROUTE,
    );
  }

  getReadRoute<ENTITY = any, LOCALS extends { [key: string]: any } = {}>(route: string): ReadRoute<ENTITY, LOCALS, AuthenticateUserContext<any> | {}> {
    const readRoute = this.allRoutes.find((r) => r.route == route);
    if (readRoute && readRoute instanceof ReadRoute){
      return readRoute;
    }
    throw new ServerError(
        'ReadRoute "' +
        route +
        '" not found on server ' +
        ". Check if the ReadRoute " +
        route +
        " was created and set on this server",
        AsklessErrorCode.INVALID_ROUTE,
    );
  }

  /**
   * Makes a user as not authenticated anymore.
   *  <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md Click here to check documentation in full details}
   *  */
  clearAuthentication(userId: USER_ID) {
    return Array.from(this.clientMiddleware.clients.getAllClientsInfos().values())
        .find((user) => user.userId == (userId as any))
        ?.clearAuthentication();
  }
}

export {AsklessError} from "./client/response/AsklessError";
export {NewDataForListener} from "./client/response/NewDataForListen";
export {CreateRoute, CreateRouteContext} from "./route/CreateRoute";
export {ReadRoute, ReadRouteContext} from "./route/ReadRoute";
export {UpdateRoute, UpdateRouteContext} from "./route/UpdateRoute";
export {DeleteRoute, DeleteRouteContext} from "./route/DeleteRoute";
export {Route} from "./route/Route";
export {AsklessErrorCode,} from "./client/Types";


/**  <b>{@link https://github.com/RodrigoBertotti/askless/documentation.md Click here to check documentation in full details} */
class AddRoutes<LOGGED_IN_OR_NOT extends (AuthenticateUserContext<any> | {})> {

  constructor(
      /** @internal */
      readonly askless:AsklessServer<any>,
      /** @internal */
      readonly authenticationStatus: "authenticatedOrNot" | "authenticatedOnly"
  ) {}

  /**
   * Adds a new route.
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the routes documentation </b>}.
   * */
  private addRoute<ENTITY = any>(params: Array<Route<ENTITY>> | Route<ENTITY>): void {
    if (!params) throw Error("context.route must not be null");

    const routes: Array<Route<ENTITY>> =
        params instanceof Array ? (params as Array<Route<ENTITY>>) : [params];
    if (!routes.length || routes[0] == null)
      throw Error("context.route must not be empty");
    routes.forEach((route) => {
      if (route instanceof ReadRoute)
        route.askless = this.askless;
      this.askless.allRoutes.push(route as Route<any>);
    });
    this.askless.allRoutes.concat(routes as Array<Route<any>>);
  }

  /**
   * Adds a new route to create data
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the routes documentation </b>}.
   * */
  create<ENTITY = any, LOCALS extends { [key: string]: any } = {}>(params: CreateParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS>) : void {
    if (!params) throw Error("params must not be null");
    if (!params.route) throw Error("params.route must not be null");
    if (!params.handleCreate) throw Error("params.create must not be null");

    this.addRoute(new CreateRouteImp<ENTITY,LOGGED_IN_OR_NOT, LOCALS>(params.route, params.handleCreate, params.onReceived, params.toOutput, this.authenticationStatus));
  }

  /**
   * Adds a route to read and stream (listen) data.
   *
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the routes documentation </b>}.
   *
   * @returns {@link ReadRouteInstance}.
   * */
  read<ENTITY = any, LOCALS extends { [key: string]: any } = {}>(params: ReadParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS>): ReadRouteInstance<ENTITY, LOGGED_IN_OR_NOT, LOCALS> {
    if (!params) throw Error("params must not be null");
    if (!params.route) throw Error("params.route must not be null");

    const readRoute = new ReadRouteImp<ENTITY, LOGGED_IN_OR_NOT, LOCALS> (
        params.route,
        (c) => {
          // noinspection UnnecessaryLocalVariableJS
          const context:AuthenticateUserContext<any> & ReadRouteContext<ENTITY> = c;
          return params.handleRead(context as any);
        },
        params.onClientStartsListening == null ? null : (c) => {
          // noinspection UnnecessaryLocalVariableJS
          const context: AuthenticateUserContext<any> & ClientAndRouteContext = c;
          return params.onClientStartsListening(context as any);
        },
        params.onClientStopsListening == null ? null : (c) => {
          // noinspection UnnecessaryLocalVariableJS
          const context: AuthenticateUserContext<any> & ClientAndRouteContext = c;
          return params.onClientStopsListening(context as any);
        },
        params.toOutput,
        params.onReceived,
        this.authenticationStatus,
    );
    this.addRoute(readRoute);

    return {
      stopListening: (userId) => {
        if (userId == null) {
          throw Error("stopListening: userId should not be null");
        }
        const clientInfo = this.askless.clientMiddleware.getClientInfoByUserId(userId);
        const sendMessage = clientInfo?.sendMessage;
        if (sendMessage) {
          for (const r of clientInfo.routesBeingListen) {
            if (r.route == readRoute.route) {
              sendMessage(JSON.stringify(new StopListeningEventEvent(r.listenId)));
            }
          }
        }
      },
      notifyChanges: (notify?: NotifyChangesParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS>) => {
        return new Promise(async (resolve, reject) => {
          setTimeout(
              () => {
                readRoute.notifyChanges(notify);
                resolve(null);
              },
              readRoute.askless ? 0 : 200
          );
        });
      },
    };
  }

  /**
   * Adds a new route to update data
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the routes documentation </b>}.
   * * */
  update<ENTITY = any, LOCALS extends { [key: string]: any } = {}>(params: UpdateParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS>) {
    if (!params) throw Error("params must not be null");
    if (!params.handleUpdate) throw Error("params.update must not be null");
    if (!params.route) throw Error("params.route must not be null");

    this.addRoute(new UpdateRouteImp(params.route, params.handleUpdate, params.onReceived, params.toOutput, this.authenticationStatus));
  }

  /**
   * Adds a new route to delete data
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the routes documentation </b>}.
   * */
  delete<ENTITY = any, LOCALS extends { [key: string]: any } = {}>(params: DeleteParams<ENTITY, LOGGED_IN_OR_NOT, LOCALS>) {
    if (!params) throw Error("params must not be null");
    if (!params.handleDelete) throw Error("params.delete must not be null");
    if (!params.route) throw Error("params.route must not be null");

    this.addRoute(new DeleteRouteImp<ENTITY, LOGGED_IN_OR_NOT, LOCALS>(
        params.route, params.handleDelete,
        params.onReceived,
        params.toOutput,
        this.authenticationStatus,
    ));
  }
}

/** {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the routes documentation </b>}. */
class AddRouteFor <USER_ID> {
  constructor(private readonly askless:AsklessServer<USER_ID>) {}

  /** To create a route where only authenticated users can access.
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the routes documentation </b>}.
   * */
  readonly forAuthenticatedUsers:AddRoutes<AuthenticateUserContext<USER_ID>> = new AddRoutes<AuthenticateUserContext<USER_ID>>(this.askless, "authenticatedOnly");

  /** To create a route where non-authenticated and authenticated users can access.
   * {@link https://github.com/RodrigoBertotti/askless/documentation.md#routes <b>Click here to check the routes documentation </b>}.
   * */
  readonly forAllUsers:AddRoutes<AuthenticateUserOrNotContext<USER_ID>> = new AddRoutes<AuthenticateUserOrNotContext<USER_ID>>(this.askless, "authenticatedOrNot");
}
