import {
  AbstractRequestCli,
  ClientConfirmReceiptCli,
  ConfigureConnectionRequestCli,
  ReadCli,
  ListenCli,
  ModifyCli,
} from "../client/RequestCli";
import {ServerInternalImp, ServerError, ws_clientId, ws_clientType, RespondError, RespondSuccess} from "../index";
import {
  CrudRequestType,
  RespondErrorCode,
  RequestType,
} from "../client/Types";
import {
  ConfigureConnectionResponseCli,
  ResponseCli,
} from "../client/response/OtherResponses";
import { Utils } from "../client/Utils";
import { PingPong } from "../client/PingPong";
import { LastClientRequest } from "./Clients";
import { DeleteRoute } from "../route/DeleteRoute";
import { CreateRoute } from "../route/CreateRoute";
import { UpdateRoute } from "../route/UpdateRoute";
import { ReadRoute } from "../route/ReadRoute";

/** @internal */
export class ReceiveMessageHandler {
  constructor(public readonly internalServerImp: ServerInternalImp) {}

  async handleClientRequestInput(_input, ws) {
    //this.server.logger("handleClientInput: "+clientId, "debug");
    let ownClientIdOrNull;

    if (_input[ConfigureConnectionRequestCli.type] != null) {
      const input = Object.assign(new ConfigureConnectionRequestCli(null,null), _input) as ConfigureConnectionRequestCli;
      ownClientIdOrNull = Utils.getOwnClientId(input.clientId);
      if (
        ownClientIdOrNull != null &&
        !(await this.internalServerImp.config.grantConnection?.call(ownClientIdOrNull, input.headers))
      ) {
        throw new ServerError(
          "The client " +
            ws[ws_clientId]?.toString() +
            " doesn't informed a valid token on header",
          RespondErrorCode.TOKEN_INVALID
        );
      }
      ws[ws_clientId] = ws[ws_clientId] = input.clientId;
      ws[ws_clientType] = input.clientType;


      const clients = this.internalServerImp.clientMiddleware.clients;
      clients.removeClientInfo(ws[ws_clientId]); //Quando o cliente se desconecta e se conecta novamente, o clientId é o mesmo
      const clientInfo = clients.getClientInfo(ws[ws_clientId]);
      clientInfo.clientType = input.clientType;
      clientInfo.sendMessage = (message: string) => {
        try {
          if (ws) {
            ws.send(message);
          } else {
            this.internalServerImp.logger("ClientMiddleware: ws null: the client " + ws[ws_clientId] + " is not connected anymore", "error");
          }
        } catch (e) {
          this.internalServerImp.logger("ClientMiddleware", "error", e);
        }
      };

      clientInfo.onClose = () => {
        this.internalServerImp.logger("onClose websocket " + ws[ws_clientId], "debug");
        //Apaga apenas as informações relacionadas a conexão, não apaga mensagens pendentes
        //As respostas serão deixadas ainda, serão apagadas depois com o clientId_disconnectedAt
        clientInfo.sendMessage = undefined;
        clientInfo.headers = undefined;
        clientInfo.doWsDisconnect = undefined;
        clientInfo.disconnectedAt = Date.now();
      };
      clientInfo.doWsDisconnect = () => {
        this.internalServerImp.logger("doWsDisconnect " + ws[ws_clientId], "debug");
        ws.close();
      };

      this.internalServerImp.clientMiddleware.clients.setHeaders(ws[ws_clientId], input.headers || {});
      // console.log('-------------- INPUT ConfigureConnectionRequestCli ---------------');
      // console.log(JSON.stringify(_input));
      this.internalServerImp.clientMiddleware.confirmReceiptToClient(
        ws[ws_clientId],
        input.clientRequestId
      );
      //clientMiddleware.sendDataToClient(clientId,'test');
      this.internalServerImp.clientMiddleware.assertSendDataToClient(
        ws[ws_clientId],
        new ConfigureConnectionResponseCli(
          _input.clientRequestId,
          this.internalServerImp.getConnectionConfiguration(ws[ws_clientType])
        ),
        true,
          undefined,
          undefined
      ); //TEM QUE VIR DEPOIS DE onHeadersRequestCallback
      return;
    }
    ownClientIdOrNull = Utils.getOwnClientId(ws[ws_clientId]);
    if (ws[ws_clientId] == null) {
      //clientId = _input['clientId'];
      this.internalServerImp.logger("clientId is undefined: " + JSON.stringify(_input), "debug");
      return;
    }
    const clientInfo = this.internalServerImp.clientMiddleware.clients.getClientInfo(ws[ws_clientId]);
    if (_input == null) throw Error("_input is undefined");
    if (_input.clientRequestId == null)
      throw Error("Unknown _input (do not have clientRequestId)");

    if (
      clientInfo.headers == null &&
      _input[ConfigureConnectionRequestCli.type] == null
    ) {
      //Is not possible to execute any operation BEFORE setting the headers
      this.internalServerImp.logger("Is not possible to execute any operation BEFORE setting the headers", "error", _input);
      return;
    }

    if (_input[ClientConfirmReceiptCli.type] != null) {
      this.internalServerImp.clientMiddleware.clients.removePendingMessage(
        ws[ws_clientId],
        true,
        _input.serverId
      );
      return;
    }

    if (!clientInfo.pendingMessages) clientInfo.pendingMessages = [];
    const requestAlreadyReceivedFromClientBefore: LastClientRequest|undefined = clientInfo.lastClientRequestList.find(
      (c: LastClientRequest) => c.clientRequestId == _input.clientRequestId
    );
    if (requestAlreadyReceivedFromClientBefore) {
      this.internalServerImp.logger("handleClientRequestInput: request already receipt: " + _input.clientRequestId + " from clientId=" + ws[ws_clientId], "debug");
      requestAlreadyReceivedFromClientBefore.requestReceivedAt = Date.now();
      return;
    }
    clientInfo.lastClientRequestList.push(
      new LastClientRequest(_input.clientRequestId)
    );

    if (clientInfo.lastClientRequestList.length > 100) {
      this.internalServerImp.logger("handleClientRequestInput: Start of removing unnecessary info's of user " + clientInfo.clientId + "... (" + clientInfo.lastClientRequestList.length + ")", "debug");
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
      this.internalServerImp.logger("handleClientRequestInput: End of removing unnecessary info's of user " + clientInfo.clientId + "... (" + clientInfo.lastClientRequestList.length + ")", "debug");
    }

    // console.log('-------------- INPUT ---------------');
    // console.log(JSON.stringify(_input));

    if (_input.clientRequestId)
      this.internalServerImp.clientMiddleware.confirmReceiptToClient(
        ws[ws_clientId],
        _input.clientRequestId
      ); //Tem que vir depois da chamada do método onHeadersRequestCallback(..) pois não é possível enviar mensagens antes desse método ser chamado

    if (clientInfo.headers == null)
      throw new ServerError(
        "You need to configure the headers first",
        RespondErrorCode.NEED_CONFIGURE_HEADERS
      );
    else if (_input[ReadCli.type] != null)
      await this.read(_input, ws[ws_clientId], clientInfo.headers);
    else if (_input[ListenCli.type] != null)
      await this.listen(_input, ws[ws_clientId], clientInfo.headers);
    else if (_input[ModifyCli.type] != null)
      await this.modify(_input, ws[ws_clientId], clientInfo.headers);
    else
      throw new ServerError(
       "Not class type requestAlreadyReceivedFromClientBefore to handle",
       undefined,
        _input
      );
  }

