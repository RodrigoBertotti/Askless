import {AsklessServer} from "../../src";
import {FakeAuthentication} from "./auth/fake-authentication";
import {initializeControllers} from "./controllers/controllers-and-services";


const server:AsklessServer = new AsklessServer();

const isProduction = false;

server.init({
    authenticate: (credential, accept, reject) => {
        FakeAuthentication.fakeAuthenticate(credential, accept, reject)
    },
    sendInternalErrorsToClient: !isProduction,
    debugLogs: !isProduction,
    wsOptions: { port : 3000 },
    waitForAuthenticationTimeoutInMs: 0,
});

initializeControllers(server);

server.start();

console.log(`my local server url: ${server.localUrl}`);
