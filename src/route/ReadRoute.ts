import { ClientInfo, RouteBeingListen } from "../client_middleware/Clients";
import { Utils } from "../client/Utils";
import {
  ResponseCli,
  ServerConfirmReceiptCli,
} from "../client/response/OtherResponses";
import {NewDataForListener, RespondErrorCode} from "..";
import { ServerInternalImp } from "../index";
import {RespondSuccess} from "..";
import {RespondError} from "..";
import {CrudRequestType} from "../client/Types";
import {RespondSuccessParams} from "../client/response/RespondSuccess";
import {RespondErrorParams} from "../client/response/RespondError";

export type OnClientSuccessfullyReceives = (clientId: number | string) => void;

export type OnClientFailsToReceive = (clientId: number | string) => void;

/**
 * Params for the method {@link ReadRoute.notifyClients notifyClients}, being them:
 *
 * - {@link NotifyClientsParams.output output}
 *
 * - {@link NotifyClientsParams.sendToSpecificClientsIds sendToSpecificClientsIds}
 *
 * - {@link NotifyClientsParams.onClientSuccessfullyReceives onClientSuccessfullyReceives}
 *
 * - {@link NotifyClientsParams.onClientFailsToReceive onClientFailsToReceive}
 *
 * */
export interface NotifyClientsParams {
  /**
     Data that the clients will receive or the flag `RUN_READ_ONCE` (boolean). <br>

     By default, `output = RUN_READ_ONCE`, so
     `read` will be run for each client when `notifyClients`
     is called, in this way, the output of `read` will be sent.
     Assuming that `read` do a query in a database, this can be a costly operation,
     because for each client that are `listen`
     `read` will run, in other words, it can be executed a lot of operations in
     the database
     (equal to the number of clients who are listening `route`). <br>

     If `output== null`: Client will receive the value `null` on `output`. <br>

     It's recommend to set `output` when it DOESN'T CHANGE
     depending on `ownClientId`. <br>

     Example:<br>

     Consider a `read` route called `getCoupon` as being responsible
     for reading and sending realtime messages to clients that
     a new coupon is available and can be used for shopping. <br>

     Option 1: `output` receives the coupon value <br>

     Best option in case where `getCoupon` is responsible to send a generic message
     to **all** clients <br>

     <pre><code>
     notifyClients({
        output: {
            "message": "New coupon CLOTHES20 available for all customers!",
            "coupon": "CLOTHES20"
        }
     });
     </pre></code>

     Option 2: `output: "RUN_READ_ONCE"`: <br>

     Best option in case where **each** client will receive a **different** message and coupon: <br>

     `notifyClients({output:"RUN_READ_ONCE"})` <br>

     or just: <br>

     `notifyClients()` <br>

     The output of `read` will be the `output` that will be sent to each client.

     *
     * */
  output: any;

  /**
     Optional. <br>

     If `!= null`: Only specific `clientId` will receive `output`. <br>

     If `null`: all clients who are listening will receive `output` (default) *. <br>

     <br>

     \* Another way of defining who will receive `output` is by implementing
     `realtimeOutputHandler`. <br>

     Use `sendToSpecificClientsIds` only when is possible to know previously which
     clients will receive the `output`.
     */
  sendToSpecificClientsIds?: Array<number | string>;

  /** Callback that is triggered when the client receives `output` (optional).*/
  onClientSuccessfullyReceives?: OnClientSuccessfullyReceives;

  /** Callback that is triggered when the client didn't receive `output` (optional).*/
  onClientFailsToReceive?: OnClientFailsToReceive;
}

/**
 * Params for the output of {@link ReadRoute.realtimeOutputHandler realtimeOutputHandler}, being them:
 *
 * - {@link RealtimeOutputHandlerResult.customOutput customOutput}
 *
 * - {@link RealtimeOutputHandlerResult.notifyThisClient notifyThisClient}
 *
 * - {@link RealtimeOutputHandlerResult.onClientSuccessfullyReceives onClientSuccessfullyReceives}
 *
 * - {@link RealtimeOutputHandlerResult.onClientFailsToReceive onClientFailsToReceive}
 * */
