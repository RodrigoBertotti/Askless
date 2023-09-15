import {AsklessServer, AuthenticateUserContext} from "../../../../../src";
import {ProductModel} from "../../../data/models/product-model";
import {ProductEntity} from "../../../domain/entity/product-entity";
import {ReadRouteInstance} from "../../../../../src/route/ReadRoute";
import {ProductsService} from "../../../domain/repository/products-service";


export class ListProductsRoute {

    addReadRoute (server:AsklessServer<number>, productsService: ProductsService) : ReadRouteInstance<ProductEntity[], AuthenticateUserContext<number>> {
        return server.addRoute.forAllUsers.read<ProductEntity[]>({
            route: 'product-list',
            handleRead: async (context) => {
                const searchOrNull:string = context.params != null && context.params['search']?.length ? context.params['search'] : null;
                const productList = await productsService.readList(searchOrNull);
                if (context.params["reversed"]) {
                    context.successCallback(productList.reverse());
                } else {
                    context.successCallback(productList);
                }
            },
            toOutput: (entityList) => {
                return ProductModel.fromEntityList(entityList).map((model) => model.output());
            },
            onReceived: (entity, context) => {
                console.log(`Client ${context?.userId ?? '(unauthenticated)'} received the product list`)
            },
        })
    }

}
