import { ConfigureConnectionRequestCli } from "../client/RequestCli";
import { ReceiveMessageHandler } from "./ws/onMessage/ReceiveMessageHandler/ReceiveMessageHandler";
import {
  ResponseCli,
  ServerConfirmReceiptCli,
} from "../client/response/OtherResponses";
import {NewDataForListener, RespondErrorCode} from "..";
import * as WebSocket from "ws";
import {ClientInfo, Clients, PendingMessage} from "./Clients";
import { PingPong } from "../client/PingPong";
import {
  ServerInternalImp,
  ServerError,
  ws_clientId,
  ws_isAlive, RespondError,
} from "../index";
import {
  OnClientFailsToReceive,
  OnClientSuccessfullyReceives,
} from "../route/ReadRoute";
import {Runtime} from "inspector";
import {OnMessage} from "./ws/onMessage/onMessage";



/** @internal */
export class ClientMiddleware {
  readonly clients: Clients;

  constructor(public readonly server: ServerInternalImp) {
    this.clients = new Clients(server);
  }

  start() {
    const self = this;
    this.server.wss.on("connection", (ws) => {

      self.server.logger('new client connected, sending "welcome"', "debug");
      ws.send("welcome");
      ws[ws_isAlive] = true;

      ws.on("message", new OnMessage(this, ws).onMessage);

      ws.on("error", function (_, err) {
        // _ is websocket, but it doesn't have the clientId field
        self.server.logger("websocket error: " + ws + " " + err.toString(), "error", {err});
      });

      ws.on("close", function (_, code, reason) {
        // _ is websocket, but it doesn't have the clientId field
        self.server.logger("websocket close: " + ws + " " + JSON.stringify(code) + " " + JSON.stringify(reason), "debug", code);
        self.clients.getOrCreateClientInfo(ws[ws_clientId]).onClose?.();
      });
    });

    this.server.wss.on("close", function close() {
      self.server.disconnectClientsWhoDidntPingTask.stop();
      self.server.sendMessageToClientAgainTask.stop();
    });
  }

  confirmReceiptToClient(clientId: string | number, clientRequestId: string) {
    // console.log("--------------> confirmReceiptToClient "+clientRequestId+" <--------------------------");
    // console.log(new Error().stack);
    const sendMsgCallback = this.clients.getOrCreateClientInfo(clientId).sendMessage;
    if (sendMsgCallback == null) {
      const err =
        "confirmReceiptToClient: message could not be sent: the client " +
        clientId +
        " is not connected anymore";
      //console.log("VOCÊ ESTÁ TENTANDO ENVIAR MENSAGENS ANTES DO MÉTODO onHeadersRequestCallback SER CHAMADO?");
      this.server.logger(err, "error");
      return;
    }
    sendMsgCallback(
      JSON.stringify(new ServerConfirmReceiptCli(clientRequestId))
    );
  }

  assertSendDataToClient(
    clientId: string | number,
    sendData: ResponseCli | NewDataForListener,
    ifFailTryAgain?: boolean,
    onClientReceiveWithSuccess?: OnClientSuccessfullyReceives,
    onClientFailsToReceive?: OnClientFailsToReceive
  ): void {
    try {
      const clientInfo = this.clients.getOrCreateClientInfo(clientId);

      if (ifFailTryAgain == null || ifFailTryAgain)
        clientInfo.pendingMessages.push(new PendingMessage({
          dataSentToClient: sendData,
          firstTryAt: Date.now(),
          onClientReceiveWithSuccess: onClientReceiveWithSuccess,
          onClientFailsToReceive: onClientFailsToReceive,
        }
      ));

      this.server.logger("Sending message to client", "debug", sendData);

      if (clientInfo.sendMessage)
        clientInfo.sendMessage(JSON.stringify(sendData));
      else
        this.server.logger("Message not sent, waiting the client connect again...", "debug", sendData);
    } catch (e) {
      this.server.logger("assertSendDataToClient error", "error", {stack: e.stack, sendData,});
    }
  }
}
