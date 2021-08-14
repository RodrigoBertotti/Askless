import {
  AbstractRequestCli,
  ClientConfirmReceiptCli,
  ConfigureConnectionRequestCli,
  ReadCli,
  ListenCli,
  ModifyCli,
} from "../../../../client/RequestCli";
import {
  ServerInternalImp,
  ServerError,
  ws_clientId,
  ws_clientType,
  RespondError,
  RespondSuccess,
  ws_isAlive
} from "../../../../index";
import {
  CrudRequestType,
  RespondErrorCode,
  RequestType,
} from "../../../../client/Types";
import {
  ConfigureConnectionResponseCli,
  ResponseCli,
} from "../../../../client/response/OtherResponses";
import { PingPong } from "../../../../client/PingPong";
import {ClientInfo, LastClientRequest} from "../../../Clients";
import { DeleteRoute } from "../../../../route/DeleteRoute";
import { CreateRoute } from "../../../../route/CreateRoute";
import { UpdateRoute } from "../../../../route/UpdateRoute";
import { ReadRoute } from "../../../../route/ReadRoute";
import {ConfigureConnectionRequestHandler} from "./ConfigureConnectionRequestHandler";
import WebSocket = require("ws");
import {getOwnClientId} from "../../../../Utils";

/** @internal */
export class ReceiveMessageHandler {
  constructor(public readonly internalServerImp: ServerInternalImp) {}

  readonly configureConnectionHandler = new ConfigureConnectionRequestHandler(this.internalServerImp);

  async handleClientRequestInput(_input, clientWsEndpoint:WebSocket) {
    clientWsEndpoint[ws_isAlive] = true;

    if (_input && _input[PingPong.type] != null) {
      //is ping from client
      await this.handlePingFromClient(_input, clientWsEndpoint[ws_clientId]);
      return;
    }

    if (!_input && _input.clientRequestId) {
      // noinspection ExceptionCaughtLocallyJS
      console.error(JSON.stringify(_input));
      throw Error("Invalid request, no clientRequestId");
    }

    if (_input && _input[ConfigureConnectionRequestCli.type] != null) {
      await this.configureConnectionHandler.handle(_input, clientWsEndpoint);
      return;
    }

    const clientInfo:ClientInfo = this.internalServerImp.clientMiddleware.clients.getOrCreateClientInfo(clientWsEndpoint[ws_clientId]);

    if(this.checkIfHasProblemAfterConfigureConnection(_input, clientWsEndpoint, clientInfo)){
      return;
    }

    if (_input[ClientConfirmReceiptCli.type] != null) {
      this.internalServerImp.clientMiddleware.clients.removePendingMessage(clientWsEndpoint[ws_clientId], true, _input.serverId);
      return;
    }

    return await _RunOperationInApp.from({
      _input: _input,
      clientWsEndpoint: clientWsEndpoint,
      clientInfo: clientInfo,
      internalServerImp: this.internalServerImp,
    }).handle();
}


  // private permissionDenied(
  //   data: ReadCli | ModifyCli,
  //   clientId?: string | number
  // ): ServerError {
  //   return new ServerError(
  //     (clientId != null ? "Unknown" : clientId) +
  //       " clientId don't have permission to " +
  //       data.requestType.toString() +
  //       ": " +
  //       data.route +
  //       "/" +
  //       data.route,
  //     RespondErrorCode.PERMISSION_DENIED
  //   );
  // }
  //
  public async handlePingFromClient(pingClient: PingPong, clientId?: string | number) {
    if (!clientId) {
      this.internalServerImp.logger("Ignoring handlePingFromClient because clientId is null", "error");
      return;
    }
    const clientInfoServer = this.internalServerImp.clientMiddleware.clients.getOrCreateClientInfo(clientId);

    if (clientInfoServer.sendMessage != null)
      clientInfoServer.sendMessage("pong");
    else
      this.internalServerImp.logger('handlePingFromClient: Could not send the "pong" to client', "error");

    const routesThatClientDoesntListenAnymoreAndCanBeRemovedFromServer = clientInfoServer.routesBeingListen.filter(
      (routeBeingListen) => {
        return (
          pingClient.listeningToRoutes.find(
            (listeningToRoute) =>
              listeningToRoute.listenId == routeBeingListen.listenId
          ) == null
        );
      }
    );
    routesThatClientDoesntListenAnymoreAndCanBeRemovedFromServer.forEach(
      (clientListeningToRoutes) => {
        this.internalServerImp.clientMiddleware.clients.stopListening(
          clientInfoServer,
          clientListeningToRoutes.listenId
        );
      }
    );

    const routesThatServerDoesntSendToClientAnymoreButServerShould = pingClient.listeningToRoutes.filter(
      (clientListeningToRoutes) => {
        return (
          clientInfoServer.routesBeingListen.find(
            (routeBeingListen) =>
              routeBeingListen.listenId == clientListeningToRoutes.listenId
          ) == null
        );
      }
    );
    routesThatServerDoesntSendToClientAnymoreButServerShould.forEach(
      (listen) => {
        const service = this.internalServerImp.getReadRoute(listen.route);

        service.listen(
          clientId,
          listen.clientRequestId,
          listen.query,
          clientInfoServer.headers,
          listen.listenId
        );
      }
    );
  }

