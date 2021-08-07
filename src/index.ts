import * as WebSocket from "ws";
import { ServerOptions } from "ws";
import { SendMessageToClientAgainTask } from "./tasks/SendMessageToClientAgainTask";
import { environment } from "./environment";
import {
  ReadRoute,
  ReadRouteImp,
  RealtimeOutputHandlerContext,
  ReadRouteContext,
  NotifyClientsParams,
  RealtimeOutputHandlerResult,
  ReadParams,
  ReadRouteInRealtimeInstance,
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
  RespondErrorCode,
  RequestType,
} from "./client/Types";
import {ClientInfo} from "./client_middleware/Clients";


export class ServerError extends Error {
  constructor(
    message: string,
    public readonly code?: RespondErrorCode,
    public data?
  ) {
    super(message);
    if (this.code == null) this.code = RespondErrorCode.INTERNAL_ERROR;
  }
}

//WS fields
export const ws_isAlive = "isAlive";
export const ws_clientId = "clientId";
export const ws_clientType = "clientType";

export type SendMessageToClientCallback = (message: string) => void;
export type GrantConnection = (
  ownClientId?: string | number,
  headers?: Map<string, any>
) => Promise<boolean>;
export type Logger = (
  message: string,
  level: "info" | "debug" | "warning" | "error",
  additionalData?: Object
) => void;

/**
 * @param sendInternalErrorsToClient If `true`: server internal errors can be sent to the client (optional). <br>
 * Keep as `false` when the server is running in production. Default: `false`.
 *
 * @param projectName Name for this project. <br>
 * If `!= null`: the field `projectName` on client side must have the same name (optional).
 *
 * @param logger Allow you to customize the behavior of internal logs and enable/disable the default logger (optional).
 *
 * @param grantConnection Accepts or deny a connection attempt (optional). <br>
 * Check here if a token informed in headers is valid.<br>
 * Default: All connections attempts will be accept.<br>
 *
 * Type: `(ownClientId?, headers?) => Promise<boolean>`<br>
 *
 * @param requestTimeoutInSeconds Time in seconds that client can wait for a response after requesting it to the server (optional). <br>
 * If `<= 0`: Timeout error never will occur. Default: 15 seconds.
 *
 * @param wsOptions {@link https://github.com/websockets/ws/blob/0954abcebe027aa10eb4cb203fc717291e1b3dbd/doc/ws.md#new-websocketserveroptions-callback Official Documentation} -
 * The websocket configuration for the package {@link https://github.com/websockets/ws ws} (optional).
 * Default: port 3000.
 * */
export interface IServerConfiguration {
  /**
     * If `true`: server internal errors can be sent to the client (optional) . <br>
       Keep as `false` when the server is running in production. Default: `false` <br>.
     * */
  sendInternalErrorsToClient?: boolean;

  /*** Name for this project (optional).<br>
     If `!= null`: the field `projectName` on client side must have the same name (optional). <br> */
  projectName?: string;

  /**
   *  Allow you to customize the behavior of internal logs and enable/disable the default logger (optional). <br>
   *
   *  It's an object that can have the following fields:
   *
   *  <b> `useDefaultLogger?:boolean` </b>
   *
   *  If `true`: the default logger will be used (optional). Set to `false` on a production environment. Default: `false`
   *
   *  <b> customLogger </b>
   *
   *  Allows the implementation of a custom logger (optional). Let it `null` on a production environment
   *
   *  Type: `(message, level, additionalData?) => void`
   *
   *  @example
   *      server.init({
   *          logger: {
   *                  useDefaultLogger: false,
   *                  customLogger: (message, level, additionalData?: Object) => {
   *                      console.log(level+ ": "+message);
   *                      if(additionalData)
   *                          console.log(JSON.stringify(additionalData));
   *                  }
   *          },
   *      });
   */
  logger?: {
    //TODO?:
    //
    // Mostra TODOS os logs, habilitar antes de reportar uma {@link issue}
    //
    ///showAllLogs?:boolean,

    /**
     * If `true`: the default logger will be used (optional). Set to `false` on a production environment. Default: `false` <br>
     *
     * @example
     *      server.init({
     *          logger: {
     *                  customLogger: (message, level, additionalData?: Object) => {
     *                      console.log(level+ ": "+message);
     *                      if(additionalData)
     *                          console.log(JSON.stringify(additionalData));
     *                  };
     *          },
     *      });
     *
     * */
    useDefaultLogger?: boolean;


    /**
     * Allows the implementation of a custom logger (optional). Let it `null` on a production environment
     *
     * @example
     *      server.init({
     *          logger: {
     *              useDefaultLogger: true
     *          },
     *      });
     *
     * */
    customLogger?: Logger;
  };

