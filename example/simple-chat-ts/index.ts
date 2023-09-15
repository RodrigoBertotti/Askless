import {AsklessServer} from "../../src";
import {MessageModel} from "./message-model";
import {MessageEntity} from "./message-entity"; // TODO: import

const server = new AsklessServer<"blue" | "green">();
const isProduction = false;
const allMessages = [];

server.init({
    sendInternalErrorsToClient: !isProduction,
    authenticate: (credential, accept, reject) => {
        accept.asAuthenticatedUser({ userId: credential["myColor"] });
        // fake authentication, please check [TODO] for a real authentication example or the docs
    },
    debugLogs: !isProduction,
    wsOptions : {
        port : 3000
    },
});

const readRouteInRealtime = server.addRoute.forAuthenticatedUsers.read<MessageEntity[]>({
    route: 'message',
    handleRead: async (context) => {
        context.successCallback(allMessages);
    },
    onClientStartsListening: async (context) => {
        readRouteInRealtime.notifyChanges({
            where: (whereContext) => {
                return whereContext.userId == context.userId;
            },
            handleReadOverride: (readContext) => {
                readContext.successCallback(
                    [ //Send array of messages with one item only
                        new MessageEntity( //Send array of messages with one item only
                            /** text      */'server said: Welcome to the simple-chat-ts screen!',
                            /** origin    */ context.userId,
                            /** createdAt */ new Date(),
                        )
                    ]
                );
            },
        });
    },
    onClientStopsListening: async (context) => {
        readRouteInRealtime.notifyChanges({
            where: (whereContext) => whereContext.userId != context.userId,
            handleReadOverride: readContext => {
                readContext.successCallback([
                    new MessageEntity( //Send array of messages with one item only
                        /** text      */'server said: '+context.userId+' has been disconnected from the chat and didn\'t connect again',
                        /** origin    */ readContext.userId,
                        /** createdAt */ new Date(),
                    )
                ])
            }
        });
    },
    toOutput: entityList => {
        return MessageModel.fromEntityList(entityList).map(model => model.toOutput());
    }
});


server.addRoute.forAuthenticatedUsers.create<MessageEntity>({
    route: 'message',
    handleCreate: (async (context) => {
        const message:MessageEntity = new MessageEntity(context.body.text, context.userId, new Date());
        allMessages.push(message);

        //notify the route where client receives in realtime
        readRouteInRealtime.notifyChanges({
            handleReadOverride: readContext => {
                readContext.successCallback([ //Send array of messages with one item only
                    message
                ]);
            }
        });
        context.successCallback(message);
    }),
    toOutput: entity => MessageModel.fromEntity(entity).toOutput(),
});

server.start();

console.log('my local server url: '+server.localUrl);
