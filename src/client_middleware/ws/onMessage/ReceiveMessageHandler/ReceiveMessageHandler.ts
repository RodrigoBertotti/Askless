import {
  AuthenticateRequestCli,
  ClientConfirmReceiptCli,
  ConfigureConnectionRequestCli,
  ListenCli,
  ModifyCli,
  ReadCli,
} from "../../../../client/RequestCli";
import {
  AsklessError,
  AsklessErrorCode, AsklessServer, CreateRouteContext, DeleteRouteContext, AuthenticateUserContext, ReadRouteContext,
  ServerError,
  UpdateRouteContext,
  ws_clientIdInternalApp, ws_clientType
} from "../../../../index";
import {CrudRequestType, RequestType,} from "../../../../client/Types";
import {AsklessResponse,} from "../../../../client/response/OtherResponses";
import {PingPong} from "../../../../client/PingPong";
import {ClientInfo, LastClientRequest} from "../../../Clients";
import {DeleteRoute} from "../../../../route/DeleteRoute";
import {CreateRoute} from "../../../../route/CreateRoute";
import {UpdateRoute} from "../../../../route/UpdateRoute";
import {ReadRoute, SetEntityGetter} from "../../../../route/ReadRoute";
import {ConfigureConnectionRequestHandler} from "./ConfigureConnectionRequestHandler";
import {AsklessSuccess} from "../../../../client/response/RespondSuccess";
import WebSocket = require("ws");
import {AuthenticateRequestHandler} from "./AuthenticateRequestHandler";

/** @internal */
export class ReceiveMessageHandler {
  constructor(public readonly askless: AsklessServer) {}

  readonly configureConnectionHandler = new ConfigureConnectionRequestHandler(this.askless);
  readonly authenticateHandler = new AuthenticateRequestHandler(this.askless);

  async handleClientRequestInput(_input, clientWsEndpoint:WebSocket) {
    if (_input && _input[ConfigureConnectionRequestCli.type] != null) {
      await this.configureConnectionHandler.handle(_input, clientWsEndpoint);
      return;
    }

    if (_input && _input[AuthenticateRequestCli.type] != null) {
      await this.authenticateHandler.handle(_input, clientWsEndpoint);
      return;
    }

    if (clientWsEndpoint[ws_clientIdInternalApp] == null) {
      throw Error("Ops, it should perform configure connection first -> "+JSON.stringify(_input));
    }

    const clientInfo:ClientInfo = this.askless.clientMiddleware.clients.getOrCreateClientInfo(clientWsEndpoint[ws_clientIdInternalApp]);

    if(this.checkIfHasProblemAfterConfigureConnection(_input, clientWsEndpoint, clientInfo)){
      return;
    }

    if (_input[ClientConfirmReceiptCli.type] != null) {
      this.askless.clientMiddleware.clients.removePendingMessage(clientWsEndpoint[ws_clientIdInternalApp], true, _input.serverId);
      return;
    }

    return await _RunOperationInApp.from({
      _input: _input,
      clientWsEndpoint: clientWsEndpoint,
      clientInfo: clientInfo,
      askless: this.askless,
    }).handle();
}



  private checkIfHasProblemAfterConfigureConnection(_input, clientWsEndpoint:WebSocket, clientInfo:ClientInfo) : boolean{
    if (clientWsEndpoint[ws_clientIdInternalApp] == null) {
      this.askless.logger("clientId is undefined: " + JSON.stringify(_input), "error");
      return true;
    }

    if (_input == null)
      throw Error("_input is undefined");
    if (_input.clientRequestId == null)
      throw Error("Unknown _input (do not have clientRequestId)");


    return false;
  }
}

abstract class _RunOperationInApp{

  protected constructor(
      public readonly paramsSuper:{
        readonly askless:AsklessServer,
        readonly clientInfo:ClientInfo,
        readonly _input:object,
        readonly clientWsEndpoint:WebSocket,
        readonly handleSubImplementation: () =>  Promise<void>,
      },
  ) {}

