import {AsklessServer, RespondSuccess, RespondError} from "../../dist/askless";
import {SimpleCheckBearerExample} from "./auth/SimpleCheckBearerExample";
import {createProductRoute, deleteProductRoute, listAllProductsRoute} from "./routes/ProductsRoute";


const server = new AsklessServer();

const isProduction = false;

server.init({
    projectName: 'catalog-javascript-client',
    grantConnection: SimpleCheckBearerExample.validateToken,
    sendInternalErrorsToClient: !isProduction,
    logger: {
        useDefaultLogger: !isProduction,

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
    deleteProductRoute
]);

server.start();