  private checkIfHasProblemAfterConfigureConnection(_input, clientWsEndpoint:WebSocket, clientInfo:ClientInfo) : boolean{
    if (clientWsEndpoint[ws_clientId] == null) {
      this.internalServerImp.logger("clientId is undefined: " + JSON.stringify(_input), "debug");
      return true;
    }

    if (_input == null)
      throw Error("_input is undefined");
    if (_input.clientRequestId == null)
      throw Error("Unknown _input (do not have clientRequestId)");

    if (clientInfo.headers == null && _input[ConfigureConnectionRequestCli.type] == null) {
      //Is not possible to execute any operation BEFORE setting the headers
      this.internalServerImp.logger("Is not possible to execute any operation BEFORE setting the headers", "error", _input);
      return true;
    }

    return false;
  }
}

abstract class _RunOperationInApp{

  protected constructor(
      public readonly paramsSuper:{
        readonly internalServerImp:ServerInternalImp,
        readonly clientInfo:ClientInfo,
        readonly _input:object,
        readonly clientWsEndpoint:WebSocket,
        readonly handleSubImplementation: () =>  Promise<void>,
      },
  ) {}

  static from(params: {
    readonly internalServerImp: ServerInternalImp,
    readonly clientInfo: ClientInfo,
    readonly _input,
    readonly clientWsEndpoint: WebSocket,
  }) : _RunOperationInApp{

    if (params.clientInfo.headers == null)
      throw new ServerError(
          "You need to configure the headers first",
          RespondErrorCode.NEED_CONFIGURE_HEADERS
      );
    else if (params._input[ReadCli.type] != null)
      return new _RunReadOperationInApp(params);
    else if (params._input[ListenCli.type] != null)
      return new _RunListenOperationInApp(params);
    else if (params._input[ModifyCli.type] != null)
      return new _RunModifyOperationInApp(params);
    else
      throw new ServerError("Not class type requestAlreadyReceivedFromClientBefore to handle", undefined, params._input);
  }

  async handle() : Promise<void>{
    const requestAlreadyReceivedFromClientBefore: LastClientRequest|undefined = this.paramsSuper.clientInfo.lastClientRequestList.find((c: LastClientRequest) => c.clientRequestId == this.paramsSuper._input['clientRequestId']);
    if (requestAlreadyReceivedFromClientBefore) {
      this.paramsSuper.internalServerImp.logger("handleClientRequestInput: request already receipt: " + this.paramsSuper._input['clientRequestId'] + " from clientId=" + this.paramsSuper.clientWsEndpoint[ws_clientId], "debug");
      requestAlreadyReceivedFromClientBefore.requestReceivedAt = Date.now();
      return;
    }

    if (!this.paramsSuper.clientInfo.pendingMessages)
      this.paramsSuper.clientInfo.pendingMessages = [];

    this.paramsSuper.clientInfo.lastClientRequestList.push(new LastClientRequest(this.paramsSuper._input['clientRequestId']));

    this.cleanUnnecessaryInfoFromClient(this.paramsSuper.clientInfo);

    const clientRequestId = this.paramsSuper._input['clientRequestId'];
    if (clientRequestId) {
      this.paramsSuper.internalServerImp.clientMiddleware.confirmReceiptToClient(this.paramsSuper.clientWsEndpoint[ws_clientId], clientRequestId); //Tem que vir depois da chamada do método onHeadersRequestCallback(..) pois não é possível enviar mensagens antes desse método ser chamado
    }
    await this.paramsSuper.handleSubImplementation();
  }

  private cleanUnnecessaryInfoFromClient(clientInfo:ClientInfo) {
    if (clientInfo.lastClientRequestList.length > 100) {
      this.paramsSuper.internalServerImp.logger("handleClientRequestInput: Start of removing unnecessary info's of user " + clientInfo.clientId + "... (" + clientInfo.lastClientRequestList.length + ")", "debug");
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
      this.paramsSuper.internalServerImp.logger("handleClientRequestInput: End of removing unnecessary info's of user " + clientInfo.clientId + "... (" + clientInfo.lastClientRequestList.length + ")", "debug");
    }
  }
}

class _RunModifyOperationInApp extends _RunOperationInApp {