export interface RealtimeOutputHandlerResult {
  //  SE COLOCAR UM CAMPO OBRIGATÓRIO AQUI (ATÉ AGORA TODOS SÃO OPCIONAIS)
  //  PESQUISAR NO PROJETO POR #LINK_PROJECT_RealtimeOutputHandlerCHANGED
  //  E APLICAR AS MUDANÇAS DEVIDAS

  /**
     The customized `output` that the client will receive (optional). <br>
     Default: client will receive the original `output`. */
  customOutput?: any;
  /**
     Optional. If true: {@link ReadRouteContext.ownClientId ownClientId} will receive `output`/`customOutput` (default).
     If false: the client will not be notified.
  */
  notifyThisClient?: boolean;
  /** Callback that is triggered when
     the client receives the `output`/`customOutput` (optional) */
  onClientSuccessfullyReceives?: OnClientSuccessfullyReceives;
  /** Callback that is triggered when
     the client did\'nt receive the `output`/`customOutput`  */
  onClientFailsToReceive?: OnClientFailsToReceive;
}

export interface RealtimeOutputHandlerContext {
  /** The data that the client would receive. */
  readonly output: any;
  /** Client ID set when the client side called the method `connect`. */
  readonly ownClientId: string | number | undefined;
  /** object set by the client for this request. */
  readonly query:object;
  /** Headers set when the method `connect` was called in the client side */
  readonly headers: object;
}

export interface ReadRouteContext {
  readonly query:object;
  readonly ownClientId: string | number | undefined;
  readonly headers: object;
  readonly respondSuccess : (response?:RespondSuccessParams) => void;
  readonly respondError : (response?:RespondErrorParams) => void;
}

export class ReadParams {
  /** The READ route name */
  route: string;

  /**
     Implement a behaviour to `READ` data. <br>

     Server can use `read` when: <br>

     - Client do a `read` <br>
     - Client starts a `listen`, so, `read` will send the first `output` <br>
     - When the server calls {@link ReadRoute.notifyClients notifyClients}
     with {@link NotifyClientsParams.output output == "RUN_READ_ONCE"}


     * @param context:
     * {@link ReadRouteContext.query query }<br>
     * {@link ReadRouteContext.ownClientId ownClientId }<br>
     * {@link ReadRouteContext.headers headers }<br>
     * {@link ReadRouteContext.respondSuccess respondSuccess(...) }<br>
     * {@link ReadRouteContext.respondError respondError(...) }<br>

     Each `route` must call {@link ReadRouteContext.respondSuccess respondSuccess(...)}
     or {@link ReadRouteContext.respondError respondError(...)}
     to finish the request.
  */
  read: (
    context: ReadRouteContext
  ) => void;

  /** After `notifyClients` is called,
     `realtimeOutputHandler` can customize and filter the final `output`. <br>

      Acts as a final middleware of `output` to EACH* `client`
      that are listening the `route`, making possible: <br>

      - filter which clients will receive the `output` by setting the flag {@link RealtimeOutputHandlerResult.notifyThisClient notifyThisClient} <br>

      - customize the final `output` by setting the field {@link RealtimeOutputHandlerResult.customOutput customOutput} <br>

      - Add the callbacks {@link RealtimeOutputHandlerResult.onClientSuccessfullyReceives onClientSuccessfullyReceives} and
      {@link RealtimeOutputHandlerResult.onClientFailsToReceive onClientFailsToReceive} <br>

      \* Only specific clients when {@link NotifyClientsParams.sendToSpecificClientsIds sendToSpecificClientsIds}
      is set. Otherwise, all clients that are listening the `route` will be notified. <br>

      @returns

      Can return an object that include: <br>

      - {@link RealtimeOutputHandlerResult.customOutput customOutput} The customized `output` that the client will receive (optional).
      Default: client will receive the original `output`. <br>

      - {@link RealtimeOutputHandlerResult.notifyThisClient notifyThisClient} Optional. If true: `ownClientId` will receive `output`/`customOutput` (default).
      If false: the client will not be notified. <br>

      - {@link RealtimeOutputHandlerResult.onClientSuccessfullyReceives onClientSuccessfullyReceives} Callback that is triggered when
      the client receives the `output`/`customOutput` (optional). <br>

      - {@link RealtimeOutputHandlerResult.onClientFailsToReceive onClientFailsToReceive}  Callback that is triggered when
      the client did\'nt receive the `output`/`customOutput` (optional). <br>

      @example
      realtimeOutputHandler: (context: RealtimeOutputHandlerContext) => {
         const chatMessage = context.output['chatMessage'];
         chatMessage['timestamp'] = Date.now(); //<- customOutput

         return {
             notifyThisClient:
                 chatMessage['senderId'] == context.ownClientId ||
                 chatMessage['receiverId'] == context.ownClientId,
             customOutput: chatMessage,
             onClientSuccessfullyReceives: (clientId) => console.log(" Client "+clientId+" received the message"),
             onClientFailsToReceive:  (clientId) => console.error("Client "+clientId+"  didn\'t receive the message"),
         };
      }
     * */
  realtimeOutputHandler?: (context: RealtimeOutputHandlerContext) => RealtimeOutputHandlerResult;



