import {ClientMiddleware} from "../../ClientMiddleware";
import {AsklessError, AsklessErrorCode, ServerError, ws_clientIdInternalApp, ws_isAlive} from "../../../index";
import {PingPong} from "../../../client/PingPong";
import {AsklessResponse} from "../../../client/response/OtherResponses";
import * as WebSocket from "ws";
import {ReceiveMessageHandler} from "./ReceiveMessageHandler/ReceiveMessageHandler";


export class OnMessage {
    private readonly receiveMessageHandler: ReceiveMessageHandler;

    constructor(public readonly middleware: ClientMiddleware, public ws: WebSocket) {
        this.receiveMessageHandler = new ReceiveMessageHandler(this.middleware.askless);
    }

    public async handlePingFromClient(pingClient: PingPong, clientIdInternalApp?: string) {
        if (!clientIdInternalApp) {
            this.middleware.askless.logger("Ignoring handlePingFromClient because clientIdInternalApp is null", "error");
            return;
        }
        const clientInfoServer = this.middleware.askless.clientMiddleware.clients.getOrCreateClientInfo(clientIdInternalApp);

        if (clientInfoServer.sendMessage != null)
            clientInfoServer.sendMessage("pong");
        else
            this.middleware.askless.logger('handlePingFromClient: Could not send the "pong" to client', "error");

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
                this.middleware.askless.clientMiddleware.clients.stopListening(
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

        for (const listen of routesThatServerDoesntSendToClientAnymoreButServerShould) {
            if (listen.clientRequestId == null) {
                throw "listen.clientRequestId is null: "+listen.route;
            }

            const service = this.middleware.askless.getReadRoute(listen.route);
            service.listen(clientIdInternalApp,
                listen.clientRequestId,
                listen.params,
                listen.listenId
            );
        }
    }

    readonly onMessage = async (data:WebSocket.Data) => {
        const req = JSON.parse(data.toString());
        //self.server.logger("client "+this.ws[this.ws_clientId]+" said (alive="+this.ws[this.ws_isAlive]+")", "debug", req);

        this.ws[ws_isAlive] = true;
        if (req && req[PingPong.type] != null) {
            //is ping from client
            if (this.ws[ws_clientIdInternalApp] != null) {
                await this.handlePingFromClient(req, this.ws[ws_clientIdInternalApp]);
            } else {
                this.middleware.askless.logger('handlePingFromClient ignored because ws_clientIdInternalApp is NULL!!', "debug");
            }
            return;
        }

        if (!req || !req.clientRequestId?.length) {
            // noinspection ExceptionCaughtLocallyJS
            throw Error("Invalid request, no clientRequestId");
        }

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
        this.middleware.askless.logger("error: " + e["type"], "debug");
        const error = e as ServerError;
        const invalidToken: boolean =
            error.code == AsklessErrorCode.INVALID_CREDENTIAL;
        const response = new AsklessResponse(
            req.clientRequestId,
            null,
            new AsklessError({
                description: error.message,
                code: error.code,
            })
        );
        if (invalidToken) {
            this.ws.send(JSON.stringify(response));
            this.ws.close();
        } else {
            this.middleware.assertSendDataToClient(
                this.ws[ws_clientIdInternalApp],
                response,
                true,
                undefined,
            );
        }
    }

    private handleNonServerError(err, req) {
        this.middleware.askless.logger(err.toString(), "error", err.stack);
        this.middleware.assertSendDataToClient(
            this.ws[ws_clientIdInternalApp],
            new AsklessResponse(
                req.clientRequestId,
                null,
                new AsklessError({
                    code: AsklessErrorCode.INTERNAL_ERROR,
                    description: this.middleware.askless.config
                        .sendInternalErrorsToClient
                        ? err.stack
                        : "An internal error occurred",
                })
            ),
            true,
            undefined,
        );
    }
}