  /**
   * Accepts or deny a connection attempt (optional). <br>
   * Check here if a token informed in headers is valid.<br>
   * Default: All connections attempts will be accept.<br>
   *
   * Type: `(ownClientId?, headers?) => Promise<boolean>`<br>
   *
   * @example
   *     server.init({
   *        grantConnection: async (ownClientId:string|number, headers:Map<string, any>) => {
   *            return (await checkIfIsValidToken(headers['Authorization']));
   *        },
   *     });
   *
   */
  grantConnection?: GrantConnection;

  /** Time in seconds that client can wait for a response after requesting it to the server (optional). <br>
  If `<= 0`: Timeout error never will occur. Default: 15 seconds. */
  requestTimeoutInSeconds?: number;

  /**
   * {@link https://github.com/websockets/ws/blob/0954abcebe027aa10eb4cb203fc717291e1b3dbd/doc/ws.md#new-websocketserveroptions-callback Official Documentation} -
   * The websocket configuration for the package {@link https://github.com/websockets/ws ws} (optional).
   * Default: port 3000.
   * */
  wsOptions?: ServerOptions;

  // internal: {
  //     // /**
  //     //  * `disconnectClientAfterSecondsWithoutClientPing`  Configuração interna. Tempo limite em segundos para o servidor desconectar um cliente que não fez PING (optional). Padrão: 38 segundos.
  //     //  * */
  //     // disconnectClientAfterSecondsWithoutClientPing?:number;
  //     // /**
  //     //  * `disconnectClientAfterSecondsWithoutClientPing` Configuração interna. Tempo mínimo (não preciso).
  //     //  * */
  //     // intervalInSecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient?:number;
  //     // intervalInSecondsClientPing?: number;
  //     // intervalInSecondsClientSendSameMessage?: number;
  //     // intervalInSecondsServerSendSameMessage?: number;
  //     // secondsToStopTryingToSendMessageAgainAndAgain?: number; //Doc: A mensagem será removida após enviada (não é perfeito), colocar como -1 para indefinido
  // }
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

/** @internal */
export class ServerInternalImp {
  wss: WebSocket.Server;
  started = false;
  config: IServerConfiguration;
  _logger: Logger;
  allRoutes: Array<Route> = [];
  readonly disconnectClientsWhoDidntPingTask = new DisconnectClientsWhoDidntPingTask(
    this
  );
  clientMiddleware: ClientMiddleware;
  readonly sendMessageToClientAgainTask: SendMessageToClientAgainTask = new SendMessageToClientAgainTask(
    this
  );
  readonly clearRuntimeDataFromDisconnectedClientTask: ClearRuntimeDataFromDisconnectedClientTask = new ClearRuntimeDataFromDisconnectedClientTask(
    this
  );

  private validateSetDefaultValuesInitConfig(
    config: IServerConfiguration
  ): void {
    if (config.requestTimeoutInSeconds == null)
      config.requestTimeoutInSeconds = 15;

    if (config.grantConnection == null) {
      config.grantConnection = (_, __) => Promise.resolve(true);
    }
    config["reconnectClientAfterSecondsWithoutServerPong"] = 10;
    config[
      "intervalInSecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"
    ] = 53; //(10x + 3 intervalInSecondsClientPong) dessa maneira, o cliente ainda poderá receber a resposta caso se reconectar
    config["disconnectClientAfterSecondsWithoutClientPing"] = 38;
    config["intervalInSecondsClientPing"] = 5;
    config["intervalInSecondsClientSendSameMessage"] = 5;
    config["intervalInSecondsServerSendSameMessage"] = 5;

    if (config.sendInternalErrorsToClient == null)
      config.sendInternalErrorsToClient = false;

    if (config.wsOptions == null)
      config.wsOptions = {
        port: 3000,
      };

    this._logger = (message, level, additionalData?: Object) => {
      if (config.logger?.useDefaultLogger) {
        console.log(level + ": " + message);
        if (additionalData)
          console.log(JSON.stringify(additionalData));
      }
      if (config.logger?.customLogger) {
        config.logger.customLogger(message, level, additionalData);
      }
    };
    if(config.logger?.useDefaultLogger){
      this._logger('\n'+
                  '****************************************************************************************\n' +
                  '** WARNING: useDefaultLogger is \'true\', SET it to \'false\' on a production environment **\n' +
                  '****************************************************************************************',
          "warning"
      );
    }
    if(config.logger?.customLogger){
      this._logger( '\n' +
          '*************************************************************************************************************************\n' +
          '** WARNING: You are using a customLogger, data content can appear on the logs (logs with \'debug\' level shows it a lot) **\n' +
          '*************************************************************************************************************************',
          "warning"
      );
    }
  }

