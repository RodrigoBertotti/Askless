import {
    AcceptConnectionAuthenticatedParams,
    RejectConnectionParams, AsklessError,
    AsklessErrorCode,
    ws_clientIdInternalApp, AsklessServer, AuthenticateUserContext,
} from "../../../../index";
import {AsklessResponse, AuthenticateAsklessResponse} from "../../../../client/response/OtherResponses";
import WebSocket = require("ws");
import {AuthenticateRequestCli} from "../../../../client/RequestCli";
import {WhereContext} from "../../../../route/ReadRoute";

/** step two */

export class AuthenticateRequestHandler {

    constructor(public readonly askless: AsklessServer) {}

    async handle(input:AuthenticateRequestCli, clientWsEndpoint:WebSocket) : Promise<void> {
        input = Object.assign({}, input) as AuthenticateRequestCli;
        const clientInfo = this.askless.clientMiddleware.clients.getOrCreateClientInfo(clientWsEndpoint[ws_clientIdInternalApp]);
        clientInfo.clearAuthentication();

        let authenticated: boolean;
        let errorCode: string;
        let errorDescription: string;
        let success = false;
        const permissionResult: null | AcceptConnectionAuthenticatedParams<any> | RejectConnectionParams = await new Promise(async (resolve) => {
            setTimeout(() => {
                if (authenticated == null) {
                    authenticated = false;
                    errorCode = AsklessErrorCode.AUTHORIZE_TIMEOUT;
                    errorDescription = "The server didn't authorize (TIMEOUT)"
                    resolve({});
                }
            }, 4 * 1000);
            await this.askless.config.authenticate(
                input.credential,
                {
                    asUnauthenticatedUser: () => {
                        if(authenticated == null) {
                            authenticated = false;
                            success = true;
                            resolve({});
                        } else if (errorCode == AsklessErrorCode.AUTHORIZE_TIMEOUT) {
                            throw new Error("(TIMEOUT) You didn't call asUnauthenticatedUser() in time")
                        } else {
                            throw new Error("You already defined whether this user is authenticated or not");
                        }
                    },
                    asAuthenticatedUser: (params) => {
                        if(authenticated == null) {
                            authenticated = true;
                            success = true;
                            if (typeof params != "object") {
                                throw new Error("Ops, the params o asAuthenticatedUser({userId: 1, ... }) should be an object");
                            }
                            if (params.userId == null) {
                                throw new Error("asAuthenticatedUser: please inform a userId");
                            }
                            resolve(params ?? {});
                        } else if (errorCode == AsklessErrorCode.AUTHORIZE_TIMEOUT) {
                            throw new Error("(TIMEOUT) You didn't call asAuthenticatedUser() in time")
                        } else {
                            throw new Error("You already defined whether this user is authenticated or not");
                        }
                    }
                },
                (res)  => {
                    if (authenticated != null){
                        throw new Error("You already defined whether this user is authenticated or not");
                    }
                    success = false;
                    authenticated = false;
                    errorDescription = `The authentication was rejected: ${errorCode}`;
                    errorCode = res?.credentialErrorCode ?? AsklessErrorCode.INVALID_CREDENTIAL;
                    resolve(res ?? {credentialErrorCode: errorCode});
                }
            );
        });

        if (authenticated == null) { throw Error ("authenticated is still null"); }

        if (!input?.clientIdInternalApp) {
            throw Error("input.clientId is null/empty");
        }

        if (authenticated) {
            const userId:string | number = (permissionResult as AcceptConnectionAuthenticatedParams<any>).userId;
            const claims:string[] = (permissionResult as AcceptConnectionAuthenticatedParams<any>).claims;
            const locals:object | null = (permissionResult as AcceptConnectionAuthenticatedParams<any>).locals;
            if (!userId) {
                throw Error("Please, inform a \"userId\"");
            }
            clientInfo.userId = userId;
            clientInfo.claims = claims ?? [];
            clientInfo.locals = locals ?? {};
            clientInfo.authentication = "authenticated";
        } else {
            clientInfo.authentication = "unauthenticated";
            clientInfo.credentialErrorCode = (permissionResult as RejectConnectionParams).credentialErrorCode;
        }
        this.askless.clientMiddleware.confirmReceiptToClient(clientWsEndpoint[ws_clientIdInternalApp], input.clientRequestId);

        if (success) {
            this.askless.clientMiddleware.assertSendDataToClient(
                clientWsEndpoint[ws_clientIdInternalApp],
                new AuthenticateAsklessResponse(input.clientRequestId,  authenticated
                    ? { userId: clientInfo.userId, claims: clientInfo.claims ?? [] }
                    : {}, // Sending success in case the user is switching back to not authenticated, like in the catalog example.
                ),
                true,
                () => {
                    // for each listening, send data
                    for (let route of clientInfo.routesBeingListen) {
                        this.askless.clientMiddleware.askless.getReadRoute(route.route).notifyChanges({
                            where: (context: WhereContext & AuthenticateUserContext<any>) => {
                                return context.userId == clientInfo.userId;
                            },
                        })
                    }
                },
            );
        } else {
            if (errorCode == null) { throw Error("errorCode is still null"); }
            if (errorDescription == null) { throw new Error("errorDescription is still null"); }
            this.askless.clientMiddleware.assertSendDataToClient(
                clientWsEndpoint[ws_clientIdInternalApp],
                new AuthenticateAsklessResponse(
                    input.clientRequestId,
                    { credentialErrorCode: (permissionResult as RejectConnectionParams)?.credentialErrorCode ?? AsklessErrorCode.INVALID_CREDENTIAL },
                    new AsklessError({
                        code: errorCode,
                        description: errorDescription,
                    }),
                ),
                true,
                () => {
                    clientWsEndpoint[ws_clientIdInternalApp]?.close();
                }
            );
        }
    }
}