  /** Callback that is triggered when a client starts listening to `route`. */
  onClientStartsListening?: (context: {
    ownClientId: string | number | undefined;
    route: string;
  }) => void;

  /** Callback that is triggered when a client stops listening to `route`. */
  onClientStopsListening?: (context: {
    ownClientId: string | number | undefined;
    route: string;
  }) => void;
}

abstract class _ReadRoute {
  private readonly _type_read_route = "_";
  public readonly requestType: CrudRequestType = CrudRequestType.READ;

  /** @internal */
  public server4Flutter: ServerInternalImp;

  protected constructor(public readonly route: string) {}

  /**
     After `notifyClients` is called,
     `realtimeOutputHandler` can customize and filter the final `output`. <br>

     Acts as a final middleware of `output` to EACH* `client`
     that are listening the `route`, making possible: <br>

     - filter which clients will receive the `output` by setting the flag {@link RealtimeOutputHandlerResult.notifyThisClient notifyThisClient} <br>

     - customize the final `output` by setting the field {@link RealtimeOutputHandlerResult.customOutput customOutput} <br>

     - Add the callbacks {@link RealtimeOutputHandlerResult.onClientSuccessfullyReceives onClientSuccessfullyReceives} and
     {@link RealtimeOutputHandlerResult.onClientFailsToReceive onClientFailsToReceive} <br>

     \* Only specific clients when {@link NotifyClientsParams.sendToSpecificClientsIds sendToSpecificClientsIds}
     is set. Otherwise, all clients that are listening the `route` will be notified. <br>

     @returns

         Can return an object that include: <br>

     - {@link RealtimeOutputHandlerResult.customOutput customOutput} The customized `output` that the client will receive (optional).
     Default: client will receive the original `output`. <br>

     - {@link RealtimeOutputHandlerResult.notifyThisClient notifyThisClient} Optional. If true: `ownClientId` will receive `output`/`customOutput` (default).
     If false: the client will not be notified. <br>

     - {@link RealtimeOutputHandlerResult.onClientSuccessfullyReceives onClientSuccessfullyReceives} Callback that is triggered when
     the client receives the `output`/`customOutput` (optional). <br>

     - {@link RealtimeOutputHandlerResult.onClientFailsToReceive onClientFailsToReceive}  Callback that is triggered when
     the client did\'nt receive the `output`/`customOutput` (optional). <br>

     @example

     realtimeOutputHandler: (context: RealtimeOutputHandlerContext) => {
         const chatMessage = context.output['chatMessage'];
         chatMessage['timestamp'] = Date.now(); //<- customOutput

         return {
             notifyThisClient:
                 chatMessage['senderId'] == context.ownClientId ||
                 chatMessage['receiverId'] == context.ownClientId,
             customOutput: chatMessage,
             onClientSuccessfullyReceives: (clientId) => console.log(" Client "+clientId+" received the message"),
             onClientFailsToReceive:  (clientId) => console.error("Client "+clientId+"  didn\'t receive the message"),
         };
      }
     * */
  public abstract realtimeOutputHandler(context: RealtimeOutputHandlerContext): RealtimeOutputHandlerResult; //#LINK_PROJECT_RealtimeOutputHandlerCHANGED