  init(config: IServerConfiguration) {
    if (config == null) throw Error("config is null");
    if (this.config) throw Error("Already initialized");
    this.validateSetDefaultValuesInitConfig(config);
    this.config = config;
    this.wss = new WebSocket.Server(this.config.wsOptions);
    this.clientMiddleware = new ClientMiddleware(this);
  }

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

  start(): void {
    if (this.started) {
      console.error("server was already started");
      return;
    }
    if (!this.config) throw Error("you need to call server.init(..) first");
    const self = this;
    this.started = true;

    this.clientMiddleware.start();

    this.logger("Server started on " + this.localUrl, "info");

    this.sendMessageToClientAgainTask.start(
      this.config["intervalInSecondsServerSendSameMessage"] * 1000
    );
    this.disconnectClientsWhoDidntPingTask.start(
      this.config["disconnectClientAfterSecondsWithoutClientPing"] * 1000
    );
    this.clearRuntimeDataFromDisconnectedClientTask.start(
      this.config[
        "intervalInSecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"
      ] * 1000
    );
    //stopListeningFromRouteWhenClientDontConfirmReceiptInSeconds.start(this.config.stopListeningFromRouteWhenClientDontConfirmReceiptInSeconds * 1000);
  }

  getRoute(route: string, requestType: CrudRequestType): Route {
    //https://stackoverflow.com/questions/44851268/typescript-how-to-extract-the-generic-parameter-from-a-type
    for (let i = 0; i < this.allRoutes.length; i++) {
      const service = this.allRoutes[i] as Route;
      if (route == service.route && service.requestType == requestType) {
        return service;
      }
    }
    throw Error(
      "service not found: " +
        requestType.toString().toUpperCase() +
        "  " +
        route
    ); //TODO: enviar como resposta
  }

  getReadRoute(route: string): ReadRoute {
    const readRoute = this.allRoutes.find((r) => r.route == route);
    if (readRoute && readRoute instanceof ReadRoute) return readRoute;
    throw Error(
      'ReadRoute "' +
        route +
        '" not found on server ' +
        (this.config.projectName != null ? this.config.projectName : "") +
        ". Check if the ReadRoute " +
        route +
        " was created and set on the server"
    );
  }

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
      intervalInSecondsServerSendSameMessage: this.config[
        "intervalInSecondsServerSendSameMessage"
      ],
      intervalInSecondsClientSendSameMessage: this.config[
        "intervalInSecondsClientSendSameMessage"
      ],
      intervalInSecondsClientPing: this.config["intervalInSecondsClientPing"],
      disconnectClientAfterSecondsWithoutClientPing: this.config[
        "disconnectClientAfterSecondsWithoutClientPing"
      ],
      reconnectClientAfterSecondsWithoutServerPong: this.config[
        "reconnectClientAfterSecondsWithoutServerPong"
      ],
      isFromServer: true,
      serverVersion: environment.server.name,
      clientVersionCodeSupported: {
        lessThanOrEqual: clientVersionCodeSupported.lessThanOrEqual,
        moreThanOrEqual: clientVersionCodeSupported.moreThanOrEqual,
      },
      projectName: this.config.projectName,
      requestTimeoutInSeconds: this.config.requestTimeoutInSeconds,
    };
  }
}

export class AsklessServer {
  /** @internal */
  readonly server: ServerInternalImp = new ServerInternalImp();

  /**
   *  Initialize and configure the server.
   *  @param params {@link IServerConfiguration The server configuration}.
   * */
  init(params?: IServerConfiguration): void {
    this.server.init(params || {});
  }

  /**
   * Starts the server. <br>
   * This method must be called after the server have been fully configured with `init`.
   */
  start(): void {
    if (this.server.config == null)
      throw Error("You must call the method 'init' before 'start'");
    if (this.server.allRoutes == null)
      throw Error("You need to set the routes first");
    this.server.start();
  }

  get localUrl () : String {
    return this.server.localUrl;
  }

  /**
   *  Gets a READ route.
   *  @param readRoute The name of the route.
   * */
  getReadRoute(readRoute: string): ReadRoute {
    return this.server.getReadRoute(readRoute);
  }

  /**
   * Gets a route of the server.
   * @param route The name of the route.
   * @param requestType The type of operation that the route handles: `CREATE`, `READ`, `UPDATE` or `DELETE`.
   * */
  getRoute(
    route: string,
    requestType: CrudRequestType
  ):
    | CreateRoute
    | ReadRoute
    | UpdateRoute
    | DeleteRoute {
    return this.server.getRoute(route, requestType);
  }

