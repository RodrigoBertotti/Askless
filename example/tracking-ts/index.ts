import {AsklessServer, RespondSuccess, RespondError} from '../../dist/askless';

const server = new AsklessServer();


server.init({
    projectName: 'tracking-ts',
    wsOptions : {
        port : 3000
    },
});

let trackingStatus = '';

server.addReadRoute({
    route: 'product/tracking-ts',
    read: async (context) => {
        context.respondSuccess({
            output: trackingStatus
        });
    },
});

let customerSaidCounter = 0;
server.addCreateRoute({
    route: 'product/customerSaid',
    create: (async (context) =>  {

        customerSaidCounter++;
        trackingStatus = 'Customer said: "'+context.body + '" '+ (customerSaidCounter) + " times";

        server.notifyClients('product/tracking-ts', {
            output: trackingStatus
        });

        context.respondSuccess();
    }),
});

server.start();

let kmRemaining = 1000000;
const kmRemainingTask = setInterval(() => {
    if(kmRemaining == 0){
        return clearInterval(kmRemainingTask);
    }
    kmRemaining --;

    trackingStatus = 'Product is '+(kmRemaining.toString())+' km away from you';
    server.notifyClients('product/tracking-ts', {
        output: trackingStatus
    });
}, 1 * 1000);
