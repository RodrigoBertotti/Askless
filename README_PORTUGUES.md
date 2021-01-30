# Askless - servidor

:checkered_flag: [English (Inglês)](README.md)

Framework que facilita criar servidores para aplicativos em Flutter e JavaScript possibilitando:

- :handshake: realizar uma conexão websocket para troca de dados que: 
 
    - :vibration_mode: suporta integração com streams no cliente em Flutter
   
    - :computer: suporta clientes JavaScript: Web e Node.js
  
    - :arrow_right_hook: realiza o reenvio de dados em caso de instabilidade
    da conexão do cliente

- :pencil2: criar as próprias operações CRUD com o banco de dados que preferir (**C**reate, **R**ead, **U**pdate e **D**elete)

- :no_entry: restringir acesso do cliente com as operações CRUD

- :mega: notificar em tempo real clientes que estão ouvindo por mudanças de uma rota, podendo ser:
    
    - :no_pedestrians: apenas clientes específicos irão receber os dados
    
    - :heavy_check_mark: todos os clientes irão receber os dados

- :lock: aceitar e recusar tentativas de conexão

Este é lado servidor em Node.js, confira também o [cliente em Flutter](https://github.com/WiseTap/askless-flutter-client) 
ou se preferir o [cliente JavaScript](https://github.com/WiseTap/askless-javascript-client).

## Material para referência
*  [Documentação do servidor](documentation/portugues_documentacao.md)
*  [Começando (cliente em Flutter)](https://github.com/WiseTap/askless-flutter-client/blob/master/README_PORTUGUES.md)
*  [Começando (cliente JavaScript)](https://github.com/WiseTap/askless-javascript-client/blob/master/README_PORTUGUES.md)
*  [chat (exemplo)](example/chat-js): Troca de mensagens instantâneas entre as cores azul e verde.
*  [catalog (exemplo)](example/catalog-ts): Usuários alterando e removendo produtos de um catálogo.

## Começando

1 - Realize a instalação

    npm install --save askless

2 - Importe

    const askless = require("askless");

3 - Crie e inicialize o servidor

    const server = new askless.AsklessServer();
    
    server.init({
        projectName: 'tracking',
        wsOptions : {
            port : 3000
        }
    });

4 - Defina os `routes` onde o cliente irá receber dados em tempo real.
 O dado exemplo que o cliente irá observar se chama `trackingStatus`.
   
    let trackingStatus  = '';
  
    server.addReadRoute({
        route: 'product/tracking',
        read: async (context) => {
            context.respondSuccess({
                output: trackingStatus
            });
        },
    });
   
5 - Defina os `routes` onde o cliente irá criar, remover ou alterar dados. Chame `server.notifyClients(...)` quando o dado sofrer alteração. 

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

6 - Inicie o servidor
    
    server.start();

7 - Simule uma atualização do dado `trackingStatus` no servidor

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

8 - Verifique qual é o endereço IPV4 que o servidor está rodando. Algo como:

    192.168.X.X

9 - Configure o [lado cliente em Flutter.](https://github.com/WiseTap/askless-flutter-client/blob/master/README_PORTUGUES.md) 

## Issues

Sinta-se livre para abrir uma issue sobre:

- :grey_question: dúvidas

- :bulb: sugestões

- :page_facing_up: melhorias na documentação

- :ant: potenciais bugs


As issues devem ser escritas de preferência em inglês, 
assim, todos poderão entender :grin:

## Licença

[MIT](LICENSE)
