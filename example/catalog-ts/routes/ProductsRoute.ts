import {
    AsklessServer, RespondSuccess, RespondError,
    RespondErrorCode, CreateRoute, CreateRouteContext,
    DeleteRoute, DeleteRouteContext,
    ReadRoute,
    ReadRouteContext,
    RealtimeOutputHandlerResult,
    RealtimeOutputHandlerContext
} from '../../../dist/askless';
import {Product} from "../models/Product";
import {productsRepository} from "../repository/ProductsRepository";


class CreateProductRoute extends CreateRoute {
    constructor() {super('product');}

    //override
    async create(context: CreateRouteContext) {
        console.log("context.ownClientId: "+context.ownClientId);
        if(context.ownClientId==null){
            context.respondError(
                {
                    code: RespondErrorCode.PERMISSION_DENIED,
                    description: 'Only logged users can create',
                }
            );
            return;
        }

        let product = context.body as Product;
        product = await productsRepository.save(product);
        context.respondSuccess({
            output: product,
            onClientSuccessfullyReceives: () => console.log("_CreateProduct: Client "+context.ownClientId+" received the response"),
            onClientFailsToReceive: () => console.log("_CreateProduct: Client "+context.ownClientId+" didn\'t receive the response"),
        });
    }

}

class ListAllProductsRoute extends ReadRoute { //Flutter Apps can listen to any READ method

    constructor() {super('product/all');}

    //override
    realtimeOutputHandler(context: RealtimeOutputHandlerContext): RealtimeOutputHandlerResult {
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
    async read(context: ReadRouteContext) {
        context.respondSuccess({
            output: await productsRepository.readList(context.query != null ? context.query['search'] : null),
            onClientSuccessfullyReceives: (clientId) => console.log("_ReadAllProducts: Client " + clientId + " received the response"),
            onClientFailsToReceive: (clientId) => console.error("_ReadAllProducts: Client " + clientId + " didn\'t receive the response")
        });
    }


}

class DeleteProductRoute extends DeleteRoute {

    constructor() {super('product');}

    //override
    async delete(context: DeleteRouteContext) {
        if(context.ownClientId==null) {
            context.respondError({
                code: RespondErrorCode.PERMISSION_DENIED,
                description: 'Only logged users can delete',
                stack: null
            });
            return;
        }
        if(!context.query || !context.query['id']) {
            return context.respondError({
                code: RespondErrorCode.BAD_REQUEST,
                description:  'Please, inform \"id\" field on query'
            });
        }
        const product = await productsRepository.delete(context.query['id']);
        context.respondSuccess({
            output: product,
            onClientSuccessfullyReceives: () => console.log("_DeleteProduct: Client "+context.ownClientId+" received the response"),
            onClientFailsToReceive:  () => console.error("_DeleteProduct: Client "+context.ownClientId+"  didn\'t receive the response ")
        });
    }



}

export const createProductRoute = new CreateProductRoute();
export const listAllProductsRoute = new ListAllProductsRoute();
export const deleteProductRoute = new DeleteProductRoute();

