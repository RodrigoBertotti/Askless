import {
  ResponseCli,
} from "../client/response/OtherResponses";
import {ServerInternalImp, SendMessageToClientCallback, NewDataForListener} from "../index";
import {
  OnClientFailsToReceive,
  OnClientSuccessfullyReceives,
} from "../route/ReadRoute";

/** @internal */
export class LastClientRequest {
  public requestReceivedAt = Date.now();

  constructor(public readonly clientRequestId) {}

  /*** keep received message for 10 minutes */
  shouldKeepReceivedMessage():boolean {
    return this.requestReceivedAt + 10 * 60 * 1000 >= Date.now();
  }
}
/** @internal */
export class PendingMessage {
  dataSentToClient: ResponseCli | NewDataForListener;
  firstTryAt: number;
  onClientReceiveWithSuccess?: OnClientSuccessfullyReceives;
  onClientFailsToReceive?: OnClientFailsToReceive;

  canBeRemovedFromQueue(secondsToStopTryingToSendMessageAgainAndAgain?:number):boolean {
    return secondsToStopTryingToSendMessageAgainAndAgain != null &&
           secondsToStopTryingToSendMessageAgainAndAgain >= 1    &&
           this.firstTryAt + secondsToStopTryingToSendMessageAgainAndAgain * 1000 >= Date.now();
  }

  constructor(params:{
    dataSentToClient: ResponseCli | NewDataForListener;
    firstTryAt: number;
    onClientReceiveWithSuccess?: OnClientSuccessfullyReceives;
    onClientFailsToReceive?: OnClientFailsToReceive;
  }) {
    this.dataSentToClient = params.dataSentToClient;
    this.firstTryAt = params.firstTryAt;
    this.onClientReceiveWithSuccess = params.onClientReceiveWithSuccess;
    this.onClientFailsToReceive = params.onClientFailsToReceive;
  }
}
/** @internal */
export type RouteBeingListen = {
  route: string;
  clientId;
  listenId: string;
  query;
};
/** @internal */
export class ClientInfo {
  pendingMessages: Array<PendingMessage> = [];
  onClose: VoidFunction;
  lastClientRequestList: LastClientRequest[] = [];
  disconnectedAt?: number = undefined;
  sendMessage?: SendMessageToClientCallback;
  headers?: object;
  doWsDisconnect?: VoidFunction;
  routesBeingListen: Array<RouteBeingListen> = [];
  clientType: "flutter" | "javascript";
  constructor(public readonly clientId: string | number) {}

  canBeDeleted(intervalInSecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient:number) : boolean{
    return this.disconnectedAt != null &&
        this.disconnectedAt + intervalInSecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient * 1000 < Date.now();
  }
}
/** @internal */
export class Clients {
  private readonly clientId_clientInfo: Map<
    number | string,
    ClientInfo
  > = new Map<string, ClientInfo>();

  constructor(public readonly server: ServerInternalImp) {}

  setHeaders(clientId: string | number, headers) {
    this.getClientInfo(clientId).headers = headers;
  }
  getHeaders(clientId: string | number): object|undefined {
    return this.getClientInfo(clientId).headers;
  }

  stopListening(clientInfo: ClientInfo, listenId: string) {
    const routeBeingListen = clientInfo.routesBeingListen.find(
      (s) => s.listenId == listenId
    );
    if (!routeBeingListen) {
      throw Error("routeBeingListen not found " + listenId);
    }
    this.server
      .getReadRoute(routeBeingListen.route)
      .stopListening(clientInfo.clientId, listenId, routeBeingListen.route);
  }

  removePendingMessage(
    clientId: string | number,
    clientReceived: boolean,
    serverId?: string
  ): void {
    let clientInfo: ClientInfo = this.clientId_clientInfo[clientId];
    if (!clientInfo) return;

    let remove: Array<PendingMessage>;
    if (serverId) {
      const r = clientInfo.pendingMessages.find(
        (c) => c.dataSentToClient.serverId == serverId
      );
      if (r != null) remove = [r];
      else remove = [];
    } else {
      remove = clientInfo.pendingMessages;
    }
    remove.forEach((p) => {
      if (clientReceived && p.onClientReceiveWithSuccess) {
        p.onClientReceiveWithSuccess(clientId);
      } else if (!clientReceived && p.onClientFailsToReceive) {
        p.onClientFailsToReceive(clientId);
      }
    });
    remove.forEach((r) =>
      clientInfo.pendingMessages.splice(
        clientInfo.pendingMessages.indexOf(r),
        1
      )
    );
  }

  getAllClientsInfos() {
    return this.clientId_clientInfo;
  }

  getClientInfo(clientId: number | string): ClientInfo {
    let res = this.clientId_clientInfo[clientId] as ClientInfo;
    if (!res)
      res = this.clientId_clientInfo[clientId] = new ClientInfo(clientId);
    return res;
  }

  deleteClientsInfos(clearClientsIds: Array<string | number>) {
    if (clearClientsIds.length == 0) return;
    this.server.logger("deleteClientsInfos", "debug", clearClientsIds);
    clearClientsIds.forEach((clientId) => {
      const clientInfo = this.clientId_clientInfo[clientId] as ClientInfo;
      for (
        let route = 0;
        route < clientInfo.routesBeingListen.length;
        route++
      ) {
        const routeBeingListen = clientInfo.routesBeingListen[route];
        this.server
          .getReadRoute(routeBeingListen.route)
          .stopListening(clientId);
      }
      if (clientInfo.doWsDisconnect) clientInfo.doWsDisconnect();
      delete this.clientId_clientInfo[clientId];
    });
  }

  removeClientInfo(clientId: number | string) {
    const clientInfo = this.clientId_clientInfo[clientId] as ClientInfo;
    if(clientInfo && clientInfo.doWsDisconnect){
      clientInfo.doWsDisconnect();
    }
    delete this.clientId_clientInfo[clientId];
  }
}