  /**
     Implement a behaviour to `READ` data. <br>

     Server can use `read` when: <br>

     - Client do a `read` <br>
     - Client starts a `listen`, so, `read` will send the first `output` <br>
     - When the server calls {@link ReadRoute.notifyClients notifyClients}
     with {@link NotifyClientsParams.output output == "RUN_READ_ONCE"}


     * @param context
     * {@link ReadRouteContext.query query },
     * {@link ReadRouteContext.ownClientId ownClientId } and
     * {@link ReadRouteContext.headers headers }<br>
     * {@link ReadRouteContext.respondSuccess respondSuccess(...) }<br>
     * {@link ReadRouteContext.respondError respondError(...) }<br>

     Each `route` must call {@link ReadRouteContext.respondSuccess respondSuccess(...)}
     or {@link ReadRouteContext.respondError respondError(...)}
     to finish the request.

   * */
  public abstract read(
    context: ReadRouteContext
  ): void;

  public readInternal(context): Promise<RespondSuccess | RespondError> {
    return new Promise((resolve) => {
      this.read({
        headers: context.headers,
        ownClientId: context.ownClientId,
        query: context.query,
        respondError: params => resolve(new RespondError(params)),
        respondSuccess: params => resolve(new RespondSuccess(params))
      })
    });
  };

  /**
   * Call this method whenever you want to notify the clients (who listen this `route`)
   * that `output` has changed, the way you can do this is by sending a new `output` in realtime.
   *
   * @param notifyClientsParams {@link NotifyClientsParams The params to notifyClients}.
   *
   * */
  notifyClients(notifyClientsParams?: NotifyClientsParams): void {
    // noinspection JSIgnoredPromiseFromCall
    this._notifyClientsAsync(notifyClientsParams);
  }

  async _notifyClientsAsync(
    notify?: NotifyClientsParams
  ): Promise<void> {
    this.server4Flutter.logger("notifyClients -> started " + notify.output + " " + this.route, "debug");

    if (
      notify &&
      notify.sendToSpecificClientsIds &&
      notify.sendToSpecificClientsIds.length == 0
    )
      throw Error(
        "notify.sendToSpecificClientsIds needs be null or an array with more than one element"
      );

    const clientId_info = this.server4Flutter.clientMiddleware.clients.getAllClientsInfos();

    for (let clientId in clientId_info) {
      if(clientId==null) //TODO: analisar porque está vindo aqui nulo, será que o delete não está funcionando direito?
        continue;

      this.server4Flutter.logger("notifyClients -> client " + clientId, "debug");
      if (!clientId_info.hasOwnProperty(clientId)) {
        continue;
      }
      if (
        notify &&
        notify.sendToSpecificClientsIds &&
        !notify.sendToSpecificClientsIds.includes(clientId)
      ) {
        this.server4Flutter.logger("notifyClients -> Ignoring client because not informed on sendToSpecificClientsIds" + clientId, "debug");
        continue;
      }

      const clientInfo = clientId_info[clientId] as ClientInfo;
      const routeClientListeningByThisClient = clientInfo.routesBeingListen.find((route) => route.route == this.route);

      if (routeClientListeningByThisClient == null) {
        this.server4Flutter.logger("notifyClients -> client " + clientId + " is not listening to " + this.route, "debug");
        continue;
      }

      this.server4Flutter.logger("notifyClients -> " + clientId + " listen to: " + clientInfo.routesBeingListen.length, "debug");

      // noinspection PointlessBooleanExpressionJS
      const response: RespondSuccess | RespondError =
        !notify || notify.output == "RUN_READ_ONCE"
          ? await this.readInternal({
              headers: clientInfo.headers,
              ownClientId: clientInfo.clientId,
              query: routeClientListeningByThisClient.query,
            })
          : new RespondSuccess({
              output: notify.output,
            });

      if (
        response == null ||
        (!(response instanceof RespondError) &&
          !(response instanceof RespondSuccess))
      )
        throw Error(
          "response of read " +
            this.route +
            " must be an instance of Success or RespondError"
        );

      if (response instanceof RespondSuccess) {
        this.server4Flutter.logger("notifyClients -> Notifying client " + clientId, "debug");

        const notifyClientOrNot =
          (await this.realtimeOutputHandler({
            //Check if the client will receive the response
            output: response.output,
            query: routeClientListeningByThisClient.query,
            ownClientId: Utils.getOwnClientId(clientId),
            headers: this.server4Flutter.clientMiddleware.clients.getHeaders(clientId),
          })) || ({} as RealtimeOutputHandlerResult); //<--- LINK_PROJECT_RealtimeOutputHandlerCHANGED: remover || ( {} as RealtimeOutputHandler)

        if (notifyClientOrNot == null) {
          //throw Error('The method realtimeOutputHandler of ' + this.route + ' must return a value');
        }
        if (notifyClientOrNot.constructor.name == "AsyncFunction") {
          throw Error("realtimeOutputHandler must not be async because of performance issues");
        }
        if (
          notifyClientOrNot.notifyThisClient != null &&
          notifyClientOrNot.notifyThisClient == false
        ) {
          this.server4Flutter.logger(this.route + ' - Client "' + clientId + '" will not receive notification, because realtimeOutputHandler', notify && notify.sendToSpecificClientsIds ? "warning" : "debug");
          return;
        }

        const output =
          notifyClientOrNot?.customOutput == null
            ? response.output
            : notifyClientOrNot.customOutput;
        this.server4Flutter.clientMiddleware.assertSendDataToClient(
          clientId,
          new NewDataForListener(
            output,
            routeClientListeningByThisClient.listenId
          ),
          true,
          () => {
            if (notify && notify.onClientSuccessfullyReceives)
              notify.onClientSuccessfullyReceives(clientId);
            if (
              notifyClientOrNot &&
              notifyClientOrNot.onClientSuccessfullyReceives
            )
              notifyClientOrNot.onClientSuccessfullyReceives(clientId);
          },
          () => {
            if (notify && notify.onClientFailsToReceive)
              notify.onClientFailsToReceive(clientId);
            if (notifyClientOrNot && notifyClientOrNot.onClientFailsToReceive)
              notifyClientOrNot.onClientFailsToReceive(clientId);
          }
        );
      } else {
        this.server4Flutter.logger("notifyClients -> " + this.route + " could not send the data, because read failed, try passing the output as parameter on notifyClients method", "error", response);
      }
    }

    //TODO sendToSpecificClientsIds log cliente ABC não está observando a rota
  }

