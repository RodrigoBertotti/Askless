const askless = require("../../../dist/askless");
const productsRepository = require("../repository/ProductsRepository");



class CreateProductRoute extends askless.CreateRoute {
    constructor() {super('product');}

    //override
    async create(context) {
        console.log("context.ownClientId: "+context.ownClientId);
        if(context.ownClientId==null){
            context.respondError({
                code:  askless.RespondErrorCode.PERMISSION_DENIED,
                description: 'Only logged users can create',
            });
            return;
        }

        let product = context.body;
        product = await productsRepository.save(product);
        context.respondSuccess({
            output: product,
            onClientSuccessfullyReceives: () => console.log("_CreateProduct: Client "+context.ownClientId+" received the response"),
            onClientFailsToReceive: () => console.log("_CreateProduct: Client "+context.ownClientId+" didn\'t receive the response"),
        });
    }

}

class ListAllProductsRoute extends askless.ReadRoute { //Flutter Apps can listen to any READ method

    constructor() {super('product/all');}

    //override
    realtimeOutputHandler(context){
        if (context.query != null && context.query['search'] != null) {
            const search = context.query['search'].toString().trim().toLowerCase();
            return {
                notifyThisClient: true,
                customOutput: context.output.filter(
                    (product) => product.name.trim().toLowerCase().includes(search) || product.price.toString().trim().toLowerCase().includes(search)
                ),
                onClientSuccessfullyReceives: (clientId) => console.log("Realtime _ReadAllProducts: Client "+clientId+" received realtime data"),
                onClientFailsToReceive:  (clientId) => console.error("Realtime _ReadAllProducts: Client "+clientId+" didn\'t receive realtime data")
            };
        }

        return {
            notifyThisClient: true,
            onClientSuccessfullyReceives: (clientId) => console.log("Realtime _ReadAllProducts: Client "+clientId+" received realtime data"),
            onClientFailsToReceive:  (clientId) => console.error("Realtime _ReadAllProducts: Client "+clientId+"  didn\'t receive realtime data")
        };
    }

    //override
    async read(context) {
        context.respondSuccess({
            output: await productsRepository.readList(context.query != null ? context.query['search'] : null),
            onClientSuccessfullyReceives: (clientId) => console.log("_ReadAllProducts: Client " + clientId + " received the response"),
            onClientFailsToReceive: (clientId) => console.error("_ReadAllProducts: Client " + clientId + " didn\'t receive the response")
        });
    }


}

class DeleteProductRoute extends askless.DeleteRoute {

    constructor() {super('product');}

    //override
    async delete(context){
        if(context.ownClientId==null) {
            context.respondSuccess({
                code: askless.RespondErrorCode.PERMISSION_DENIED,
                description: 'Only logged users can delete',
                stack: null
            });
            return;
        }
        if(!context.query || !context.query['id']) {
            context.respondError({
                code:  askless.RespondErrorCode.BAD_REQUEST,
                description:  'Please, inform \"id\" field on query'
            });
            return;
        }
        const product = await productsRepository.delete(context.query['id']);
        if(!product){
            context.respondError({
                code: "NOT_FOUND",
                description: "Product "+context.query['id']+ " doesn't exist",
            })
            return;
        }

        context.respondSuccess({
            output: product,
            onClientSuccessfullyReceives: () => console.log("_DeleteProduct: Client "+context.ownClientId+" received the response"),
            onClientFailsToReceive:  () => console.error("_DeleteProduct: Client "+context.ownClientId+"  didn\'t receive the response ")
        });
    }



}

module.exports.createProductRoute = new CreateProductRoute();
module.exports.listAllProductsRoute = new ListAllProductsRoute();
module.exports.deleteProductRoute = new DeleteProductRoute();


