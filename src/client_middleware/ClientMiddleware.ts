import { ConfigureConnectionRequestCli } from "../client/RequestCli";
import { ReceiveMessageHandler } from "./ReceiveMessageHandler";
import {
  ResponseCli,
  ServerConfirmReceiptCli,
} from "../client/response/OtherResponses";
import {NewDataForListener, RespondErrorCode} from "..";

import * as WebSocket from "ws";
import { ClientInfo, Clients } from "./Clients";
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

/** @internal */
export class ClientMiddleware {
  readonly clients: Clients;
  readonly receiveMessageHandler = new ReceiveMessageHandler(
    this.server4Flutter
  );

  constructor(public readonly server4Flutter: ServerInternalImp) {
    this.clients = new Clients(server4Flutter);
  }

  start() {
    const self = this;
    this.server4Flutter.wss.on("connection", (ws) => {
      self.server4Flutter.logger(
        'new client connected, sending "welcome"',
        "debug"
      );

      ws.send("welcome");

      ws[ws_isAlive] = true;

      ws.on("message", async (data) => {
        const req = JSON.parse(data.toString());
        ws[ws_isAlive] = true;

        //self.server4Flutter.logger("client "+ws[ws_clientId]+" said (alive="+ws[ws_isAlive]+")", "debug", req);

        try {
          if (req[PingPong.type] != null) {
            //is ping from client
            await self.receiveMessageHandler.handlePingFromClient(req, ws[ws_clientId]);
            return;
          }
          if (!req.clientRequestId) {
            // noinspection ExceptionCaughtLocallyJS
            console.error(JSON.stringify(req));
            throw Error("Invalid request, no clientRequestId");
          }

          await self.receiveMessageHandler.handleClientRequestInput(req, ws);
        } catch (e) {
          if ((e as ServerError).code != null) {
            //ServerError
            self.server4Flutter.logger("error: " + e["type"], "debug");
            const error = e as ServerError;
            const invalidToken: boolean =
              error.code == RespondErrorCode.TOKEN_INVALID;
            const response = new ResponseCli(
              req.clientRequestId,
              null,
              new RespondError({
                description: error.message,
                code: error.code,
              })
            );
            if (invalidToken) {
              ws.send(JSON.stringify(response));
              ws.close();
            } else {
              self.assertSendDataToClient(
                ws[ws_clientId],
                response,
                true,
                null,
                null
              );
            }
          } else {
            self.server4Flutter.logger(e.toString(), "error", e.stack);
            self.assertSendDataToClient(
              ws[ws_clientId],
              new ResponseCli(
                req.clientRequestId,
                null,
                new RespondError({
                  code: RespondErrorCode.INTERNAL_ERROR,
                  description: self.server4Flutter.config
                    .sendInternalErrorsToClient
                    ? e.stack
                    : "An internal error occurred",
                  stack: self.server4Flutter.config.sendInternalErrorsToClient
                    ? e.stack
                    : null,
                })
              ),
              true,
              null,
              null
            );
          }
        }
      });

      ws.on("error", function (_, err) {
        // _ is websocket, but it doesn't have the clientId field
        self.server4Flutter.logger(
          "websocket error: " + ws + " " + err.toString(),
          "error",
            {err}
        );
      });

      ws.on("close", function (_, code, reason) {
        // _ is websocket, but it doesn't have the clientId field
        self.server4Flutter.logger(
          "websocket close: " + ws + " " + JSON.stringify(code) + " " + JSON.stringify(reason),
          "debug",
            code
        );
        self.clients.getClientInfo(ws[ws_clientId])?.onClose?.();
      });
    });

    this.server4Flutter.wss.on("close", function close() {
      self.server4Flutter.disconnectClientsWhoDidntPingTask.stop();
      self.server4Flutter.sendMessageToClientAgainTask.stop();
    });
  }

  confirmReceiptToClient(clientId: string | number, clientRequestId: string) {
    // console.log("--------------> confirmReceiptToClient "+clientRequestId+" <--------------------------");
    // console.log(new Error().stack);
    const sendMsgCallback = this.clients.getClientInfo(clientId).sendMessage;
    if (sendMsgCallback == null) {
      const err =
        "confirmReceiptToClient: message could not be sent: the client " +
        clientId +
        " is not connected anymore";
      //console.log("VOCÊ ESTÁ TENTANDO ENVIAR MENSAGENS ANTES DO MÉTODO onHeadersRequestCallback SER CHAMADO?");
      this.server4Flutter.logger(err, "error");
      return;
    }
    sendMsgCallback(
      JSON.stringify(new ServerConfirmReceiptCli(clientRequestId))
    );
  }

  assertSendDataToClient(
    clientId: string | number,
    sendData: ResponseCli | NewDataForListener,
    ifFailTryAgain: boolean,
    onClientReceiveWithSuccess: OnClientSuccessfullyReceives,
    onClientFailsToReceive: OnClientFailsToReceive
  ): void {
    try {
      const clientInfo = this.clients.getClientInfo(clientId);

      if (ifFailTryAgain == null || ifFailTryAgain == true)
        clientInfo.pendingMessages.push({
          dataSentToClient: sendData,
          firstTryAt: Date.now(),
          onClientReceiveWithSuccess: onClientReceiveWithSuccess,
          onClientFailsToReceive: onClientFailsToReceive,
        });

      this.server4Flutter.logger(
        "Sending message to client",
        "debug",
        sendData
      );

      if (clientInfo.sendMessage)
        clientInfo.sendMessage(JSON.stringify(sendData));
      else
        this.server4Flutter.logger(
          "Message not sent, waiting the client connect again...",
          "debug",
          sendData
        );
    } catch (e) {
      this.server4Flutter.logger("assertSendDataToClient error", "error", {
        stack: e.stack,
        sendData,
      });
    }
  }
}
