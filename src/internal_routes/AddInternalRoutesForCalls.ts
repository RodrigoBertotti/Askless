import {AsklessServer} from "../index";



export class AddInternalRoutesForCalls<USER_ID> {


    run (askless:AsklessServer<USER_ID>)  {

        /**
         * key (string): userId1 _ userId2 (separated by underscore), userId1 is the one who generated the SDP offer
         * value (string[]): SDP offer object with other data
         * */
        const sdp: Map<string, any> = new Map();

         /**
         * key (string): userId1 _ userId2 (separated by underscore), userId1 is the one who generated the ICE
         * value (string[]): ICE values
         * */
        const iceList:Map<string, string[]> = new Map();

        const receivingCallRequest:Map<USER_ID, Array<USER_ID>> = new Map();

        /** Users where are alone in the call, waiting for the remote user come back  */
        const aloneUsers:USER_ID[] = [];

        const listeningForNewCalls = askless.addRoute.forAuthenticatedUsers.read({
            route: "askless-internal/call/receive",
            onClientStartsListening: () => {
                askless.logger("client started listening to \"askless-internal/call/receive\"", "debug");
            },
            onClientStopsListening: () => {
                askless.logger("client stopped listening to \"askless-internal/call/receive\"", "debug");
            },
            handleRead: context => {
                const remoteUserIdList:Array<USER_ID> = receivingCallRequest[context.userId as any] ?? [];

                if (remoteUserIdList.length) {
                    const index = context.locals["index"] = 0;
                    const remoteUserId = remoteUserIdList[index];
                    const _sdp = sdp[`${remoteUserId}_${context.userId}`];
                    if (_sdp == null) {
                        throw Error(`sdp is null for ${remoteUserId} and ${context.userId}`);
                    }
                    context.successCallback({
                        "hasCallRequest": true,
                        "remoteUserId": remoteUserId,
                        ..._sdp,
                    });
                    return;
                }

                context.successCallback({
                    "hasCallRequest": false,
                });
            },
            toOutput: entity => entity,
        });

        const listeningForICE = askless.addRoute.forAuthenticatedUsers.read({
            route: "askless-internal/call/ice-candidate-list",
            handleRead: context => {
                const remoteUserId = context.params["remoteUserId"];
                context.successCallback({
                    "remoteUserId": remoteUserId,
                    "iceCandidateList": iceList[`${remoteUserId}_${context.userId}`] ?? []
                });
            },
            onReceived: (entity, context) => {
                askless.logger("askless-internal/call/ice-candidate-list: RECEIVED!", "debug");
                const remoteUserId = context.params["remoteUserId"];
                delete iceList[`${remoteUserId}_${context.userId}`];
            },
            toOutput: entity => entity,
        });

        askless.addRoute.forAuthenticatedUsers.create({
            route: "askless-internal/call/ice-candidate-list",
            handleCreate: context => {
                const remoteUserId = context.body["remoteUserId"];
                iceList[`${context.userId}_${remoteUserId}`] = context.body["iceCandidateList"];

                context.successCallback({});

                listeningForICE.notifyChanges({
                    where: context => context.userId == remoteUserId,
                });
            },
            toOutput: entity => entity,
        });

        /**
         * Useful to:
         * - send a response wheter the call was accepted or not
         * - send event telling the call was closed
        */
        const listeningForACall = askless.addRoute.forAuthenticatedUsers.read({
            route: "askless-internal/call/listen-for-a-call",
            onReceived: (entity, context) => {
                askless.logger("on received: askless-internal/call/listen-for-a-call", "debug", entity);

                if (entity["callAccepted"] == false) {
                    askless.logger("on received call rejected!: askless-internal/call/listen-for-a-call", "debug");
                    cleanCall(context.userId, context.params["remoteUserId"]);
                }
            },
            handleRead: context => {
                context.successCallback({
                    ...sdp[`${context.params["remoteUserId"]}_${context.userId}`] ?? {},
                    remoteUserId: context.params["remoteUserId"],
                });
            },
            onClientStartsListening: (context) => {
                askless.logger("askless-internal/call/listen-for-a-call: onClientStartsListening: "+context.userId + " started listening to chat with "+context.params["remoteUserId"], "debug");
                notifyRemoteUserConnectionChanged(context.params["remoteUserId"], true);
            },
            onClientStopsListening: (context) => {
                askless.logger("askless-internal/call/listen-for-a-call: onClientStopsListening: "+context.userId + " stopped listening to chat with "+context.params["remoteUserId"], "debug");

                if (aloneUsers.includes(context.userId)) {
                    cleanCall(context.userId, context.params["remoteUserId"]);
                } else {
                    // notifying connection has been changed
                    notifyRemoteUserConnectionChanged(context.params["remoteUserId"], false);
                }

                let requestingCall = false;
                // if a call request is in progress, cancel it by deleting the array references
                for (const u of [{userId1: context.userId, userId2: context.params["remoteUserId"]}, {userId2: context.userId, userId1: context.params["remoteUserId"]}]) {
                    const userIdIndex = (receivingCallRequest[u.userId1 as any] as Array<USER_ID> ?? []).indexOf(u.userId2);
                    requestingCall ||= userIdIndex >= 0;
                }

                if (requestingCall) {
                    for (const u of [{userId1: context.userId, userId2: context.params["remoteUserId"]}, {userId2: context.userId, userId1: context.params["remoteUserId"]}]) {
                        cleanCall(u.userId1, u.userId2);
                        listeningForACall.notifyChanges({
                            where: whereContext => whereContext.userId == u.userId2 && whereContext.params["remoteUserId"] == u.userId1,
                            handleReadOverride: (c) => {
                                c.successCallback({
                                    "callClosed": true,
                                    "callAccepted": false,
                                })
                            }
                        });
                    }
                }


            },
            toOutput: entity => entity,
        });

        const notifyRemoteUserConnectionChanged = (userId: USER_ID, remoteUserIsConnected: boolean) => {
            if (userId == null) {
                throw Error("userId is null");
            }

            if (remoteUserIsConnected) {
                const index = aloneUsers.indexOf(userId);
                if (index >=0) {
                    aloneUsers.splice(index, 1);
                }
            } else {
                aloneUsers.push(userId);
            }

            listeningForACall.notifyChanges({
                where: whereContext => {
                    return whereContext.userId == userId;
                },
                handleReadOverride: (context) => {
                    context.successCallback({
                        "remoteUserIsConnected": remoteUserIsConnected,
                    });
                },
            })
        }

        askless.addRoute.forAuthenticatedUsers.create({
            route: "askless-internal/call/request",
            handleCreate: context => {
                const remoteUserId = context.body["remoteUserId"];
                delete context.body["remoteUserId"];

                if (receivingCallRequest[remoteUserId] == null) {
                    receivingCallRequest[remoteUserId] = [];
                }
                receivingCallRequest[remoteUserId].push(context.userId);
                sdp[`${context.userId}_${remoteUserId}`] = context.body;

                context.successCallback({info: "You requested a call"});

                listeningForNewCalls.notifyChanges({
                    where: whereContext => whereContext.userId == remoteUserId,
                });
            },
            toOutput: entity => entity,
        });

        askless.addRoute.forAuthenticatedUsers.create({
            route: "askless-internal/call/response",
            handleCreate: context => {
                const remoteUserId = context.body["remoteUserId"];
                if (remoteUserId == context.userId) {
                    throw Error("is the same id!");
                }

                if (remoteUserId == null) {
                    throw Error("remoteUserId is null: "+JSON.stringify(context.body));
                }

                delete context.body["remoteUserId"];


                if (context.body["callAccepted"]) {
                    askless.logger("askless-internal/call/response: accepting call..", "debug");

                    if (receivingCallRequest[context.userId as any] == null) {
                        askless.logger("askless-internal/call/response: can't accept call, because the call is no longer available", "debug");
                        context.errorCallback({
                            code: "CALL_NOT_AVAILABLE_ANYMORE",
                            description: "The call is no longer available"
                        });
                        return;
                    }
                    /*
                         "callAccepted": true,
                         "remoteUserId": remoteUserId,
                         "sdp": sdpAnswer.toMap(),
                         "additionalData": additionalData ?? {},
                    */
                    sdp[`${context.userId}_${remoteUserId}`] = context.body;
                } else {
                    askless.logger("askless-internal/call/response: rejecting call..", "debug");
                    sdp[`${context.userId}_${remoteUserId}`] = {
                        "callClosed": true,
                        "callAccepted": false,
                        "additionalData": context.body["additionalData"] ?? {},
                    };
                }

                const remoteUserIdIndex = (receivingCallRequest[context.userId as any] as Array<USER_ID>)?.indexOf(remoteUserId);
                if (remoteUserIdIndex != null && remoteUserIdIndex >= 0) {
                    (receivingCallRequest[context.userId as any] as Array<USER_ID>).splice(remoteUserIdIndex, 1);
                }

                context.successCallback({
                    "info": context.body["callAccepted"]
                        ? `You (user ${context.userId}) accepted the call of user ${remoteUserId}`
                        : `You (user ${context.userId}) rejected the call of user ${remoteUserId}`
                });

                listeningForACall.notifyChanges({
                    where: whereContext => whereContext.userId == remoteUserId,
                });
            },
            toOutput: entity => entity,
        });


        const cleanCall = (userId1: USER_ID, userId2: USER_ID) => {
            askless.logger(`CLEANING CALL: ${userId1} and ${userId2}`, "debug");

            listeningForACall.stopListening(userId1);
            listeningForACall.stopListening(userId2);

            delete sdp[`${userId1}_${userId2}`];
            delete sdp[`${userId2}_${userId1}`];
            delete iceList[`${userId1}_${userId2}`];
            delete iceList[`${userId2}_${userId1}`];

            const indexUser1:number = receivingCallRequest[userId2 as any]?.indexOf(userId1);
            if (indexUser1 != null && indexUser1 >= 0) {
                receivingCallRequest[userId2 as any].splice(indexUser1, 1);
            }
            const indexUser2:number = receivingCallRequest[userId1 as any]?.indexOf(userId2);
            if (indexUser2 != null && indexUser2 >= 0) {
                receivingCallRequest[userId1 as any].splice(indexUser2, 1);
            }

            if (receivingCallRequest[userId1 as any] == userId2) {
                delete receivingCallRequest[userId1 as any];
            }
            if (receivingCallRequest[userId2 as any] == userId1) {
                delete receivingCallRequest[userId2 as any];
            }

            const aloneUser1Index = aloneUsers.indexOf(userId1);
            if (aloneUser1Index >= 0) {
                aloneUsers.splice(aloneUser1Index, 1);
            }

            const aloneUser2Index = aloneUsers.indexOf(userId2);
            if (aloneUser2Index >= 0) {
                aloneUsers.splice(aloneUser2Index, 1);
            }
        }

        askless.addRoute.forAuthenticatedUsers.create({
            route: "askless-internal/call/close",
            handleCreate: context => {
                const remoteUserId = context.body["remoteUserId"];

                cleanCall(context.userId, remoteUserId);

                context.successCallback({});

                listeningForACall.notifyChanges({
                    where: whereContext => whereContext.userId == remoteUserId && whereContext.params["remoteUserId"] == context.userId,
                    handleReadOverride: (c) => {
                        c.successCallback({
                            "callClosed": true,
                        })
                    }
                });
            },
            toOutput: entity => entity,
        });
    }

}