  /** @internal */
  listen(
    clientId: string | number,
    clientRequestId: string,
    query: object,
    headers: object,
    listenId: string
  ): Promise<any> {
    const self = this;
    return new Promise(async (resolve, reject) => {
      self.stopListening(clientId, listenId, self.route);

      const clientInfo = self.server4Flutter.clientMiddleware.clients.getClientInfo(clientId);
      const start = new Date().getTime();

      clientInfo.routesBeingListen.push({
        clientId: clientId,
        listenId: listenId,
        route: self.route,
        query: query,
      });

      const WAIT = 1000; //After the listen started, wait one second to send the initial data
      const callback = async (output, error: boolean) => {
        const difference = new Date().getTime() - start;
        let successAndNowIsListening: boolean = true;
        if (difference < WAIT) await Utils.delay(WAIT - difference);
        if (error) {
          self.server4Flutter.logger("listen: READ error", "error", output);

          if (output.code == RespondErrorCode.PERMISSION_DENIED) {
            self.server4Flutter.logger("listen: the error is PERMISSION_DENIED, calling stopListening...", "error", output);
            self.stopListening(clientId, listenId, self.route);
            successAndNowIsListening = false;
            self.server4Flutter.clientMiddleware.assertSendDataToClient(
              clientId,
              new ResponseCli(clientRequestId, null, output),
              true,
              null,
              null
            );
          } else {
            self.server4Flutter.clientMiddleware.assertSendDataToClient(
              clientId,
              new ResponseCli(clientRequestId, listenId),
              true,
              null,
              null
            );
          }
        } else {
          self.server4Flutter.clientMiddleware.assertSendDataToClient(
            clientId,
            new ResponseCli(clientRequestId, listenId),
            true,
            null,
            null
          );
          self.server4Flutter.clientMiddleware.assertSendDataToClient(
            clientId,
            new NewDataForListener(output?.output, listenId),
            true,
            output?.onClientSuccessfullyReceives,
            output?.onClientFailsToReceive
          );
        }

        if (successAndNowIsListening && self.onClientStartsListening)
          self.onClientStartsListening({
            route: self.route,
            ownClientId: Utils.getOwnClientId(clientId),
          });
        else
          self.server4Flutter.logger("onClientStartsListening not called successAndNowIsListening : " + successAndNowIsListening.toString(), self.onClientStartsListening ? "error" : "debug");

        resolve(successAndNowIsListening ? listenId : null);
      };
      const response = await self.readInternal({
        query: query,
        ownClientId: Utils.getOwnClientId(clientId),
        headers: self.server4Flutter.clientMiddleware.clients.getHeaders(
          clientId
        ),
      });
      if (
        response == null ||
        (!(response instanceof RespondError) &&
          !(response instanceof RespondSuccess))
      )
        throw Error(
          "response of read " +
            this.route +
            " must be an instance of Success or RespondError"
        );

      if (response instanceof RespondError) {
        await callback(
          response.code == null
            ? {
                code: RespondErrorCode.INTERNAL_ERROR,
                description: response?.description,
                stack: response?.stack,
              }
            : response,
          true
        );
      } else {
        await callback(response as RespondSuccess, false);
      }
    });
  }

