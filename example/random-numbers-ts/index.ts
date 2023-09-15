import {AsklessServer} from "../../src";

const server = new AsklessServer();

server.init({
    wsOptions: { port : 3000, },
    debugLogs: true,
});

const newRandomNumber = () => parseInt(Math.random() * 1001 as any);

// optionally create a type
type DataEntity = { currentRandomNumber: number, generatedAt:Date };

const dataEntity:DataEntity = {
    generatedAt: new Date(),
    currentRandomNumber: newRandomNumber(),
};

const randomsRoute = server.addRoute.forAllUsers.read<DataEntity>({
    route: 'generated-random-number',
    handleRead: async (context) => {
        console.log("handleRead");
        context.successCallback(dataEntity);
    },
    toOutput: (dataEntity) => {
        return {
            "generatedAtTimestamp": dataEntity.generatedAt.getTime(),
            "currentRandomNumber": dataEntity.currentRandomNumber,
        };
    }
});

const interval = setInterval(() => {
    dataEntity.currentRandomNumber = newRandomNumber();
    console.log("new random: "+dataEntity.currentRandomNumber);
    dataEntity.generatedAt = new Date();
    // because we are not passing handleReadOverride(..),
    // handleRead(..) will be called again
    randomsRoute.notifyChanges();
}, 1000);

server.start();

console.log('my local server url: '+server.localUrl);
