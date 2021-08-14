import {ClientMiddleware} from "../../ClientMiddleware";
import {RespondError, RespondErrorCode, ServerError, ws_clientId, ws_isAlive} from "../../../index";
import {PingPong} from "../../../client/PingPong";
import {ResponseCli} from "../../../client/response/OtherResponses";
import * as WebSocket from "ws";
import {ReceiveMessageHandler} from "./ReceiveMessageHandler/ReceiveMessageHandler";


export class OnMessage{
    private readonly receiveMessageHandler: ReceiveMessageHandler;

    constructor(public readonly middleware: ClientMiddleware, public ws: WebSocket) {
        this.receiveMessageHandler = new ReceiveMessageHandler(this.middleware.server);
    }

    readonly onMessage = async (data:WebSocket.Data) => {
        const req = JSON.parse(data.toString());
        //self.server.logger("client "+this.ws[this.ws_clientId]+" said (alive="+this.ws[this.ws_isAlive]+")", "debug", req);
        try {
            await this.receiveMessageHandler.handleClientRequestInput(req, this.ws);
        } catch (err) {
            if ((err as ServerError).code != null) {
                this.handleServerError(err as ServerError, req);
            } else {
                this.handleNonServerError(err, req);
            }
        }
    };

    private handleServerError(e: ServerError, req) {
        //ServerError
        this.middleware.server.logger("error: " + e["type"], "debug");
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
            this.ws.send(JSON.stringify(response));
            this.ws.close();
        } else {
            this.middleware.assertSendDataToClient(
                this.ws[ws_clientId],
                response,
                true,
                undefined,
                undefined
            );
        }
    }

    private handleNonServerError(err, req) {
        this.middleware.server.logger(err.toString(), "error", err.stack);
        this.middleware.assertSendDataToClient(
            this.ws[ws_clientId],
            new ResponseCli(
                req.clientRequestId,
                null,
                new RespondError({
                    code: RespondErrorCode.INTERNAL_ERROR,
                    description: this.middleware.server.config
                        .sendInternalErrorsToClient
                        ? err.stack
                        : "An internal error occurred",
                    stack: this.middleware.server.config.sendInternalErrorsToClient
                        ? err.stack
                        : null,
                })
            ),
            true,
            undefined,
            undefined
        );
    }
}