  static from(params: {
    readonly askless: AsklessServer,
    readonly clientInfo: ClientInfo,
    readonly _input,
    readonly clientWsEndpoint: WebSocket,
  }) : _RunOperationInApp{
    if (params._input[ReadCli.type] != null)
      return new _RunReadOperationInApp(params);
    else if (params._input[ListenCli.type] != null) {
      if (params.clientWsEndpoint[ws_clientIdInternalApp] == null) {
        throw Error("params.clientWsEndpoint[ws_clientIdInternalApp] is null");
      }
      return new _RunListenOperationInApp(params);
    }
    else if (params._input[ModifyCli.type] != null)
      return new _RunModifyOperationInApp(params);
    else
      throw new ServerError("Not class type requestAlreadyReceivedFromClientBefore to handle", undefined, params._input);
  }

  async handle() : Promise<void>{
    const requestAlreadyReceivedFromClientBefore: LastClientRequest|undefined = this.paramsSuper.clientInfo.lastClientRequestList.find((c: LastClientRequest) => c.clientRequestId == this.paramsSuper._input['clientRequestId']);
    if (requestAlreadyReceivedFromClientBefore) {
      this.paramsSuper.askless.logger("handleClientRequestInput: request already receipt: " + this.paramsSuper._input['clientRequestId'] + " from clientId=" + this.paramsSuper.clientWsEndpoint[ws_clientIdInternalApp], "debug");
      requestAlreadyReceivedFromClientBefore.requestReceivedAt = Date.now();
      return;
    }

    if (!this.paramsSuper.clientInfo.pendingMessages) { this.paramsSuper.clientInfo.pendingMessages = []; }
    this.paramsSuper.clientInfo.lastClientRequestList.push(new LastClientRequest(this.paramsSuper._input['clientRequestId']));

    this.cleanUnnecessaryInfoFromClient(this.paramsSuper.clientInfo);

    const clientRequestId = this.paramsSuper._input['clientRequestId'];
    if (clientRequestId) {
      this.paramsSuper.askless.clientMiddleware.confirmReceiptToClient(this.paramsSuper.clientWsEndpoint[ws_clientIdInternalApp], clientRequestId);
    }
    await this.paramsSuper.handleSubImplementation();
  }

  private cleanUnnecessaryInfoFromClient(clientInfo:ClientInfo) {
    if (clientInfo.lastClientRequestList.length > 100) {
      this.paramsSuper.askless.logger("handleClientRequestInput: Start of removing unnecessary info's of user " + clientInfo.clientIdInternalApp + "... (" + clientInfo.lastClientRequestList.length + ")", "debug");
      const remove = Array<LastClientRequest>();
      for (
          let i = clientInfo.lastClientRequestList.length - 1;
          i >= 0 || remove.length >= 10;
          i--
      ) {
        const messageReceivedFromServer = clientInfo.lastClientRequestList[i];
        if (messageReceivedFromServer?.shouldKeepReceivedMessage() == false) {
          remove.push(messageReceivedFromServer);
        }
      }
      clientInfo.lastClientRequestList = clientInfo.lastClientRequestList.filter(
          (req) => req && !remove.includes(req)
      );
      this.paramsSuper.askless.logger("handleClientRequestInput: End of removing unnecessary info's of user " + clientInfo.clientIdInternalApp + "... (" + clientInfo.lastClientRequestList.length + ")", "debug");
    }
  }
}

class _RunModifyOperationInApp extends _RunOperationInApp {

  constructor(
      public readonly params: {
        readonly askless: AsklessServer,
        readonly clientInfo: ClientInfo,
        readonly _input,
        readonly clientWsEndpoint: WebSocket,
      }
  ) {
    super(
        {
          _input: params._input,
          clientWsEndpoint: params.clientWsEndpoint,
          clientInfo: params.clientInfo,
          handleSubImplementation: async () => await this.modify(
              params._input,
              params.clientWsEndpoint[ws_clientIdInternalApp],
              params.clientInfo
          ),
          askless: params.askless,
        }
    );
  }

