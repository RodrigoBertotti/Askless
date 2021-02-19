  # Documentation
  
  :checkered_flag: [Português (Portuguese)](portugues_documentacao.md)
 
  Documentation of the server side in Node.js. 
  [Click here](https://github.com/WiseTap/askless-flutter-client) 
  to access the client side in Flutter.

  ## Important links
  *  [Getting Started](README.md): Regarding to the server in Node.js.
  *  [Getting Started (client)](https://github.com/WiseTap/askless-flutter-client/blob/master/README.md): Regarding to the client side in Flutter.
  *  [chat (example)](example/chat-js): Chat between the colors blue and green.
  *  [catalog (example)](example/catalog-ts): Users adding and removing products from a catalog.

  ## `init(...)` - Configuring the server
  
  Initialize and configure the server.

  ### `init` params - instance of of IServerConfiguration

  Example:
    
    const isProduction = false;
    
    server.init({
        projectName: 'catalog',
        grantConnection: async (ownClientId:string|number, headers:Map<string, any>) => {
            return (await checkIfIsValidToken(headers['Authorization']));
        },
        sendInternalErrorsToClient: !isProduction,
        logger: {
            useDefaultLogger: !isProduction
        },
        wsOptions : {
            port : 3000
        },
        requestTimeoutInSeconds: 30
    });

  The server configuration. 
  It's an object that can have the following fields:

  #### sendInternalErrorsToClient?:boolean

  If `true`: server internal errors can be sent to the client (optional).
  Keep as `false` when the server is running in production. Default: `false`.

  #### `projectName?:string`

  Name for this project (optional). 
  If `!= null`: the field `projectName` on client side must have the same name (optional).

  #### `requestTimeoutInSeconds?:number` 
  Time in seconds that client can wait for a response after requesting it to the server (optional).
  If `<= 0`: Timeout error never will occur. Default: 15 seconds.

  #### `wsOptions` 

  [Official documentation](https://github.com/websockets/ws/blob/0954abcebe027aa10eb4cb203fc717291e1b3dbd/doc/ws.md#new-websocketserveroptions-callback) 
  - The websocket configuration for the package [ws](https://github.com/websockets/ws) (optional). Default: port 3000.

  #### `logger`
 
  Allow you to customize the behavior of internal logs and enable/disable the default logger (optional).
 
  It's an object that can have the following fields:

  ##### `useDefaultLogger?:boolean` 
 
  If `true`: the default logger will be used (optional). Set to `false` on a production environment. Default: `false` 
  Example:
 
    server.init({
        logger: {
            useDefaultLogger: true
        },
    });

 ##### `customLogger`
 
 Allows the implementation of a custom logger (optional). Let it `null` on a production environment 
       
 Type: `(message, level, additionalData?) => void`
       
 Example:
        
    server.init({
        logger: {
                customLogger: (message, level, additionalData?: Object) => {
                    console.log(level+ ": "+message);
                    if(additionalData)
                        console.log(JSON.stringify(additionalData));
                }
        },
    });
      
<!-- askless-javascript-client & askless-flutter-client apontam para essa url # abaixo -->
 #### `grantConnection`
 
 Accepts or deny a connection attempt (optional).

 Check here if a token informed in headers is valid.
 
 Default: All connections attempts will be accept.

 Type: `(ownClientId?, headers?) => Promise<boolean>` 

 Example:

    server.init({
        grantConnection: async (ownClientId:string|number, headers:Map<string, any>) => {
            return (await checkIfIsValidToken(headers['Authorization']));
        },
    });
    
 [Another example](https://examples/catalog-ts/auth/SimpleCheckBearerExample.ts)
    
 ## `start()` - Running the server

 Starts the server. This method must be called after the server have been fully configured with [`init`](#init---configuring-the-server).

    server.start();
    
 ## `route` 
 Server is organized by `route`. 
 The operations that can be implemented in each `route` are:

 * `CreateRoute` to create data
 * `ReadRoute` to read and listen data
 * `UpdateRoute` to update data
 * `DeleteRoute` to remove data


`route` can be implemented in two different ways:

 ### Option 1: With `addCreateRoute`, `addReadRoute`,`addUpdateRoute` e `addDeleteRoute`:

 Setting the behavior of each `route` directly. Example:

    const server = new AsklessServer();
    server.addCreateRoute({
        route: 'product',
        create: (async (context) => {
            let product = context.body as Product;
            product = await productsRepository.save(product);
            context.respondSuccess(product);
        }),
    });
    
 [Another example](example/chat-js)

 ### Option 2: With `addRoute(routesList)` 
 Allows add an instance of an object that extends
 [CreateRoute](#createroute), [ReadRoute](#readroute), 
 [UpdateRoute](#updateroute) or [DeleteRoute](#deleteroute):

 CreateProductRoute.ts

    class CreateProductRoute extends CreateRoute {
        constructor() {super('product');}
        
        create(context: CreateRouteContext): void{
            let product = context.body as Product;
            product = await productsRepository.save(product);
            context.respondSuccess(product);
        }
    }


 index.js

    const server = new AsklessServer();
    const createProductRoute = new CreateProductRoute();
    server.addRoute(createProductRoute);

 [Another example (project)](example/catalog-ts)


 An array can be added using `addRoute(routesList)` as well

    server.addRoute([
        createProductRoute,
        listAllProductsRoute,
        deleteProductRoute
    ]); 

 ## `respondSuccess` e `respondError`
 
 Each `route` must call `context.respondSuccess(...)` or `context.respondError(...)`
 to finish the request.

 ### `respondSuccess(...)` params
 
 `output` The data that the client will receive as response (optional).
 
 `onClientSuccessfullyReceives:(clientId) => void`
 Callback that is triggered when the client receives the `output` (optional).
 
 `onClientFailsToReceive:(clientId) => void`
 Callback that is triggered when the client did\'nt receive the `output` (optional).
 
 #### Example 
 
    create(context: CreateRouteContext): void { 
        let product = context.body as Product;
        product = await productsRepository.save(product);
        context.respondSuccess({
            output: product,
            onClientSuccessfullyReceives: () => console.log("_CreateProduct: Client "+context.ownClientId+" received the response"),
            onClientFailsToReceive: () => console.log("_CreateProduct: Client "+context.ownClientId+" didn\'t receive the response"),
        });
    }
 
 
 ### `respondError(...)` params
   
 `code:RespondErrorCode|string` Set a code for the error (optional).
 
 `description?:string` Additional text describing the error (optional). 
 
 `stack?`  Send errors to the client,
 making it easier to test in a development environment (optional).
 Server will only use this field if 
 [sendInternalErrorsToClient](#init---configuring-the-server) is `true`.

 #### Example

    delete(context: DeleteRouteContext): void {
       if(context.ownClientId==null) {
           context.respondError({
               code: RespondErrorCode.PERMISSION_DENIED,
               description: 'Only logged users can delete',
           });
           return;
       }
       //...
    }

 ---
 
 
 ## `CreateRoute`
 
 Implement a behavior to `CREATE` data.

 Type:

    (context) => void

 Fields of `context`:

  - body
  
  - query
  
  - ownClientId
  
  - headers
  
  - respondSuccess([params](#respondsuccess-params))
  
  - respondError([params](#responderror-params))

---

 ## `ReadRoute`
 
 Allows the client:
  - **read**, can be implemented with the `read` method
  
  - **listen**, can be implemented with the methods: 
     - `read`
     - `notifyClients`
     - `realtimeOutputHandler`
     - `onClientStartsListening`
     - `onClientStopsListening`
    
      
      
 ## `read`
 Implement a behaviour to `READ` data.

 Server can use `read` when:

 - Client do a `read`
 - Client starts a `listen`, so, `read` will send the first `output`
 - When the server calls [notifyClients with output == "RUN_READ_ONCE"](#notifyclients)

 Type:

    (context) => void

 Fields of `context`:
 
  - query
  
  - ownClientId
  
  - headers
  
  - respondSuccess([params](#respondsuccess-params))
  
  - respondError([params](#responderror-params))

 ## `notifyClients(...)` 
 
 Call this method whenever you want to notify the clients (who listen this `route`)
 that `output` has changed, the way you can do this is by sending a new `output` in realtime.
 
 ### `notifyClients` params - instance of `NotifyClientsParams`
 
 It's an object that can have the following fields:
 
 If `notifyClientsParams == null`: `output` will automatically be `"RUN_READ_ONCE"`.
   
 #### `output`
 
 Data that the clients will receive or the flag `RUN_READ_ONCE` (boolean).
 
 By default, `output = RUN_READ_ONCE`, so
 `read` will be run for each client when `notifyClients`
 is called, in this way, the output of `read` will be sent.
 Assuming that `read` do a query in a database, this can be a costly operation,
 because for each client that are `listen`
 `read` will run, in other words, it can be executed a lot of operations in
 the database 
 (equal to the number of clients who are listening `route`).
 
 If `output== null`: Client will receive the value `null` on `output`.
 
 It's recommend to set `output` when it DOESN'T CHANGE 
 depending on `ownClientId`.
 
 ##### Example:
 
 Consider a `read` route called `getCoupon` as being responsible
 for reading and sending realtime messages to clients that
 a new coupon is available and can be used for shopping. 
 
 ##### Option 1: `output` receives the coupon value
 
 Best option in case where `getCoupon` is responsible to send a generic message
 to **all** clients

    notifyClients({
        output: {
            "message": "New coupon CLOTHES20 available for all customers!",
            "coupon": "CLOTHES20"
        }
    });
     
 ##### Option 2: `output: "RUN_READ_ONCE"`:
 
 Best option in case where **each** client will receive a **different** message and coupon:
 
    notifyClients({output:"RUN_READ_ONCE"})
      
 or just:
 
    notifyClients()
 
 The output of `read` will be the `output` that will be sent to each client.
 
 #### `onClientSuccessfullyReceives`
 Callback that is triggered when the client receives `output` (optional).
 
 #### `onClientFailsToReceive`
 Callback that is triggered when the client didn't receive `output` (optional).
 
 #### `sendToSpecificClientsIds` 
 Optional.
 
 If `!= null`: Only specific `clientId` will receive `output`.
  
 If `null`: all clients who are listening will receive `output` (default) *.
 
 \* Another way of defining who will receive `output` is by implementing
 [realtimeOutputHandler](#realtimeoutputhandler).
 Use `sendToSpecificClientsIds` only when is possible to know previously which
 clients will receive the `output`.
 
 ## `realtimeOutputHandler(...)`

 After [notifyClients](#notifyclients) is called,
 `realtimeOutputHandler` can customize and filter the final `output`.
 
 Acts as a final middleware of `output` to EACH* `client` 
 that are listening the `route`, making possible:
 
  * filter which clients will receive the `output` by setting the flag `notifyThisClient`
 
  * customize the final `output` by setting the field `customOutput`
 
  * Add the callbacks [onClientSuccessfullyReceives](#onclientsuccessfullyreceives) e
  [onClientFailsToReceive](#onclientfailstoreceive)
 
 \* Only specific clients when 
 [sendToSpecificClientsIds](#sendtospecificclientsids)
 is set. Otherwise, all clients that are listening the `route` will be notified.
 
 ### `realtimeOutputHandler` params - instance of `RealtimeOutputHandlerContext`
 
 realtimeOutputHandler is called for each client that 
 are listening the `route`,
 so each time that `realtimeOutputHandler` is called it could have
 different values for the params:
 
 - `ownClientId` Client ID set when the client side called the method `connect`.
  
 - `headers` Headers set when the method `connect` was called in the client side.
 
 - `query` object set by the client for this request.
  
 - `output` The data that the client would receive.
 

 ### Can return an object that include:
 
  - `customOutput` The customized `output` that the client will receive (optional). 
 Default: client will receive the original `output`.
 
  - `notifyThisClient` Optional. If true: `ownClientId` will receive `output`/`customOutput` (default).
  If false: the client will not be notified.
 
  - `onClientSuccessfullyReceives` Callback that is triggered when 
  the client receives the `output`/`customOutput` (optional).
 
  - `onClientFailsToReceive` Callback that is triggered when
  the client did\'nt receive the `output`/`customOutput` (optional).

  ### Example
  
    realtimeOutputHandler: (context: RealtimeOutputHandlerContext) => {
        const chatMessage = context.output['chatMessage'];
        chatMessage['timestamp'] = Date.now(); //<- customOutput
    
        return {
            notifyThisClient:
                chatMessage['senderId'] == context.ownClientId || 
                chatMessage['receiverId'] == context.ownClientId,
            customOutput: chatMessage,
            onClientSuccessfullyReceives: (clientId) => console.log(" Client "+clientId+" received the message"),
            onClientFailsToReceive:  (clientId) => console.error("Client "+clientId+"  didn\'t receive the message"),
        };
    },
 ## `onClientStartsListening:VoidFunction`

 Callback that is triggered when a client starts listening to `route`.
 
 Example: 
 
    onClientStartsListening: async (context) => {
        console.log(context.ownClientId + ' started listening to '+context.route);
    },
 ## onClientStopsListening:VoidFunction

  Callback that is triggered when a client stops listening to `route`.

  Example

    onClientStopsListening: async (context) => {
        console.log(context.ownClientId + ' stopped listening to '+context.route);
    },

---
 ## `UpdateRoute`
 Implement a behaviour to `UPDATE` data.
 
 Tipo:

    (context) => void

 Fields of `context`:

  - body
  
  - query
  
  - ownClientId
  
  - headers
  
  - respondSuccess([params](#respondsuccess-params))
  
  - respondError([params](#responderror-params))
     
---
 ## `DeleteRoute`
 Implement a behaviour to `DELETE` data.
 
 Tipo:
 
    (context) => void
 
 Fields of `context`:

  - query
  
  - ownClientId
  
  - headers
  
  - respondSuccess([params](#respondsuccess-params))
  
  - respondError([params](#responderror-params))

## Using routes from a Server instance

### `getRoute(route, requestType)`

Gets a route.

#### Params

##### route 
The name of the route.

#### requestType
The type of operation that the route 
handles: `CREATE`, `READ`, `UPDATE` or `DELETE`.

### `getReadRoute(route)`

Gets a `READ` route.

#### Params

##### route 
The name of the `READ` route.

### `notifyClients(readRoute, notify)`

Call this method whenever you want to notify the clients (who listen this `route`)
that `output` has changed, the way you can do this is by sending a new `output` in realtime.

#### Params

##### route

The name of the `READ` route.

##### notify

[The params to notifyClients](#notifyclients-params---instance-of-notifyclientsparams).
