const askless = require("../../dist/askless");

const server = new askless.AsklessServer();
const isProduction = false;
const allMessages = [];

server.init({
    projectName: 'chat-js',
    sendInternalErrorsToClient: !isProduction,
    logger: {
        customLogger: (message, level, additionalData) =>{
            console.log('> '+level +': '+message);
            if(additionalData){
                console.log(JSON.stringify(additionalData));
            }
        }
    },
    wsOptions : {
        port : 3000
    },
});

const readRouteInRealtime = server.addReadRoute({
    route: 'message',
    read: async (context) => {
        context.respondSuccess({
            output: allMessages
        });
    },
    realtimeOutputHandler: (context) => {
        return {
            notifyThisClient: context.ownClientId !== 'yellow',
        };
    },
    onClientStartsListening: async (context) => {
        await readRouteInRealtime.notifyClients({
            output: [ //Send array of messages with one item only
                {
                    'text': 'server said: Welcome to the chat-js screen!',
                    'origin': context.ownClientId //origin: blue or green
                }
            ],
            sendToSpecificClientsIds: [ context.ownClientId ],
        });
    },

    onClientStopsListening: async (context) => {
        server.notifyClients('message', {
            output: [
                {
                    'text': 'server said: '+context.ownClientId+' closed the chat-js screen',
                    'origin': context.ownClientId === 'blue' ? 'green' : 'blue'
                } //Send array of messages with one item only
            ],
        });
    }
});

server.addCreateRoute({
    route: 'message',
    create: (async (context) => {
        const message = {
            text: context.body.text,
            origin: context.ownClientId
        };
        allMessages.push(message);

        //notify the route where client receives in realtime
        server.notifyClients('message', {
            output: [
                message //Send array of messages with one item only
            ],
        });
        context.respondSuccess();
    }),
});

server.start();

console.log('my local server url: '+server.localUrl);
