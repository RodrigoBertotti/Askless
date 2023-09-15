# Askless: **A coherent Node.js Backend for Flutter**

A framework to build websocket servers for Flutter Apps that lets you update your widgets in realtime by streaming data changes with WebSockets. Create your Flutter App without Firebase, with PostgreSQL, MySQL, or any database you want, handle WebSocket authentication, and quickly add audio and video calls with WebRTC!

This is the server side in Node.js,
**[click here to access the Askless Flutter Client](https://github.com/RodrigoBertotti/askless-flutter-client)**

## Built with Askless

https://github.com/RodrigoBertotti/Askless/assets/15431956/ea701f18-f1a5-422d-be5f-51042894f073

## Important links
*  [Askless Backend in Node.js](https://github.com/RodrigoBertotti/askless) the backend side of this Flutter client
*  [Documentation](documentation.md)
*  [Askless Flutter Client](https://github.com/RodrigoBertotti/askless-flutter-client)

#### Examples
* <sup>Level: :red_circle: :white_circle: :white_circle: :white_circle: :white_circle: </sup> [Flutter Random Numbers Example](example/chat): Random numbers are generated on the server.
* <sup>Level: :red_circle: :red_circle: :white_circle: :white_circle: :white_circle: </sup> [Flutter Simple Chat Example](example/chat): Simple chat between the colors blue and green.    
* <sup>Level: :red_circle: :red_circle: :red_circle: :white_circle: :white_circle: </sup> [Flutter Catalog Example](example/catalog): Users adding and removing products from a catalog.
* <sup>Level: :red_circle: :red_circle: :red_circle: :red_circle: :red_circle: </sup> [Flutter Chat App with MySQL or PostgreSQL + video and audio calls](https://github.com/RodrigoBertotti/flutter_chat_app_with_nodejs): A Flutter Chat App with MySQL, WebSockets, and Node.js, supports live video and audio calls streaming with WebRTC in Flutter

[//]: # (TODO ABAIXO)
*  [**Advanced Chat Example**](example/simple-chat-ts): A beaultiful Chat App with receiving & typing events + local storage + register & login. 

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

## Issues

Feel free to open an issue about:

- :grey_question: questions

- :bulb: suggestions

- :page_facing_up: documentation improvements

- :ant: potential bugs

## License

[MIT](LICENSE)

## Contacting me

📧 rodrigo@wisetap.com
