  # Documentação

  :checkered_flag: [English (Inglês)](english_documentation.md)

  Documentação do servidor em Node.js. 
  [Clique aqui](https://github.com/WiseTap/askless-flutter-client/blob/master/README_PORTUGUES.md) 
  para acessar o cliente em Flutter.

  ## Material para referência
  *  [Começando](README.md): Referente ao servidor em Node.js.
  *  [Começando (cliente em Flutter)](https://github.com/WiseTap/askless-flutter-client/blob/master/README_PORTUGUES.md): Referente ao cliente em Flutter.
  *  [Começando (cliente JavaScript)](https://github.com/WiseTap/askless-js-client/blob/master/README_PORTUGUES.md): Referente ao cliente em Flutter.
  *  [chat (exemplo)](example/chat-js): Troca de mensagens instantâneas entre as cores azul e verde.
  *  [catalog (exemplo)](example/catalog-ts): Usuários alterando e removendo produtos de um catálogo.

## `init(...)` - Configurando o servidor

  Inicie e configure o servidor.

  ### Parâmetros de `init` - instância de IServerConfiguration

  Exemplo:
    
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

  A configuração do servidor. 
  Consiste em um objeto que pode conter os seguintes campos:

  #### sendInternalErrorsToClient?:boolean

  Se `true`: erros internos no servidor poderão ser enviados para o cliente (opcional) . 
  Manter como `false` quando o servidor estiver rodando em
  um ambiente de produção. Padrão: `false`.

  #### `projectName?:string`

  Nome para esse projeto (opcional).
  Se `!= null`: o campo `projectName` no cliente deve conter o mesmo nome.

#### `requestTimeoutInSeconds?:number` 

Tempo limite em segundos para o cliente aguardar uma resposta após este fazer uma requisição para o servidor (opcional).
Se <= 0: Erro por timeout nunca irá acontecer. Padrão: 15 segundos.

#### `wsOptions` 

[Documentação oficial](https://github.com/websockets/ws/blob/0954abcebe027aa10eb4cb203fc717291e1b3dbd/doc/ws.md#new-websocketserveroptions-callback) - A configuração de servidor websocket para o package [ws](https://github.com/websockets/ws) (opcional). Padrão: porta 3000.

#### `logger`
 
Permite customizar a exibição/escrita de logs internos e habilitar e desabilitar o logger padrão (opcional). 

Consiste em um objeto que pode conter os campos:

   
 ##### `useDefaultLogger?:boolean` 
 
 Se `true`: o logger padrão será utilizado (opcional). Defina como `false` em um ambiente de produção. Padrão: `false`
 Exemplo:
 
     server.init({
         logger: {
             useDefaultLogger: true
         },
     });

  ##### `customLogger`
  
  Permite criar a própria implementação do logger (opcional). Deixe `null` em um ambiente de produção
        
    Tipo: `(message, level, additionalData?) => void`
        
  Exemplo:
         
    server.init({
        logger: {
                customLogger: (message, level, additionalData?: Object) => {
                    console.log(level+ ": "+message);
                    if(additionalData)
                        console.log(JSON.stringify(additionalData));
                }
        },
    });

<!-- askless-js-client & askless-flutter-client apontam para essa url # abaixo -->
#### `grantConnection` 
 
 Aceita ou recusa uma tentativa de conexão (opcional). 
 
 Verifique aqui se um token informado nos headers é valido. 
 
 Padrão: Todas as tentativas de conexão serão aceitas.

 Tipo: `(ownClientId?, headers?) => Promise<boolean>` 

 Exemplo:

    server.init({
        grantConnection: async (ownClientId:string|number, headers:Map<string, any>) => {
            return (await checkIfIsValidToken(headers['Authorization']));
        },
    });
    
[Outro exemplo](example/catalog-ts/auth/SimpleCheckBearerExample.ts)
    
## `start()` - Executando o servidor
O servidor pode ser iniciado com o método `start`:

    server.start();

`start` deve ser chamado por último, após o servidor ter sido totalmente configurado com [`init`](#init---configurando-o-servidor).

    
## `route` - Rotas
Server é organizado por `route` (rota). 
As operações de cada `route` que pode ser implementadas são:

* `CreateRoute` para criar dado
* `ReadRoute` para ler e observar (listen) dados
* `UpdateRoute` para atualizar dado
* `DeleteRoute` para apagar dado

Em TypeScript cada `route` pode ter um tipo customizado `ENTITY`. Nos exemplos à seguir, `ENTITY` será `Product`.

`route` pode ser criado de 2 maneiras diferentes:

### Opção 1: Pelo método `addCreateRoute`, `addReadRoute`, `addUpdateRoute` e `addDeleteRoute`:

Informando o comportamento de cada rota diretamente. Exemplo:

    const server = new AsklessServer();
    server.addCreateRoute({
        route: 'product',
        create: (async (context) => {
            let product = context.body as Product;
            product = await productsRepository.save(product);
            context.respondSuccess(product);
        }),
    });
    
[Outro exemplo](example/chat-js)

### Opção 2: Com o método `addRoute(routesList)` 
Possibilita adicionar uma instância de objeto que extends [CreateRoute](#createroute), [ReadRoute](#readroute), [UpdateRoute](#updateroute) ou [DeleteRoute](#deleteroute):

Arquivo `CreateProductRoute.ts`

    class CreateProductRoute extends CreateRoute {
        constructor() {super('product');}
        
        create(context: CreateRouteContext): void{
            let product = context.body as Product;
            product = await productsRepository.save(product);
            context.respondSuccess(product);
        }
    }


Arquivo `index.js`

    const server = new AsklessServer();
    const createProductRoute = new CreateProductRoute();
    server.addRoute(createProductRoute);

[Outro exemplo (projeto)](example/catalog-ts)


`addRoute(routesList)` permite que seja adicionado um array também:

    server.addRoute([
        createProductRoute,
        listAllProductsRoute,
        deleteProductRoute
    ]); 

 ## `respondSuccess` e `respondError`
 Cada `route` deve chamar `context.respondSuccess(...)` ou `context.respondError(...)`
 para finalizar a requisição.
 
 ### Parâmetros de `respondSuccess(...)`
 
 `output` O dado que o cliente irá receber como resposta (opcional).
 
 `onClientSuccessfullyReceives:(clientId) => void`
 Callback que é disparado quando o cliente recebe o `output` .
 
 `onClientFailsToReceive:(clientId) => void`
 Callback que é disparado quando o cliente falha em receber o `output` (opcional).
 
 ### Parâmetros de `respondError(...)`

 - `code:RespondErrorCode|string` Defina um código para o erro (opcional).
 
 - `description?:string` Descrição do erro (opcional). 
 
 - `stack?`  Enviar log de exceções lançadas para o cliente, 
 facilitando debug em modo de desenvolvimento (opcional).
 Server só usará esse campo
 caso [sendInternalErrorsToClient](#init---configurando-o-servidor) for `true`.

---

## `CreateRoute`
Implementar um comportamento para quando um dado for criado.

Tipo:

    (context) => void

Campos de `context`:

  - body
  
  - query
  
  - ownClientId
  
  - headers
  
  - respondSuccess([params](#parmetros-de-respondsuccess))
  
  - respondError([params](#parmetros-de-responderror))
     
---

## `ReadRoute`
Permite definir um comportamento para que o cliente possa:
 - ler, para isso, será usado o método `read`
 - observar, para isso, será usado os métodos: 
 
    - `read`
    - `notifyClients`
    - `realtimeOutputHandler`
    - `onClientStartsListening`
    - `onClientStopsListening`
   
     
## `read`
Define um comportamento
para quando um dado for lido.
Essa rota será usada de 3 maneiras:

- Quando o cliente realiza o `read`
- Quando o cliente inicia um `listen` (começa à **observar** a rota),
o `read` enviará para o cliente o primeiro `output`
- Quando o servidor chama [notifyClients com output == "RUN_READ_ONCE"](#notifyclients)

Tipo:

    (context) => void

Campos de `context`:

  - query
  
  - ownClientId
  
  - headers
  
  - respondSuccess([params](#parmetros-de-respondsuccess))
  
  - respondError([params](#parmetros-de-responderror))

## `notifyClients(...)` 

Chame esse método para notificar os clientes (que ouvem esse `route`) de que `ENTITY` sofreu mudanças,
através do envio de um novo `output` em tempo real.

### Parâmetros de `notifyClients` - instância de `NotifyClientsParams`

Consiste em um objeto que pode conter os seguintes campos:

Se `notifyClientsParams == null`: `output` receberá automaticamente o valor `"RUN_READ_ONCE"`.
  
#### `output`
O dado que os clientes irão receber ou a flag `RUN_READ_ONCE` (boolean).

Por padrão, `output = RUN_READ_ONCE`, ou seja,
será realizado a execução do método `read` para cada cliente quando `notifyClients`
for chamado, assim, o output de `read` será o dado a ser enviado em tempo real.
Supondo que `read` faça uma busca no banco de dados, essa pode ser uma operação custosa, visto que para CADA cliente que está `listen`
será executado `read`, ou seja, pode ser realizada muitas operações no
banco de dados 
(quantidade de operações igual ao número de clientes que estão observando `route`).

Se `output== null`: O cliente irá receber o valor `null` no `output`.

É recomendado informar o dado em `output` quando este NÃO VARIA dependendo do `ownClientId`.

##### Exemplo:

Considere uma rota `read` chamada `getCoupon` como sendo responsável por realizar a leitura e envio em tempo real de
mensagens para os clientes de que um novo cupom está disponível para ser utilizado em compras.

##### Opção 1: Enviando o dado no output
Melhor opção se `getCoupon` for responsável por enviar uma única mensagem genérica para todos,
logo, deve-se informar o `output`


     notifyClients({
         output: {
             "message": "Novo cupom CLOTHES20 disponível para todos",
             "coupon": "CLOTHES20"
         }
     });
     
##### Opção 2: `output: "RUN_READ_ONCE"`:

Melhor opção supondo que CADA cliente irá receber um cupom e mensagem DIFERENTE:

     notifyClients({output:"RUN_READ_ONCE"})
     
ou apenas

     notifyClients()

O `output` de `read` ficará responsável por ser o `output` de cada cliente.

#### `onClientSuccessfullyReceives`
Callback que é disparado quando o cliente recebe o `output` (opcional).

#### `onClientFailsToReceive`
Callback que é disparado quando o cliente falha em receber o `output` (opcional).

#### `sendToSpecificClientsIds` 
Opcional.

Se `null`: todos os clientes que estão observando a rota serão notificados (padrão).

Se `!= null`: Apenas os `clientId` específicos receberão o `output *.

\* Uma outra maneira de definir quais clientes irão receber `output` é através de
[realtimeOutputHandler](#realtimeoutputhandler).
Utilize `sendToSpecificClientsIds` quando é possível saber previamente
quais os clientes irão receber o dado.

## `realtimeOutputHandler(...)`

 Após que [notifyClients](#notifyclients) for chamado, 
 `realtimeOutputHandler` pode filtrar e customizar o `output` final.
 
  Age como um middleware final de `output`
  para CADA* cliente que está observando o `route`, possibilitando:
 
  * filtrar quais clientes irão receber o `output` através da flag `notifyThisClient`
 
  * customizar o `output` final que será entregue ao cliente através do campo `customOutput`
 
  * adicionar os callbacks [onClientSuccessfullyReceives](#onclientsuccessfullyreceives) e
  [onClientFailsToReceive](#onclientfailstoreceive)
 
 \* Apenas clientes específicos quando o campo 
 [sendToSpecificClientsIds](#sendtospecificclientsids)
 é informado, do contrário todos os clientes que estão observando a rota.
 
 ### Parâmetros de `realtimeOutputHandler` - instância de `RealtimeOutputHandlerContext`
 
 `realtimeOutputHandler` é chamado para cada cliente que está observando a rota,
 portanto, a cada vez que `realtimeOutputHandler` é chamado 
 pode possuir diferentes valores para os parâmetros, sendo eles:
 
 `output`  O dado que o cliente receberia.
 
 `ownClientId` O id informado no `connect` pelo App cliente.
 
 `query` object informada pelo cliente para esta solicitação.
 
 `headers` Headers do cliente informados no momento da conexão.
 
  ### Pode retornar um objeto que inclui os campos:
 
  - `customOutput` O dado customizado que o cliente irá receber (opcional). 
  Padrão: O cliente receberá o `output` original.
 
  - `notifyThisClient` Opcional. Se true: `ownClientId` receberá o `output`/`customOutput` (padrão). 
  Se false: o cliente não será notificado.
 
  - `onClientSuccessfullyReceives` Callback que será disparado ao cliente receber o `output`/`customOutput` com sucesso.
 
  - `onClientFailsToReceive` Callback que será disparado ao cliente falhar em receber o `output`/`customOutput`.

  ### Exemplo
  
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

 Callback que é disparado quando um cliente começa a observar um `route`.
 
 Exemplo: 
 
    onClientStartsListening: async (context) => {
        console.log(context.ownClientId + ' started listening to '+context.route);
    },

## onClientStopsListening:VoidFunction

  Callback que é disparado quando um cliente para de observar um `route`.

  Exemplo

    onClientStopsListening: async (context) => {
        console.log(context.ownClientId + ' stopped listening to '+context.route);
    },

---

## `UpdateRoute`
Implementar um comportamento para quando um dado for atualizado.

Tipo:

    (context) => void

Campos de `context`:

  - body
  
  - query
  
  - ownClientId
  
  - headers
  
  - respondSuccess([params](#parmetros-de-respondsuccess))
  
  - respondError([params](#parmetros-de-responderror))
     
     
---

## `DeleteRoute`
Implementar um comportamento para quando um dado for removido.

Tipo:

    (context) => void

Campos de `context`:

  - body
  
  - query
  
  - ownClientId
  
  - headers
  
  - respondSuccess([params](#parmetros-de-respondsuccess))
  
  - respondError([params](#parmetros-de-responderror))
     
## Usando suas rotas criadas a partir da instância Server

### `getRoute(route, requestType)`

Obtém uma rota .

#### Parâmetros

##### route 
O nome da rota.

#### requestType
O tipo de operação que a rota trata: 
`CREATE`, `READ`, `UPDATE` or `DELETE`.

### `getReadRoute(readRoute)`

Obtém uma rota do tipo `READ`.

#### Parâmetros

##### route 
O nome da rota `READ`.

### `notifyClients(readRoute, notify)`

Chame esse método para notificar os clientes (que ouvem esse `route`) de que `ENTITY` sofreu mudanças,
através do envio de um novo `output` em tempo real.

#### Parâmetros

##### route

O nome da rota `READ`.

##### notify

[Os parâmetros para notifyClients](#parmetros-de-notifyclients---instncia-de-notifyclientsparams).


