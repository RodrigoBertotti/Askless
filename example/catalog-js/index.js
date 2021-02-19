const askless = require("../../dist/askless");
const routes = require("./routes/ProductsRoute");
const SimpleCheckBearerExample = require("./auth/SimpleCheckBearerExample");

const server = new askless.AsklessServer();

const isProduction = false;


const ownClientId_bearer = {
    1: 'Bearer abcd',
    2: 'Bearer efgh',
    3: 'Bearer ijkl'
};

function validateToken (ownClientId, headers) {
    const realToken = SimpleCheckBearerExample.ownClientId_bearer[ownClientId];
    return headers['Authorization'] === realToken;
}

server.init({
    projectName: 'catalog-javascript-client',
    grantConnection: SimpleCheckBearerExample.validateToken,
    sendInternalErrorsToClient: !isProduction,
    logger: {
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
    routes.createProductRoute,
    routes.listAllProductsRoute,
    routes.deleteProductRoute
]);

server.start();

console.log('my local server url: '+server.localUrl);
