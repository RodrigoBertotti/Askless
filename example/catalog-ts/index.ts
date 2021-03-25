import {AsklessServer, RespondSuccess, RespondError} from "../../dist/askless";
import {SimpleCheckBearerExample} from "./auth/SimpleCheckBearerExample";
import {
    createProductRoute,
    deleteProductRoute,
    listAllProductsReversedRoute,
    listAllProductsRoute
} from "./routes/ProductsRoute";


const server = new AsklessServer();

const isProduction = false;

server.init({
    projectName: 'catalog',
    grantConnection: SimpleCheckBearerExample.validateToken,
    sendInternalErrorsToClient: !isProduction,
    logger: isProduction ? null : { // DO NOT DO SHOW ASKLESS LOGS ON THE CONSOLE ON A PRODUCTION ENVIRONMENT
        customLogger: (message, level, additionalData) =>{
            console.log(level +': '+message);
            if(additionalData){
                console.log(JSON.stringify(additionalData));
            }
        }
    },
    wsOptions : {
        port : 3000
    }
});

server.addRoute([
    createProductRoute,
    listAllProductsRoute,
    listAllProductsReversedRoute,
    deleteProductRoute,
]);

server.start();

console.log('my local server url: '+server.localUrl);
