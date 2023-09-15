import {ConfigureConnectionRequestCli} from "../../../../client/RequestCli";
import {
    AsklessServer,
    ws_clientIdInternalApp,
    ws_clientType
} from "../../../../index";
import {ConfigureConnectionAsklessResponse} from "../../../../client/response/OtherResponses";
import {ClientInfo} from "../../../Clients";
import WebSocket = require("ws");

/** step one */

export class ConfigureConnectionRequestHandler {

    constructor(public readonly askless: AsklessServer) {}

    async handle(input:ConfigureConnectionRequestCli, clientWsEndpoint:WebSocket) : Promise<void> {
        input = Object.assign({}, input) as ConfigureConnectionRequestCli;
        if (input.clientIdInternalApp == null) {
            throw Error("input.clientIdInternalApp is null");
        }
        clientWsEndpoint[ws_clientIdInternalApp] = input.clientIdInternalApp;
        clientWsEndpoint[ws_clientType] = input.clientType;

        this.configureClientInfo(input.clientType, clientWsEndpoint);

        this.askless.clientMiddleware.confirmReceiptToClient(clientWsEndpoint[ws_clientIdInternalApp], input.clientRequestId);

        this.askless.clientMiddleware.assertSendDataToClient(
            clientWsEndpoint[ws_clientIdInternalApp],
            new ConfigureConnectionAsklessResponse(
                input.clientRequestId,
                this.askless.getConnectionConfiguration(clientWsEndpoint[ws_clientType]),
            ),
            true,
            () => {},
        );
    }

    private configureClientInfo(clientType:'flutter' | 'javascript', clientWsEndpoint:WebSocket) : ClientInfo {
        const clientInfo = this.askless.clientMiddleware.clients.getOrCreateClientInfo(clientWsEndpoint[ws_clientIdInternalApp]);
        clientInfo.clientType = clientType;
        clientInfo.clearAuthentication();
        clientInfo.sendMessage = (message: string) => {
            try {
                if (clientWsEndpoint) {
                    clientWsEndpoint.send(message);
                } else {
                    this.askless.logger("ClientMiddleware: this.ws null: the client " + clientWsEndpoint[ws_clientIdInternalApp] + " is not connected anymore", "error");
                }
            } catch (e) {
                this.askless.logger("ClientMiddleware", "error", e);
            }
        };
        clientInfo.onClose = () => {
            this.askless.logger("onClose websocket " + clientWsEndpoint[ws_clientIdInternalApp], "debug");

            Array.from(clientInfo.routesBeingListen).forEach((routeBeingListen) => {
               this.askless.getReadRoute(routeBeingListen.route).stopListening(clientInfo.clientIdInternalApp, routeBeingListen.listenId, routeBeingListen.route);
            });

            //Apaga apenas as informações relacionadas a conexão, não apaga mensagens pendentes
            //As respostas serão deixadas ainda, serão apagadas depois
            clientInfo.userId = undefined;
            clientInfo.claims = undefined;
            clientInfo.sendMessage = undefined;
            clientInfo.authentication = undefined;
            clientInfo.doWsDisconnect = undefined;
            clientInfo.disconnectedAt = Date.now();
        };
        clientInfo.doWsDisconnect = () => {
            this.askless.logger("doWsDisconnect " + clientWsEndpoint[ws_clientIdInternalApp], "debug");
            clientWsEndpoint.close();
        };
        return clientInfo;
    }
}