  private async read(data: ReadCli, clientId: string | number, headers: object) {
    const service = this.internalServerImp.getReadRoute(data.route);
    let response = await service.readInternal({
      headers: headers,
      ownClientId: Utils.getOwnClientId(clientId),
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
        this.internalServerImp.logger("respondWithError: read in " + data.route + "/" + data.route + " is null", "warning");
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
        this.internalServerImp.logger("respondWithSuccess: read in " + data.route + "/" + data.route + " is null", "warning");
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

    //if (await service.allowOutputForWhoWantRead(data.route, output, Utils.getOwnClientId(clientId), data.params as any, headers) == false)
    //    throw this.permissionDenied(data,clientId);
  }

  private permissionDenied(
    data: ReadCli | ModifyCli,
    clientId?: string | number
  ): ServerError {
    return new ServerError(
      (clientId != null ? "Unknown" : clientId) +
        " clientId don't have permission to " +
        data.requestType.toString() +
        ": " +
        data.route +
        "/" +
        data.route,
      RespondErrorCode.PERMISSION_DENIED
    );
  }

  private async modify(
    data: ModifyCli,
    clientId: string | number,
    headers: object
  ) {
    const route = this.internalServerImp.getRoute(
      data.route,
      data.requestType as any
    ) as CreateRoute | UpdateRoute | DeleteRoute;
    // if (!(await service.allowInputForWhoWantModify(
    //     data.requestType as unknown as ModificationType,
    //     data.route,
    //     data.body,
    //     Utils.getOwnClientId(clientId),
    //     data.params as any,
    //     headers
    // ))
    // ) {
    //     throw this.permissionDenied(data,clientId);
    // }

    const params = {
      body: data.body,
      headers: headers,
      ownClientId: Utils.getOwnClientId(clientId),
      query: data.query,
    };
    let res;
    if (data.requestType == RequestType.DELETE)
      res = await (route as DeleteRoute).deleteInternal(params);
    else if (data.requestType == RequestType.CREATE)
      res = await (route as CreateRoute).createInternal(params);
    else if (data.requestType == RequestType.UPDATE)
      res = await (route as UpdateRoute).updateInternal(params);
    else throw Error("Nothing to data.requestType:" + data.requestType);

    if (
      res == null ||
      (!(res instanceof RespondError) && !(res instanceof RespondSuccess))
    )
      throw Error(
        "response of " +
          data.requestType +
          " " +
          data.route +
          "  must be an instance of RespondSuccess or RespondError"
      );

    if (res instanceof RespondError) {
      this.internalServerImp.clientMiddleware.assertSendDataToClient(
        clientId,
        new ResponseCli(data.clientRequestId, null, res),
        true,
          undefined,
          undefined
      );
    } else {
      res = res as RespondSuccess;
      this.internalServerImp.clientMiddleware.assertSendDataToClient(
        clientId,
        new ResponseCli(data.clientRequestId, res?.output),
        true,
        res?.onClientSuccessfullyReceives,
        res?.onClientFailsToReceive
      );
    }
  }

  private async listen(
    data: ListenCli,
    clientId: string | number,
    headers: object
  ) {
    const service = this.internalServerImp.getRoute(
      data.route,
      CrudRequestType.READ
    ) as ReadRoute;
    if (data.listenId == null) {
      this.internalServerImp.logger("data.listenId == null", "error", data);
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

  public async handlePingFromClient(
    pingClient: PingPong,
    clientId?: string | number
  ) {
    if (!clientId) {
      this.internalServerImp.logger("Ignoring handlePingFromClient because clientId is null", "error");
      return;
    }
    const clientInfoServer = this.internalServerImp.clientMiddleware.clients.getClientInfo(
      clientId
    );

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
}
