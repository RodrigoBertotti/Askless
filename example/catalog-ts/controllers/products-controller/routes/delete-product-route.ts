import {AsklessErrorCode, AsklessServer} from "../../../../../src";
import {ProductsService} from "../../../domain/repository/products-service";
import {ProductEntity} from "../../../domain/entity/product-entity";
import {ProductModel} from "../../../data/models/product-model";


export class DeleteProductRoute  {

    addDeleteRoute(server: AsklessServer, productsService: ProductsService) : void {
        server.addRoute.forAuthenticatedUsers.delete<ProductEntity>({
            route: "product",
            handleDelete: async (context) => {
                if(!context.params || !context.params['id']) {
                    context.errorCallback({
                        code: "BAD_REQUEST",
                        description:  'Please, inform \"id\" field on params'
                    });
                    return;
                }
                const product = await productsService.delete(context.params['id']);
                if(product){
                    context.successCallback(product);
                } else {
                    context.errorCallback({
                        code: "NOT_FOUND",
                        description: `Product ${context.params['id']} doesn't exist`,
                    });
                }
            },
            toOutput: (entity) => ProductModel.fromEntity(entity).output(),
            onReceived: (entity, context) => {
                console.log(`Client ${context.userId} received the response of "${entity.name}"`)
            },
        });
    }

}