  /**
   * Call this method whenever you want to notify the clients (who listen this `route`)
   * that `output` has changed, the way you can do this is by sending a new `output` in realtime.
   *
   * @param readRoute The name of the `READ` route.
   *
   * @param notify {@link NotifyClientsParams The params to notifyClients }.
   * */
  notifyClients(
    readRoute: string,
    notify: NotifyClientsParams
  ) {
    let readRouteInstance;
    try {
      readRouteInstance = this.getReadRoute(readRoute);
    } catch (e) {
      throw Error("notifyClients: Could not find the ReadRoute: " + readRoute);
    }
    readRouteInstance.notifyClients(notify);
  }

  /**
   * Adds a new route in the server.
   * {@link https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md More info}.
   * */
  addRoute(params: Array<Route> | Route): void {
    if (!params) throw Error("context.route must not be null");

    const routes: Array<Route> =
      params instanceof Array ? (params as Array<Route>) : [params];
    if (!routes.length || routes[0] == null)
      throw Error("context.route must not be empty");
    routes.forEach((route) => {
      if (route instanceof ReadRoute)
        route.server = this.server;
      this.server.allRoutes.push(route);
    });
    this.server.allRoutes.concat(routes);
  }

  /**
   * Adds a new `CREATE` route in the server.
   * {@link https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md More info}.
   * */
  addCreateRoute(params: CreateParams) {
    if (!params) throw Error("params must not be null");
    if (!params.route) throw Error("params.route must not be null");
    if (!params.create) throw Error("params.create must not be null");

    this.addRoute(new CreateRouteImp(params.route, params.create));
  }

  /**
   * Adds a new `READ` route in the server.
   * {@link https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md More info}.
   *
   * @returns {@link ReadRouteInRealtimeInstance}.
   * */
  addReadRoute(
    params: ReadParams
  ): ReadRouteInRealtimeInstance {
    if (!params) throw Error("params must not be null");
    if (!params.route) throw Error("params.route must not be null");

    const readRoute = new ReadRouteImp(
      params.route,
      params.realtimeOutputHandler,
      params.read,
      params.onClientStartsListening,
      params.onClientStopsListening,
    );
    this.addRoute(readRoute);

    return {
      notifyClients: (notify?: NotifyClientsParams) => {
        return new Promise(async (resolve, reject) => {
          setTimeout(
            () => {
              readRoute.notifyClients(notify);
              resolve();
            },
            readRoute.server ? 0 : 200
          );
        });
      },
    };
  }

  /**
   * Adds a new `UPDATE` route in the server.
   * {@link https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md More info}.
   * */
  addUpdateRoute(params: UpdateParams) {
    if (!params) throw Error("params must not be null");
    if (!params.update) throw Error("params.update must not be null");
    if (!params.route) throw Error("params.route must not be null");

    this.addRoute(new UpdateRouteImp(params.route, params.update));
  }

  /**
   * Adds a new `DELETE` route in the server.
   * {@link https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md More info}.
   * */
  addDeleteRoute(params: DeleteParams) {
    if (!params) throw Error("params must not be null");
    if (!params.delete) throw Error("params.delete must not be null");
    if (!params.route) throw Error("params.route must not be null");

    this.addRoute(new DeleteRouteImp(params.route, params.delete));
  }

  /**
   * Disconnects a client.
   *
   * @param ownClientId Client ID set when the client side called the method `connect`.
   * */
  disconnectClient(ownClientId: string): void {
    if (ownClientId == null)
      throw Error("You cannot disconnect a client without an App generated ID");
    try {
      const clientInfo:ClientInfo = this.server.clientMiddleware.clients.getClientInfo(ownClientId);
      if(clientInfo?.doWsDisconnect) {
        clientInfo.doWsDisconnect();
      }
    } catch (e) {
      this.server.logger("Could not disconnect the client " + ownClientId, "error", e.stack);
    }
  }
}

export {RespondSuccess} from "./client/response/RespondSuccess";
export {RespondError} from "./client/response/RespondError";
export {NewDataForListener} from "./client/response/NewDataForListen";
export {CreateRoute, CreateRouteContext} from "./route/CreateRoute";
export {ReadRoute, ReadRouteContext, RealtimeOutputHandlerResult, RealtimeOutputHandlerContext} from "./route/ReadRoute";
export {UpdateRoute, UpdateRouteContext} from "./route/UpdateRoute";
export {DeleteRoute, DeleteRouteContext} from "./route/DeleteRoute";
export {Route} from "./route/Route";
export {RespondErrorCode,} from "./client/Types";