  private async modify(
      data: ModifyCli,
      clientIdInternalApp: string,
      clientInfo: ClientInfo
  ) {
    const route = this.params.askless.getRoute(data.route, data.requestType as any) as CreateRoute<any, any, AuthenticateUserContext<any>> | UpdateRoute<any, any, AuthenticateUserContext<any>> | DeleteRoute<any, any, AuthenticateUserContext<any>>;
    const locals = Object.assign({}, clientInfo.locals);
    let _getEntity: () => any;

    const params: CreateRouteContext & UpdateRouteContext & DeleteRouteContext & AuthenticateUserContext<any> & SetEntityGetter<any> = {
      body: data.body,
      userId: clientInfo.userId,
      claims: clientInfo.claims,
      params: data.params,
      locals: locals,
      errorCallback: null,
      successCallback: null,
      setEntityGetter: getEntity => { _getEntity = getEntity; }
    };
    let res: AsklessError | AsklessSuccess;
    if (route.authenticationStatus == "authenticatedOnly" && clientInfo.authentication != "authenticated") {
      res = new AsklessError({
        code: AsklessErrorCode.PENDING_AUTHENTICATION,
        description: "Could not perform the operation on ("+route.requestType+") \""+route.route+"\" because authentication is required",
      });
    } else if (data.requestType == RequestType.DELETE) {
      res = await (route as DeleteRoute<any, any, AuthenticateUserContext<any>>).deletePromise(params);
    } else if (data.requestType == RequestType.CREATE) {
      res = await (route as CreateRoute<any, any, AuthenticateUserContext<any>>).createPromise(params);
    } else if (data.requestType == RequestType.UPDATE) {
      res = await (route as UpdateRoute<any, any, AuthenticateUserContext<any>>).updatePromise(params);
    } else {
      throw Error("Nothing to data.requestType: " + data.requestType);
    }
    if (res == null || (!(res instanceof AsklessError) && !(res instanceof AsklessSuccess)))
      throw Error(
          "response of " +
          data.requestType +
          " " +
          data.route +
          "  must be an instance of AsklessSuccess or AsklessError"
      );


    if (res instanceof AsklessError) {
      if (clientInfo.authentication != "authenticated" && (res.code == AsklessErrorCode.PERMISSION_DENIED || res.code == AsklessErrorCode.PENDING_AUTHENTICATION)) {
        this.params.askless.logger("respondWithError: the client \""+(clientInfo.userId ?? " (no ID) ")+"\" " +
            "could not perform the operation on (" + data.requestType + ")" + data.route + ", result is "+res.code+
            ", authentication is \""+clientInfo.authentication+"\", did you handle the onUnauthenticatedListener on the App side? (initAndConnect)", "warning");
      }

      this.params.askless.clientMiddleware.assertSendDataToClient(
          clientIdInternalApp,
          new AsklessResponse(data.clientRequestId, null, res),
          true,
          null,
      );
    } else {
      res = res as AsklessSuccess;
      this.params.askless.clientMiddleware.assertSendDataToClient(
          clientIdInternalApp,
          new AsklessResponse(data.clientRequestId, res?.output),
          true,
          () => {
            return route.onReceived(_getEntity(), {userId: params.userId, claims: params.claims, params: params.params, locals: locals, })
          },
      );
    }
  }


}

class _RunListenOperationInApp extends _RunOperationInApp{

  constructor(
      public readonly params: {
        readonly askless: AsklessServer,
        readonly clientInfo: ClientInfo,
        readonly _input,
        readonly clientWsEndpoint: WebSocket,
      }
  ) {
    super(
        {
          _input: params._input,
          clientWsEndpoint: params.clientWsEndpoint,
          clientInfo: params.clientInfo,
          handleSubImplementation: async () => await this.listen(this.params._input, this.params.clientWsEndpoint[ws_clientIdInternalApp],),
          askless: params.askless,
        }
    );
  }