  constructor(
      public readonly params: {
        readonly internalServerImp: ServerInternalImp,
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
              params.clientWsEndpoint[ws_clientId],
              params.clientInfo.headers!
          ),
          internalServerImp: params.internalServerImp,
        }
    );
  }

  private async modify(
      data: ModifyCli,
      clientId: string | number,
      headers: object
  ) {
    const route = this.params.internalServerImp.getRoute(data.route, data.requestType as any) as CreateRoute | UpdateRoute | DeleteRoute;

    const params = {
      body: data.body,
      headers: headers,
      ownClientId: getOwnClientId(clientId),
      query: data.query,
    };
    let res;
    if (data.requestType == RequestType.DELETE)
      res = await (route as DeleteRoute).deletePromise(params);
    else if (data.requestType == RequestType.CREATE)
      res = await (route as CreateRoute).createPromise(params);
    else if (data.requestType == RequestType.UPDATE)
      res = await (route as UpdateRoute).updatePromise(params);
    else
      throw Error("Nothing to data.requestType:" + data.requestType);

    if (res == null || (!(res instanceof RespondError) && !(res instanceof RespondSuccess)))
      throw Error(
          "response of " +
          data.requestType +
          " " +
          data.route +
          "  must be an instance of RespondSuccess or RespondError"
      );

    if (res instanceof RespondError) {
      this.params.internalServerImp.clientMiddleware.assertSendDataToClient(
          clientId,
          new ResponseCli(data.clientRequestId, null, res),
          true,
          undefined,
          undefined
      );
    } else {
      res = res as RespondSuccess;
      this.params.internalServerImp.clientMiddleware.assertSendDataToClient(
          clientId,
          new ResponseCli(data.clientRequestId, res?.output),
          true,
          res?.onClientSuccessfullyReceives,
          res?.onClientFailsToReceive
      );
    }
  }


}

class _RunListenOperationInApp extends _RunOperationInApp{

  constructor(
      public readonly params: {
        readonly internalServerImp: ServerInternalImp,
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
          handleSubImplementation: async () => await this.listen(this.params._input, this.params.clientWsEndpoint[ws_clientId], this.params.clientInfo.headers!),
          internalServerImp: params.internalServerImp,
        }
    );
  }

  private async listen(
      data: ListenCli,
      clientId: string | number,
      headers: object
  ) {
    const service = this.params.internalServerImp.getRoute(
        data.route,
        CrudRequestType.READ
    ) as ReadRoute;
    if (data.listenId == null) {
      this.params.internalServerImp.logger("data.listenId == null", "error", data);
      throw Error("data.listenId == null");
    }

    await service.listen(
        clientId,
        data.clientRequestId,
        data.query as any,
        headers,
        data.listenId
    );
  }

}

class _RunReadOperationInApp extends _RunOperationInApp{

  constructor(
      public readonly params: {
        readonly internalServerImp: ServerInternalImp,
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
          handleSubImplementation: async () => await this.read(this.params._input, this.params.clientWsEndpoint[ws_clientId], this.params.clientInfo.headers!),
          internalServerImp: params.internalServerImp,
        }
    );
  }

  private async read(data: ReadCli, clientId: string | number, headers: object) {
    const service = this.params.internalServerImp.getReadRoute(data.route);
    let response = await service.readInternal({
      headers: headers,
      ownClientId: getOwnClientId(clientId),
      query: data.query,
    });
    if (
        response == null ||
        (!(response instanceof RespondError) &&
            !(response instanceof RespondSuccess))
    )
      throw Error(
          "response of read " +
          data.route +
          " must be an instance of RespondSuccess or RespondError"
      );

    if (response instanceof RespondError) {
      if (response.code == null)
        this.params.internalServerImp.logger("respondWithError: read in " + data.route + "/" + data.route + " is null", "warning");
      service.server.clientMiddleware.assertSendDataToClient(
          clientId,
          new ResponseCli(data.clientRequestId, null, response),
          true,
          undefined,
          undefined
      );
    } else {
      response = response as RespondSuccess;
      if (response == null || response.output == null)
        this.params.internalServerImp.logger("respondWithSuccess: read in " + data.route + "/" + data.route + " is null", "warning");
      service.server.clientMiddleware.assertSendDataToClient(
          clientId,
          new ResponseCli(data.clientRequestId, response?.output),
          true,
          response?.onClientSuccessfullyReceives,
          response?.onClientFailsToReceive
      );
    }
    //if(output==null)
    //    console.log('The readMethod: '+data.route+'/'+data.route+' returned null');

    //if (await service.allowOutputForWhoWantRead(data.route, output, getOwnClientId(clientId), data.params as any, headers) == false)
    //    throw this.permissionDenied(data,clientId);
  }

}
