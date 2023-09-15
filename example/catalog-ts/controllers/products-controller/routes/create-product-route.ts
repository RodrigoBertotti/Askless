import {AsklessServer} from "../../../../../src";
import {ProductEntity} from "../../../domain/entity/product-entity";
import {ProductModel} from "../../../data/models/product-model";
import {ProductsService} from "../../../domain/repository/products-service";


export class CreateProductRoute {

    addCreateRoute (server:AsklessServer<number>, productsService: ProductsService) : void {
        server.addRoute.forAuthenticatedUsers.create<ProductEntity>({
           route: "product",
           handleCreate: async context => {
               const entityBeforeSaved:ProductEntity = ProductModel.fromInput(context.body);
               const entityAfterSaved = await productsService.save(entityBeforeSaved);

               /** call successCallback(entity) once the request has been handled successfully */
               context.successCallback(entityAfterSaved);
           },
           /** The result of toOutput(entity) is what the App will actually receive */
           toOutput: (entity) => ProductModel.fromEntity(entity).output(),
           onReceived: (entityAfterSaved, context) =>
               console.log(`Create Product: User ${context.userId} received the response of "${entityAfterSaved.name}"`)
        });
    }

}