  /** Callback that is triggered when a client starts listening to `route`. */
  onClientStartsListening(context: {
    ownClientId: string | number | undefined;
    route: string;
  }) {}

  /** Callback that is triggered when a client stops listening to `route`. */
  onClientStopsListening(context: {
    ownClientId: string | number | undefined;
    route: string;
  }) {}

  /** @internal */
  stopListening(
    clientId: string | number,
    listenId?: string,
    route?: string
  ): void {

    if (clientId == null) throw Error("clientId is undefined");
    if (listenId == null && route != null)
      throw Error("please, inform the listenId");

    const clientInfo = this.server4Flutter.clientMiddleware.clients.getClientInfo(clientId);

    let remove: Array<RouteBeingListen> = [];
    if (listenId) {
      const s = clientInfo.routesBeingListen.find(
        (c) => c.listenId == listenId
      );
      if (s != null) remove = [s];
    } else {
      remove = clientInfo.routesBeingListen;
    }
    remove.forEach(async (p) => {
      await this.onClientStopsListening({
        route: route,
        ownClientId: Utils.getOwnClientId(p.clientId),
      });
    });
    remove.forEach((r) => {
          clientInfo.routesBeingListen.splice(
              clientInfo.routesBeingListen.indexOf(r),
              1
          );
        }
    );
  }
}

/**
 * Notify in realtime clients who are listening this route.
 * */
export interface ReadRouteInRealtimeInstance {
  /**
   * Call this method whenever you want to notify the clients (who listen this `route`)
   * that `output` has changed, the way you can do this is by sending a new `output` in realtime.
   *
   * @param readRoute The name of the `READ` route.
   *
   * @param notify {@link NotifyClientsParams The params to notifyClients }.
   *
   * */
  notifyClients: (notify?: NotifyClientsParams) => void;
}

export abstract class ReadRoute extends _ReadRoute {
  protected constructor(route: string) {
    super(route);
  }
}

export class ReadRouteImp extends ReadRoute {
  constructor(
    route: string,
    public readonly _realtimeOutputHandler: (
      context: RealtimeOutputHandlerContext
    ) => RealtimeOutputHandlerResult,
    public readonly _read: (
      context: ReadRouteContext
    ) => void,
    public readonly _onClientStartsListening: (context: {
      ownClientId: string | number | undefined;
      route: string;
    }) => void,
    public readonly _onClientStopsListening: (context: {
      ownClientId: string | number | undefined;
      route: string;
    }) => void
  ) {
    super(route);
  }

  //override
  read(
    context: ReadRouteContext
  ): void {
    if (this._read) return this._read(context);
    else throw Error("_read must not be null");
  }

  //override
  onClientStartsListening(context: {
    ownClientId: string | number | undefined;
    route: string;
  }) {
    if (this._onClientStartsListening)
      return this._onClientStartsListening(context);
    else this.server4Flutter.logger("onClientStartsListening is null", "debug");
  }

  //override
  onClientStopsListening(context: {
    ownClientId: string | number | undefined;
    route: string;
  }) {
    if (this._onClientStopsListening)
      return this._onClientStopsListening(context);
    else this.server4Flutter.logger("_onClientStopsListening is null", "debug");
  }


  //override
  realtimeOutputHandler(context) : RealtimeOutputHandlerResult{
    if(this._realtimeOutputHandler){
      return this._realtimeOutputHandler({
        query: context.query,
        headers: context.headers,
        output: context.output,
        ownClientId: context.ownClientId,
      });
    }
  }

}
