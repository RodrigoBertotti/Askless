# Askless - server

:checkered_flag: [Português (Portuguese)](README_PORTUGUES.md)

Framework that facilitates building servers for JavaScript and Flutter Apps
allowing to:

- :handshake: perform a websocket connection to exchange data that: 
 
    - :vibration_mode: supports streams on the client side in Flutter

    - :computer: supports JavaScript clients: Web and Node.js

    - :arrow_right_hook: automatically retry sending data in case of connectivity issues between the client and server

- :pencil2: create your own CRUD operations with the database you like (**C**reate, **R**ead, **U**pdate and **D**elete)

- :no_entry: restrict client access to CRUD operations

- :mega: notify in real time clients who are listening for changes in a route, you can choose:

    - :no_pedestrians: only specify clients will receive the data
        
    - :heavy_check_mark: all clients will receive the data
    
- :lock: accept and deny connection attempts

This is the server side in Node.js, check also the
[Flutter client](https://github.com/WiseTap/askless-flutter-client) 
or if you prefer the [JavaScript client](https://github.com/WiseTap/askless-javascript-client).


## Important links
*  [Server documentation](documentation/english_documentation.md)
*  [Getting Started (Flutter client)](https://github.com/WiseTap/askless-flutter-client/blob/master/README.md)
*  [Getting Started (JavaScript client)](https://github.com/WiseTap/askless-javascript-client/blob/master/README.md)
*  [chat (example)](example/chat-js): Chat between the colors blue and green.
*  [catalog (example)](example/catalog-ts)

## Getting Started

1 - Install

    npm install --save askless 

2 - Import the package

    const askless = require("askless");

3 - Create and init the server

    const server = new askless.AsklessServer();
    
    server.init({
        projectName: 'tracking',
        wsOptions : {
            port : 3000
        }
    });

4 - Set the `routes` where the client will
 listen realtime data. 
 The example data that the client will listen is `trackingStatus`.
   
    let trackingStatus  = '';
  
    server.addReadRoute({
        route: 'product/tracking',
        read: async (context) => {
            context.respondSuccess({
                output: trackingStatus
            });
        },
    });
   
5 - Set the `routes` where the client will
 create, remove and update data.
 Call `server.notifyClients(...)` when the data changes. 

    let customerSaidCounter = 0;
    server.addCreateRoute({
        route: 'product/customerSaid',
        create: (async (context) =>  {
        
            customerSaidCounter++;
            trackingStatus = 'Customer said: "'+context.body + '" '+ (customerSaidCounter) + " times";

            server.notifyClients('product/tracking', {
                output: trackingStatus
            });

            context.respondSuccess();
        }),
    });

6 - Start the server
    
    server.start();

7 - Simulating changes of `trackingStatus` in the server

    let kmRemaining = 101;
    const kmRemainingTask = setInterval(() => {
        if(kmRemaining == 0){
            return clearInterval(kmRemainingTask);
        }

        kmRemaining--;
        trackingStatus = 'Product is '+kmRemaining+' km from you';
        
        server.notifyClients('product/tracking', {
            output: trackingStatus
        });
    }, 3 * 1000);

8 - Check what's your IPV4 address in the machine that your server is running. 
It will be something like:

    192.168.X.X

9 - Configure the [client side in Flutter.](https://github.com/WiseTap/askless-flutter-client) 

## Issues

Feel free to open a issue about:

- :grey_question: questions

- :bulb: suggestions

- :page_facing_up: documentation improvements

- :ant: potential bugs

## License

[MIT](LICENSE)


