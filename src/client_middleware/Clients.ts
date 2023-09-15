import {
  AsklessResponse,
} from "../client/response/OtherResponses";
import {SendMessageToClientCallback, NewDataForListener, AsklessServer} from "../index";


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
  dataSentToClient: AsklessResponse | NewDataForListener;
  firstTryAt: number;
  onClientReceiveOutputWithSuccess: () => void;

  canBeRemovedFromQueue(millisecondsToStopTryingToSendMessage?:number):boolean {
    return millisecondsToStopTryingToSendMessage != null &&
           millisecondsToStopTryingToSendMessage > 0 &&
           this.firstTryAt + millisecondsToStopTryingToSendMessage < Date.now();
  }

  constructor(params:{
    dataSentToClient: AsklessResponse | NewDataForListener;
    firstTryAt: number;
    onClientReceiveOutputWithSuccess: () => void;
  }) {
    this.dataSentToClient = params.dataSentToClient;
    this.firstTryAt = params.firstTryAt;
    this.onClientReceiveOutputWithSuccess = params.onClientReceiveOutputWithSuccess;
  }
}
/** @internal */
export type RouteBeingListen = {
  route: string;
  clientIdInternalApp;
  listenId: string;
  params;
  locals;
  authenticationStatus:"authenticatedOrNot" | "authenticatedOnly"
};
/** @internal */
export class ClientInfo {
  pendingMessages: Array<PendingMessage> = [];
  onClose: () => void;
  lastClientRequestList: LastClientRequest[] = [];
  disconnectedAt?: number;
  sendMessage?: SendMessageToClientCallback;
  authentication: "pending" | "unauthenticated" | "authenticated" = "pending";
  doWsDisconnect?: () => void;
  routesBeingListen: Array<RouteBeingListen> = [];
  clientType: "flutter" | "javascript";
  readonly createdAt:number = Date.now();
  userId?:string | number;
  claims?:string[];
  locals:object = {};
  credentialErrorCode?: string;

  clearAuthentication() {
    this.userId = this.claims = this.credentialErrorCode = null;
    this.locals = {};
    this.authentication = "pending";
    this.pendingMessages = [];
  }

  constructor(public readonly clientIdInternalApp: string, public readonly askless:AsklessServer) {}

  canBeDeleted(intervalInMillsecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient:number) : boolean{
    if( //websocket connection haven't been performed
        this.disconnectedAt == null &&
        this.sendMessage == null &&
        this.doWsDisconnect == null &&
        this.onClose == null &&
        this.createdAt + (20 * 1000) < Date.now()
    ){
      this.askless.logger("deleting client data that haven't been used", "debug");
      return true;
    }

    return this.disconnectedAt != null && (
        this.disconnectedAt + intervalInMillsecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient < Date.now()
    );
  }
}
/** @internal */
export class Clients {
  private readonly clientIdInternalApp_clientInfo: Map<string, ClientInfo> = new Map<string, ClientInfo>();

  constructor(public readonly askless:AsklessServer) {}

  stopListening(clientInfo: ClientInfo, listenId: string) {
    const routeBeingListen = clientInfo.routesBeingListen.find(
      (s) => s.listenId == listenId
    );
    if (!routeBeingListen) {
      throw Error("routeBeingListen not found " + listenId);
    }
    this.askless
      .getReadRoute(routeBeingListen.route)
      .stopListening(clientInfo.clientIdInternalApp, listenId, routeBeingListen.route);
  }

  removePendingMessage(
    clientIdInternalApp: string,
    responseHasBeenReceived: boolean,
    serverId?: string
  ): void {
    let clientInfo: ClientInfo = this.clientIdInternalApp_clientInfo[clientIdInternalApp];
    if (!clientInfo) {
      return;
    }

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
      if (p.dataSentToClient instanceof NewDataForListener || (p.dataSentToClient instanceof AsklessResponse && p.dataSentToClient.success)) {
        if (responseHasBeenReceived && p.onClientReceiveOutputWithSuccess) {
          p.onClientReceiveOutputWithSuccess();
        }
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
    return this.clientIdInternalApp_clientInfo;
  }

  getOrCreateClientInfo(clientIdInternalApp: string): ClientInfo {
    if (clientIdInternalApp == null || clientIdInternalApp == "undefined") {
      throw Error("getOrCreateClientInfo: clientIdInternalApp is null/undefined");
    }
    let res:ClientInfo = this.clientIdInternalApp_clientInfo[clientIdInternalApp] ;
    if (!res)
      res = this.clientIdInternalApp_clientInfo[clientIdInternalApp] = new ClientInfo(clientIdInternalApp, this.askless);
    return res;
  }

  deleteClientsInfos(clearByClientIdInternalAppIDS: Array<string>) {
    if (clearByClientIdInternalAppIDS.length == 0) return;
    this.askless.logger("deleteClientsInfos", "debug", clearByClientIdInternalAppIDS);
    clearByClientIdInternalAppIDS.forEach((clientIdInternalApp) => {
      const clientInfo = this.clientIdInternalApp_clientInfo[clientIdInternalApp] as ClientInfo;
      if (clientInfo.doWsDisconnect) {
        clientInfo.doWsDisconnect();
      }
      delete this.clientIdInternalApp_clientInfo[clientIdInternalApp];
    });
  }

  removeClientInfo(clientIdInternalApp: string) {
    const clientInfo = this.clientIdInternalApp_clientInfo[clientIdInternalApp] as ClientInfo;
    if(clientInfo && clientInfo.doWsDisconnect){
      clientInfo.doWsDisconnect();
    }
    delete this.clientIdInternalApp_clientInfo[clientIdInternalApp];
  }

  // getClientByUserId(userId: USER_ID) : ClientInfo | null {
  //   for (const clientIdInternalApp of Object.keys(this.clientIdInternalApp_clientInfo)) {
  //     const client = this.clientIdInternalApp_clientInfo[clientIdInternalApp];
  //     if (client.userId.toString() == userId.toString()) {
  //       return client;
  //     }
  //   }
  //   return null;
  // }
  getClientInfoByUserId(userId) {
    return Object.values(this.clientIdInternalApp_clientInfo).find((item:ClientInfo )=> item.userId == userId);
  }
}
