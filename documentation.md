  # Documentation

  Documentation of the server side in Node.js.

  [Click here](README.md#important-links)
  to check examples and introduction to Askless or [here](https://github.com/RodrigoBertotti/askless-flutter-client) to access
  the Flutter Client.
    
  # Index
  - **[Starting Askless in the backend](#starting-askless-in-the-backend)**
    - [init(___...___) &#8594; _void_](#init---void)
    - [start() &#8594; _void_](#start---void)
  - [clearAuthentication(userId) &#8594; _void_](#clearauthenticationuserid--void)
  - **[Routes](#routes)**
    - [Introduction](#routes)
    - [read(..) &#8594; _ReadRouteInstance_](#read--readrouteinstance)
    - [create(..) &#8594;  _void_](#create---void)
    - [update(..) &#8594;  _void_](#update---void)
    - [delete(..) &#8594;  _void_](#delete---void)
  
  # Starting Askless in the backend

  ## init(___...___) &#8594; ___void___
  
  Initialize the server.

  Example:
  
    import { AsklessServer } from "askless";

    const isProduction = false;

    const server = new AsklessServer<number>(); // number is the type of the User ID
    // which in this example is numeric, because we are using MySQL

    server.init({
        wsOptions: { port: 3000, },
        debugLogs: !isProduction,
        sendInternalErrorsToClient: !isProduction,
        requestTimeoutInMs: 7 * 1000,
        // Add your authentication logic here
        authenticate: async (credential, accept, reject) => {
            if (credential && credential["accessToken"]) {
                const result = verifyJwtAccessToken(credential["accessToken"]);
                if (!result.valid) {
                    // To reject the connection attempt
                    reject({credentialErrorCode: "EXPIRED_ACCESS_TOKEN"});
                    return;
                }
                // To accept the connection attempt as an authenticated user
                accept.asAuthenticatedUser({ userId: result.userId,  });
            } else {
                // To accept the connection attempt as an unauthenticated user
                accept.asUnauthenticatedUser();
            }
        },
    });

 Use any authentication method you prefer, 
 for this example `verifyJwtAccessToken(..)` would be something like:

    import * as jwt from "jsonwebtoken"; // npm install --save jsonwebtoken

    export function verifyJwtAccessToken(jwtAccessToken:string) : { userId?:number, valid:boolean } {
        try {
            const res = jwt.verify(jwtAccessToken, privateKey);
            return { 
                valid: true, 
                userId: res.userId,
                // optionally set the user claims and locals here,
                // this can be useful inside the routes
                claims: [], 
                locals: {},
            };
        } catch (e) {
            return { valid: false };
        }
    }

  ### 🔹 authenticate: (credential, accept, reject) &#8594; Promise\<void\>

  Handles the client-side authentication request attempt (optional). <br>
  You can choose to either:
  - accept as an authenticated user:
    - `accept.asAuthenticatedUser(userId: 1, claims: [], locals: {})`
    - or `accept.asAuthenticatedUser(userId: 1)`
  - accept as an unauthenticated user:
    - `accept.asUnauthenticatedUser()`
  - or reject the authentication attempt:
    - `reject()` 
    - or `reject({credentialErrorCode: "MY_ERROR_CODE"})`

  `credential` is the value the client informed in the client side
  in the connection attempt.

  ### 🔹 sendInternalErrorsToClient?:boolean

  If `true`: server internal errors can be sent to the client (optional).
  Keep as `false` when the server is running in production. Default: `false`.

  ### 🔹 requestTimeoutInMs?:number
  Time in milliseconds that client can wait for a response after requesting it to the server (optional).
  If `<= 0`: Timeout error never will occur. Default: 7000 (7 seconds).

  ### 🔹 waitForAuthenticationTimeoutInMs?:number
  If the logged user is not authenticated in the Flutter App, this is the timeout in milliseconds
  to wait for the authentication when performing a request to a route that requires authentication.

  This delay is useful in cases where the user is performing a request while the access token is being refreshed at the same time.
  
  No-op:
  - no-op when performing a request when the user is already authenticated
  - no-op when performing a request for a route that doesn't require authentication.
  - no-op when `neverTimeout` is set to true in the request attempt

  ### 🔹 wsOptions

  [Official documentation](https://github.com/websockets/ws/blob/cd89e077f68ba9a999d408cb4fdb3e91289096a7/doc/ws.md#class-websocketserver) 
  <br>The websocket configuration for [ws](https://github.com/websockets/ws) (optional).
  Default: `{ port: 3000 }`.

  ### 🔹 debugLogs?:boolean
  Show Askless internal logs for debugging (optional).
  Keep as `false` when Askless is running in production.
  Default: `false`.

 ## start() &#8594; _void_

 Starts the server. This method must be called after the server has been fully configured with [init(...)](#init--void).

    server.start();

  # clearAuthentication(userId) &#8594; _void_
  Makes a user as not authenticated anymore.

# Routes

All routes are available as:
- server.addRoute.**forAuthenticatedUsers...**: If you want to create routes to
  allow only authenticated users to perform operations
  - `server.addRoute.forAuthenticatedUsers.read(..)`
  - `server.addRoute.forAuthenticatedUsers.create(..)`
  - `server.addRoute.forAuthenticatedUsers.update(..)`
  - `server.addRoute.forAuthenticatedUsers.delete(..)`

and
  
- server.addRoute.**forAllUsers**...: If you want to create routes to allow non-authenticated users
  and authenticated users to perform operations.
    - `server.addRoute.forAllUsers.read(..)`
    - `server.addRoute.forAllUsers.create(..)`
    - `server.addRoute.forAllUsers.update(..)`
    - `server.addRoute.forAllUsers.delete(..)`
  
:warning: **Is not recommended to send the output directly with the** `context.successCallback(..)` **parameter**

Every route contains a `context.successCallback(entity);` and `context.errorCallback(..)` callback. 
Is not recommended to send the output (data the client will actually receive) 
directly with `context.successCallback(..)`, instead, send the entity on `context.successCallback(<entity here>)` parameter, 
and convert the entity to output in the `toOutput(..)` function.

:x: **Not** recommended:

    server.addRoute.forAllUsers.read({
        route: "date",
        handleRead: async context => {
            context.successCallback({ "dateTimestamp": date.getTime(), "fullName": `${firstName} ${lastName}`, });
        },
    });

:heavy_check_mark: **Recommended**: 

    server.addRoute.forAllUsers.read({
        route: "date",
        handleRead: async context => { 
            // e.g.: user is an entity in your server, it's in a DIFFERENT structure than what your App should receive
            // { date: date, firstName: firstName, lastName: lastName }
            context.successCallback(user); 
        },
        toOutput: (entity) => {
            // Here we are converting user to the structure your App SHOULD receive
            return { "dateTimestamp": entity.date.getTime(), "fullName": `${firstName} ${lastName}` };
        },
    });

Great! Now, Askless is able to use `toOutput(..)` alone when needed, in this way, you
have the flexibility to use `handleReadOverride(..)` and Askless still sends
the output to the client, so you don't need to add extra code to convert the entity to output.
It also gives you the possibility of accessing the entity on `onReceived(entity, context)` callback.
You will get more details about these functions in the following sections.

## read(..) &#8594; _[ReadRouteInstance](#ReadRouteInstance)_

Adds a route to read and stream (listen) data.

Generic type parameter for TypeScript: `read<ENTITY, LOCALS>(..)`

Adding the route:

    const readAllProductsRouteInstance = server.addRoute.forAllUsers.read<ProductEntity>({ // choose between "forAllUsers" and "forAuthenticatedUsers"
        route: "product/all",
        handleRead: async context => {
            const entityList = productsRepository.readList(context.params != null ? context.params['search'] : null);
            context.successCallback(entityList);
        },
        // convert the entity to the data the client will receive with toOutput(..)
        toOutput: (entityList) => ProductModel.fromEntityList(entityList).output(),
        onReceived: (entity, context) => { console.log("client received output successfully "); },
        onClientStartsListening: (context)  => { console.log("client started listening to [READ] \"product/all\""); },
        onClientStopsListening:  (context)  => { console.log("client stopped listening to [READ] \"product/all\""); }
    });

### :small_orange_diamond: route: string
The route name.

### :small_orange_diamond: toOutput(entity): any

Convert the entity to the output the client will receive.

This function will also be called automatically by Askless every time you trigger `notifyChanges(..)`.

### :small_orange_diamond: onReceived (entity, [context](#small_orange_diamond-context-fields-for-read--listen)): void
A listener that is triggered every time the client receives `output` (optional).

This function will also be called automatically by Askless every time you trigger `notifyChanges(..)`.

### :small_orange_diamond: onClientStartsListening([context](#small_orange_diamond-context-fields-for-read--listen)) : void
A callback that is triggered when a client starts listening to this route.

### :small_orange_diamond: onClientStopsListening([context](#small_orange_diamond-context-fields-for-read--listen)) : void
A callback that is triggered when a client stops listening to this route.

### :small_orange_diamond: handleRead([context](#small_orange_diamond-context-fields-for-read--listen)): void

Implement the handler to read and stream (listen) data.

This function will also be called automatically by Askless every time you trigger `notifyChanges(..)`.

You should either `context.successCallback(...)` or `context.errorCallback(...)`
to finish the request.

### :small_orange_diamond: context fields for read / listen

#### :small_orange_diamond: :small_blue_diamond: params &#8594; object;
Additional data, it's useful in case you want to filter data.

#### :small_orange_diamond: :small_blue_diamond: locals &#8594; LOCALS,
An object where you can add custom data that is valid only for the context of the current request.

#### :small_orange_diamond: :small_blue_diamond: userId &#8594; string | number | undefined
The user ID is performing the request. **Only in case the user is authenticated, otherwise is `undefined`.**

#### :small_orange_diamond: :small_blue_diamond: claims &#8594; string[] | undefined
The claims the user is performing the request has. **Only in case the user is authenticated, otherwise is `undefined`.**

Example: `["admin"]`

#### :small_orange_diamond: :small_blue_diamond: successCallback: (entity) &#8594; void;
Call `successCallback(entity)` when the request is handled successfully.

[Do not pass the output as parameter, use the entity of your server instead.](#Routes)

##### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: entity
The response data BEFORE converting it to the output.

#### :small_orange_diamond: :small_blue_diamond: errorCallback: (errorParams?:AsklessErrorParams) &#8594; void;
Call `errorCallback(..)` to reject the request by sending an error.

    context.errorCallback({
        code: "PERMISSION_DENIED",
        description: "Only authenticated users can read/listen to this route"
    });

##### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: _errorParams_
Error details object

###### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: :small_blue_diamond: code: string
Code of the error and also  set a custom error code.

###### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: :small_blue_diamond: description: string
Description of the error.

### ReadRouteInstance

Read instance.

#### :small_blue_diamond: notifyChanges(___...___) &#8594; ___void___
Call `notifyChanges` whenever you want to notify the clients
the `output` have changed.

#### :small_blue_diamond: stopListening (___userId___) &#8594; ___void___
Call `stopListening` when you want to make a user stop listening to a route

### Letting the App know the route has changed (for stream):

#### Option 1: Making all users read again

If no parameters are added, your `handleRead(..)` implementation will be triggered
for every user in the App:

    readAllProductsRouteInstance.notifyChanges();

#### Option 2: Filtering who will receive changes by checking the context

If `where(..)` parameter is defined, `handleRead(..)` implementation will be triggered
for only the user(s) in the App that fulfills the condition, e.g.:

    readAllProductsRouteInstance.notifyChanges({
        where: (context) => {
            return context.userId == 1; // only user 1 will receive the latest changes from `handleRead(..)` 
        },
    });

#### Option 3: Overriding `handleRead(..)` implementation

If `handleReadOverride(context)` parameter is defined,
`handleReadOverride(context)` will take the place of `handleRead(context)`,
his is useful when you want to avoid making too many operations in the database.

:warning: **If params are specified, remember to handle those again**

    this.readAllProductsRouteInstance.notifyChanges({
        handleReadOverride: context => {
            if (context.params && context.params['search']) {
                const search = context.params['search'].toString().trim().toLowerCase();
                const matchedProductsEntiesCache = allProductsEntiesCache
                    .filter((product => product.name.trim().toLowerCase().includes(search) || product.price.toString().trim().toLowerCase().includes(search)));
                context.successCallback(matchedProductsEntiesCache);
            } else {
                context.successCallback(allProductsEntiesCache);
            }
        },
        where: (context) => {
            return context.userId == 1;
        },
    })

Please notice that we are still using entities rather than outputs as parameters of  `successCallback(entity)`.

_<sub>In a real scenario it would be better to have a function that holds the logic
of handling `context.params` for both `handleRead` and `handleReadOverride`.</sub>_

## create(..) &#8594;  _void_

Adds a new route to create data.

Generic type parameter for TypeScript: `create<ENTITY, LOCALS>(..)`

Adding the route:

    server.addRoute.forAuthenticatedUsers.create({ // choose between "forAllUsers" and "forAuthenticatedUsers"
        route: "product",
        handleCreate: async context => {
            try {
                if(context.userId == undefined){
                    context.errorCallback({ code: AsklessErrorCode.PERMISSION_DENIED,  description: 'Only logged users can create', });
                    return;
                }
                // converting the input from the App to an entity
                // if there's a date in milliseconds, here we convert it to Date
                let productEntity = {
                    name: context.body["name"],
                    id: context.body["id"],
                    price: context.body["price"],
                    expiresAt: new Date(context.body["expiresAtTimestamp"])
                };

                // saving the entity in the database
                productEntity = await productsRepository.save(productEntity);

                // in case of success, calling successCallback(..) by passing the entity as parameter
                context.successCallback(productEntity);
            } catch (e) {
                console.error("An unknown error occurred", e.toString());
                context.errorCallback({ description: "An unknown error occurred", code: AsklessErrorCode.INTERNAL_ERROR });
            }
        },
        // converting the entity to the data the client will receive with toOutput(..)
        toOutput: (productEntity) => {
            return {
                "id": productEntity.id,
                "name": productEntity.name,
                "price": productEntity.price,
                "expiresAtTimestamp": productEntity.expiresAt.getTime()
            }
        },

        // once the App receives the data, onReceived() callback will be called
        onReceived: (entity, context) => { console.log("client received output successfully "); }
    })

### :small_orange_diamond: route: string
The route name.

### :small_orange_diamond: toOutput(entity): any

Convert the entity to the output the client will receive.

### :small_orange_diamond: onReceived (entity, context): void
A listener that is triggered every time the client receives `output` (optional).

### :small_orange_diamond: handleCreate([context](#small_orange_diamond-small_blue_diamond-context-fields-for-create)): void

Implement the handler to create data.

You should either `context.successCallback(...)` or `context.errorCallback(...)`
to finish the request.

### :small_orange_diamond: :small_blue_diamond: context fields for create

#### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: params &#8594; object;
Additional data.

#### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: body &#8594; object;
The data input that will be created.

#### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: locals &#8594; LOCALS,
An object where you can add custom data that is valid only for the context of the current request.

#### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: userId &#8594; string | number | undefined
The user ID is performing the request. **Only in case the user is authenticated, otherwise is `undefined`.**

#### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: claims &#8594; string[] | undefined
The claims the user is performing the request has. **Only in case the user is authenticated, otherwise is `undefined`.**

Example: `["admin"]`

#### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: successCallback: (entity) &#8594; void;
Call `successCallback(entity)` when the request is handled successfully.

[Do not pass the output as parameter, use the entity of your server instead.](#Routes)

##### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: entity
The response data BEFORE converting it to the output.

#### :small_orange_diamond: :small_blue_diamond: errorCallback: (errorParams?:AsklessErrorParams) &#8594; void;
Call `errorCallback(..)` to reject the request by sending an error.

    context.errorCallback({
        code: "PERMISSION_DENIED",
        description: "Only authenticated users can create on this route"
    });

##### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: _errorParams_
Error details object

###### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: :small_blue_diamond: code: string
Code of the error and also  set a custom error code.

###### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: :small_blue_diamond: description: string
Description of the error.

[//]: #-------------------------------------------------------------------------

## update(..) &#8594;  _void_

Adds a new route to update data.

Generic type parameter for TypeScript: `update<ENTITY, LOCALS>(..)`

Adding the route:

    server.addRoute.forAuthenticatedUsers.update({ // choose between "forAllUsers" and "forAuthenticatedUsers"
        route: "product",
        handleUpdate: async context => {
            try {
                if(context.userId == undefined){
                    context.errorCallback({ code: AsklessErrorCode.PERMISSION_DENIED,  description: 'Only logged users can update', });
                    return;
                }
                // converting the input from the App to an entity
                // if there's a date in milliseconds, here we convert it to Date
                let productPartialEntity:ProductEntity = {
                    name: context.body["name"] ?? undefined,
                    price: context.body["price"] ?? undefined,
                    expiresAt: context.body["expiresAtTimestamp"] != null
                        ? new Date(context.body["expiresAtTimestamp"])
                        : undefined
                };
    
                // Removing undefined entries
                Object.keys(productPartialEntity).forEach(key => productPartialEntity[key] === undefined ? delete productPartialEntity[key] : {});
    
                // saving the entity in the database
                const productEntity = await productsRepository.update(context.body["id"], productPartialEntity);
    
                // in case of success, calling successCallback(..) by passing the entity as parameter
                context.successCallback(productEntity);
            } catch (e) {
                console.error("An unknown error occurred", e.toString());
                context.errorCallback({ description: "An unknown error occurred", code: AsklessErrorCode.INTERNAL_ERROR });
            }
        },
        // converting the entity to the data the client will receive with toOutput(..)
        toOutput: (productEntity) => {
            return {
                "id": productEntity.id,
                "name": productEntity.name,
                "price": productEntity.price,
                "expiresAtTimestamp": productEntity.expiresAt.getTime()
            }
        },
    
        // once the App receives the data, onReceived(entity, context) callback will be called
        onReceived: (entity, context) => { console.log("client received output successfully "); }
    });


### :small_orange_diamond: route: string
The route name.

### :small_orange_diamond: toOutput(entity): any

Convert the entity to the output the client will receive.

### :small_orange_diamond: onReceived (entity, context): void
A listener that is triggered every time the client receives `output` (optional).

### :small_orange_diamond: handleUpdate([context](#small_orange_diamond-small_blue_diamond-context-fields-for-update)): void

Implement the handler to update data.

You should either `context.successCallback(...)` or `context.errorCallback(...)`
to finish the request.

### :small_orange_diamond: :small_blue_diamond: context fields for update

#### :small_orange_diamond: :small_blue_diamond: params &#8594; object;
Additional data.

#### :small_orange_diamond: :small_blue_diamond: body &#8594; object;
The data input that will be updated.

#### :small_orange_diamond: :small_blue_diamond: locals &#8594; LOCALS,
An object where you can add custom data that is valid only for the context of the current request.

#### :small_orange_diamond: :small_blue_diamond: successCallback: (entity) &#8594; void;
Call `successCallback(entity)` when the request is handled successfully.

[Do not pass the output as parameter, use the entity of your server instead.](#Routes)

##### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: entity
The response data BEFORE converting it to the output.

#### :small_orange_diamond: :small_blue_diamond: errorCallback: (errorParams?:AsklessErrorParams) &#8594; void;
Call `errorCallback(..)` to reject the request by sending an error.

    context.errorCallback({
        code: "PERMISSION_DENIED",
        description: "Only authenticated users can update on this route"
    });

##### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: _errorParams_
Error details object

###### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: :small_blue_diamond: code: string
Code of the error and also  set a custom error code.

###### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: :small_blue_diamond: description: string
Description of the error.

#### :small_orange_diamond: :small_blue_diamond: userId &#8594; string | number | undefined
The user ID is performing the request. **Only in case the user is authenticated, otherwise is `undefined`.**

#### :small_orange_diamond: :small_blue_diamond: claims &#8594; string[] | undefined
The claims the user is performing the request has. **Only in case the user is authenticated, otherwise is `undefined`.**

Example: `["admin"]`

[//]: #-------------------------------------------------------------------------

## delete(..) &#8594;  _void_

Adds a new route to delete data.

Generic type parameter for TypeScript: `delete<ENTITY, LOCALS>(..)`

Adding the route:

    server.addRoute.forAuthenticatedUsers.delete({ // choose between "forAllUsers" and "forAuthenticatedUsers"
        route: "product",
        handleDelete: async context => {
            try {
                if(context.userId == undefined){
                    context.errorCallback({ code: AsklessErrorCode.PERMISSION_DENIED,  description: 'Only logged users can update', });
                    return;
                }
                
                // deleting the entity in the database and getting the removed entity
                const productEntity = await productsRepository.delete(context.params["id"]);
    
                // in case of success, calling successCallback(..) by passing the removed entity as parameter
                context.successCallback(productEntity);
            } catch (e) {
                console.error("An unknown error occurred", e.toString());
                context.errorCallback({ description: "An unknown error occurred", code: AsklessErrorCode.INTERNAL_ERROR });
            }
        },
        // converting the entity to the data the client will receive with toOutput(..)
        toOutput: (productEntity) => {
            return {
                "id": productEntity.id,
                "name": productEntity.name,
                "price": productEntity.price,
                "expiresAtTimestamp": productEntity.expiresAt.getTime()
            }
        },
    
        // once the App receives the data, onReceived(entity, context) callback will be called
        onReceived: (entity, context) => { console.log("client received output successfully "); }
    });


### :small_orange_diamond: route: string
The route name.

### :small_orange_diamond: toOutput(entity): any

Convert the entity to the output the client will receive.

### :small_orange_diamond: onReceived (entity, context): void
A listener that is triggered every time the client receives `output` (optional).

### :small_orange_diamond: handleDelete([context](#small_orange_diamond-small_blue_diamond-context-fields-for-delete)): void

Implement the handler to delete data.

You should either `context.successCallback(...)` or `context.errorCallback(...)`
to finish the request.

### :small_orange_diamond: :small_blue_diamond: context fields for delete

#### :small_orange_diamond: :small_blue_diamond: params &#8594; object;
An object to indicate the data that will be deleted

#### :small_orange_diamond: :small_blue_diamond: locals &#8594; LOCALS,
An object where you can add custom data that is valid only for the context of the current request.

#### :small_orange_diamond: :small_blue_diamond: successCallback: (entity) &#8594; void;
Call `successCallback(entity)` when the request is handled successfully.

[Do not pass the output as parameter, use the entity of your server instead.](#Routes)

##### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: entity
The response data BEFORE converting it to the output.

#### :small_orange_diamond: :small_blue_diamond: errorCallback: (errorParams?:AsklessErrorParams) &#8594; void;
Call `errorCallback(..)` to reject the request by sending an error.

    context.errorCallback({
        code: "PERMISSION_DENIED",
        description: "Only authenticated users can delete on this route"
    });

##### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: _errorParams_
Error details object

###### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: :small_blue_diamond: code: string
Code of the error and also  set a custom error code.

###### :small_orange_diamond: :small_blue_diamond: :small_orange_diamond: :small_blue_diamond: description: string
Description of the error.

#### :small_orange_diamond: :small_blue_diamond: userId &#8594; string | number | undefined
The user ID is performing the request. **Only in case the user is authenticated, otherwise is `undefined`.**

#### :small_orange_diamond: :small_blue_diamond: claims &#8594; string[] | undefined
The claims the user is performing the request has. **Only in case the user is authenticated, otherwise is `undefined`.**

Example: `["admin"]`