  private async listen(
      data: ListenCli,
      clientIdInternalApp: string,
  ) {
    const service = this.params.askless.getRoute(
        data.route,
        CrudRequestType.READ
    ) as ReadRoute<any, any, AuthenticateUserContext<any>>;
    if (data.listenId == null) {
      this.params.askless.logger("data.listenId == null", "error", data);
      throw Error("data.listenId == null");
    }
    if (clientIdInternalApp == null) { throw Error("clientRequestId is null"); }
    await service.listen(
        clientIdInternalApp,
        data.clientRequestId,
        data.params as any,
        data.listenId
    );
  }

}

class _RunReadOperationInApp extends _RunOperationInApp{

  constructor(
      public readonly params: {
        readonly askless: AsklessServer,
        readonly clientInfo: ClientInfo,
        readonly _input,
        readonly clientWsEndpoint: WebSocket,
      }
  ) {
    super(
        {
          _input: params._input,
          clientWsEndpoint: params.clientWsEndpoint,
          clientInfo: params.clientInfo,
          handleSubImplementation: async () => await this.read(this.params._input, this.params.clientWsEndpoint[ws_clientIdInternalApp], this.params.clientInfo),
          askless: params.askless,
        }
    );
  }

  private async read(data: ReadCli, clientIdInternalApp: string, clientInfo: ClientInfo) {
    const service = this.params.askless.getReadRoute(data.route);
    const locals = Object.assign({}, clientInfo.locals);
    let _getEntity: () => any;
    let response = await service.readInternal({
      userId: clientInfo.userId,
      claims: clientInfo.claims,
      params: data.params,
      locals: locals,
      errorCallback: null,
      successCallback: null,
      setEntityGetter: (getEntity) => {_getEntity = getEntity;}
    } as AuthenticateUserContext<any> & ReadRouteContext & SetEntityGetter<any>);
    if (
        response == null ||
        (!(response instanceof AsklessError) &&
            !(response instanceof AsklessSuccess))
    )
      throw Error(
          "response of read " +
          data.route +
          " must be an instance of AsklessSuccess or AsklessError"
      );

    if (response instanceof AsklessError) {
      if (response.code == null) {
        this.params.askless.logger("respondWithError: read in " + data.route + "/" + data.route + " is null", "warning");
      }
      if (clientInfo.authentication != "authenticated" && (response.code == AsklessErrorCode.PERMISSION_DENIED || response.code == AsklessErrorCode.PENDING_AUTHENTICATION)) {
        this.params.askless.logger("respondWithError: the client \""+(clientInfo.userId ?? "(no ID)")+"\" " +
            "could not perform the operation on " + data.route + "/" + data.route + ", " +
            "because his authentication is \""+clientInfo.authentication+"\", did you handle the onUnauthenticatedListener on the App side? (initAndConnect)", "warning");
      }
      service.askless.clientMiddleware.assertSendDataToClient(
          clientIdInternalApp,
          new AsklessResponse(data.clientRequestId, null, response),
          true,
          undefined,
      );
    } else {
      const responseSuccess = response as AsklessSuccess;
      if (responseSuccess == null || responseSuccess.output == null) {
        this.params.askless.logger("respondWithSuccess: read in " + data.route + "/" + data.route + " is null", "warning");
      }
      service.askless.clientMiddleware.assertSendDataToClient(
          clientIdInternalApp,
          new AsklessResponse(data.clientRequestId, responseSuccess?.output),
          true,
          () => service.onReceived (
              _getEntity(),
              { userId: clientInfo.userId, locals: locals, claims: clientInfo.claims, params: data.params } as AuthenticateUserContext<any> & { params: object, locals: object }
          ),
      );
    }
  }

}
