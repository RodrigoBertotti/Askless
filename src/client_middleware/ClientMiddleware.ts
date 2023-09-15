import {
  AsklessResponse,
  ServerConfirmReceiptCli,
} from "../client/response/OtherResponses";
import {NewDataForListener, AsklessErrorCode, ws_clientIdInternalApp, AsklessServer} from "..";
import {ClientInfo, Clients, PendingMessage} from "./Clients";
import {
  ws_isAlive,
} from "../index";
import {OnMessage} from "./ws/onMessage/onMessage";



/** @internal */
export class ClientMiddleware {
  readonly clients: Clients;

  constructor(public readonly askless: AsklessServer<any>) {
    this.clients = new Clients(askless);
  }

  start() {
    this.askless.wss.on("connection", (ws) => {
      this.askless.logger('new client connected, sending "welcome"', "debug");
      ws.send("welcome");

      ws[ws_isAlive] = true;

      ws.on("message", new OnMessage(this, ws).onMessage);

      ws.on("error", (_, err) => {
        // _ is websocket, but it doesn't have the clientId field
        this.askless.logger("websocket error: " + ws + " " + err.toString(), "error", {err});
      });

      ws.on("close", (_, code, reason) => {
        // _ is websocket, but it doesn't have the clientId field
        this.askless.logger("websocket close: " + ws[ws_clientIdInternalApp] + " " + JSON.stringify(code) + " " + JSON.stringify(reason), "debug", code);
        try {
          const client = this.clients.getAllClientsInfos()[ws[ws_clientIdInternalApp]];
          if (client && client.onClose) {
            client.onClose();
          }
        } catch (e) {
          this.askless.logger('ws on close error: '+e.toString(), "error");
        }
      });
    });

    this.askless.wss.on("close", () => {
      this.askless.disconnectClientsWhoDidntPingTask.stop();
      this.askless.sendMessageToClientAgainTask.stop();
    });
  }


  confirmReceiptToClient(clientIdInternalApp: string, clientRequestId: string) {
    const sendMsgCallback = this.clients.getOrCreateClientInfo(clientIdInternalApp).sendMessage;
    if (sendMsgCallback == null) {
      const err =
        "confirmReceiptToClient: message could not be sent: the client " +
        clientIdInternalApp +
        " is not connected anymore";
      this.askless.logger(err, "error");
      return;
    }
    sendMsgCallback(
      JSON.stringify(new ServerConfirmReceiptCli(clientRequestId))
    );
  }

  assertSendDataToClient(
    clientIdInternalApp: string,
    sendData: AsklessResponse | NewDataForListener,
    ifFailTryAgain: boolean,
    onClientReceiveOutputWithSuccess: () => void,
  ): void {
    try {
      const clientInfo = this.clients.getOrCreateClientInfo(clientIdInternalApp);

      if (ifFailTryAgain == null || ifFailTryAgain)
        clientInfo.pendingMessages.push(new PendingMessage({
          dataSentToClient: sendData,
          firstTryAt: Date.now(),
          onClientReceiveOutputWithSuccess: onClientReceiveOutputWithSuccess,
        }
      ));

      this.askless.logger("Sending message to client", "debug"/*, sendData*/);

      if (clientInfo.sendMessage) {
        clientInfo.sendMessage(JSON.stringify(sendData));
      }else
        this.askless.logger("Message not sent, waiting the client connect again...", "debug", sendData);
    } catch (e:any) {
      this.askless.logger("assertSendDataToClient error", "error", {stack: e.stack, sendData,});
    }
  }

  getClientInfoByUserId(userId) : ClientInfo {
    return this.clients.getClientInfoByUserId(userId);
  }
}
