# Askless: **A coherent Node.js Backend for Flutter**

A framework to build websocket servers for Flutter Apps that lets you update your widgets in realtime by streaming data changes with WebSockets. Create your Flutter App without Firebase, with PostgreSQL, MySQL, or any database you want, and handle WebSocket authentication

This is the server side in Node.js,
**[click here to access the Askless Flutter Client](https://github.com/RodrigoBertotti/askless-flutter-client)**

## Built with Askless

Check the example of a [Flutter Chat App with Node.js, WebSockets and MySQL](https://github.com/RodrigoBertotti/flutter_chat_app_with_nodejs).

https://github.com/RodrigoBertotti/flutter_chat_app_with_nodejs/assets/15431956/42428123-76ab-4c5c-8ba1-29321d11b74b

<sup> 🔊 The video above contains audio, click on the right side to turn it on</sup>

## Important links
*  [Askless Backend in Node.js](https://github.com/RodrigoBertotti/askless) the backend side of this Flutter client
*  [Documentation](documentation.md)
*  [Askless Flutter Client](https://github.com/RodrigoBertotti/askless-flutter-client)

#### Examples
* <sup>Level:</sup> <sup>:red_circle: :white_circle: :white_circle: :white_circle: :white_circle:</sup> [Flutter Random Numbers Example](example/random-numbers-ts): Random numbers are generated on the server.
* <sup>Level:</sup> <sup>:red_circle: :red_circle: :white_circle: :white_circle: :white_circle:</sup> [Flutter Simple Chat Example](example/simple-chat-ts): Simple chat between the colors blue and green.    
* <sup>Level:</sup> <sup>:red_circle: :red_circle: :red_circle: :white_circle: :white_circle:</sup> [Flutter Catalog Example](https://github.com/RodrigoBertotti/askless-flutter-client/tree/dev/example/catalog): Users adding and removing products from a catalog.
* <sup>Level:</sup> <sup>:red_circle: :red_circle: :red_circle: :red_circle: :red_circle:</sup> [Flutter Chat App with MySQL or PostgreSQL ](https://github.com/RodrigoBertotti/flutter_chat_app_with_nodejs): A Flutter Chat App with MySQL, WebSockets, and Node.js

## Getting Started

1 - Install Askless

    npm install --save askless 

2 - Import the package

    import { AsklessServer } from "askless";

3 - Create and init the server

    const server = new AsklessServer();

    server.init({
        wsOptions: { port : 3000 }
    });

4 - Check the **[documentation](documentation.md)** and create your server first App with Askless, you can also check the **[examples](#important-links)**.

5 - Start the server

    server.start();

6 - Discover your server url on your local network:
    
    console.log(server.localUrl) 
    
Run the server, it will print something like: `ws://192.168.?.?:3000`

## License

[MIT](LICENSE)
