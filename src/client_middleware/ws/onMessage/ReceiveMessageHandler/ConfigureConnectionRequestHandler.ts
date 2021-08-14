import {ConfigureConnectionRequestCli} from "../../../../client/RequestCli";
import {RespondErrorCode, ServerError, ServerInternalImp, ws_clientId, ws_clientType} from "../../../../index";
import {ConfigureConnectionResponseCli} from "../../../../client/response/OtherResponses";
import {ClientInfo, Clients} from "../../../Clients";
import WebSocket = require("ws");
import {getOwnClientId} from "../../../../Utils";


export class ConfigureConnectionRequestHandler {

    constructor(public readonly internalServerImp: ServerInternalImp) {}

    async handle(_input:object, clientWsEndpoint:WebSocket) : Promise<void> {
        const input = Object.assign(new ConfigureConnectionRequestCli(null,null), _input) as ConfigureConnectionRequestCli;
        const ownClientIdOrNull = getOwnClientId(input.clientId);
        if (
            ownClientIdOrNull != null &&
            !(await this.internalServerImp.config.grantConnection?.call(ownClientIdOrNull, input.headers))
        ) {
            throw new ServerError(
                "The client " +
                clientWsEndpoint[ws_clientId]?.toString() +
                " doesn't informed a valid token on header",
                RespondErrorCode.TOKEN_INVALID
            );
        }
        clientWsEndpoint[ws_clientId] = clientWsEndpoint[ws_clientId] = input.clientId;
        clientWsEndpoint[ws_clientType] = input.clientType;

        const clients = this.internalServerImp.clientMiddleware.clients;
        clients.removeClientInfo(clientWsEndpoint[ws_clientId]); //Quando o cliente se desconecta e se conecta novamente, o clientId é o mesmo
        this.configureClientInfo(input.clientType, clientWsEndpoint);

        this.internalServerImp.clientMiddleware.clients.setHeaders(clientWsEndpoint[ws_clientId], input.headers || {});
        // console.log('-------------- INPUT ConfigureConnectionRequestCli ---------------');
        // console.log(JSON.stringify(_input));
        this.internalServerImp.clientMiddleware.confirmReceiptToClient(clientWsEndpoint[ws_clientId], input.clientRequestId);
        //clientMiddleware.sendDataToClient(clientId,'test');
        this.internalServerImp.clientMiddleware.assertSendDataToClient(
            clientWsEndpoint[ws_clientId],
            new ConfigureConnectionResponseCli(
                input.clientRequestId,
                this.internalServerImp.getConnectionConfiguration(clientWsEndpoint[ws_clientType])
            ),
           true,
        ); //TEM QUE VIR DEPOIS DE onHeadersRequestCallback
    }

    private configureClientInfo(clientType:'flutter' | 'javascript', clientWsEndpoint:WebSocket) : ClientInfo {
        const clientInfo = this.internalServerImp.clientMiddleware.clients.getOrCreateClientInfo(clientWsEndpoint[ws_clientId]);
        clientInfo.clientType = clientType;
        clientInfo.sendMessage = (message: string) => {
            try {
                if (clientWsEndpoint) {
                    clientWsEndpoint.send(message);
                } else {
                    this.internalServerImp.logger("ClientMiddleware: this.ws null: the client " + clientWsEndpoint[ws_clientId] + " is not connected anymore", "error");
                }
            } catch (e) {
                this.internalServerImp.logger("ClientMiddleware", "error", e);
            }
        };
        clientInfo.onClose = () => {
            this.internalServerImp.logger("onClose websocket " + clientWsEndpoint[ws_clientId], "debug");
            //Apaga apenas as informações relacionadas a conexão, não apaga mensagens pendentes
            //As respostas serão deixadas ainda, serão apagadas depois com o clientId_disconnectedAt
            clientInfo.sendMessage = undefined;
            clientInfo.headers = undefined;
            clientInfo.doWsDisconnect = undefined;
            clientInfo.disconnectedAt = Date.now();
        };
        clientInfo.doWsDisconnect = () => {
            this.internalServerImp.logger("doWsDisconnect " + clientWsEndpoint[ws_clientId], "debug");
            clientWsEndpoint.close();
        };
        return clientInfo;
    }
}
