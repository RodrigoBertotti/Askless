import {Controller} from "../controllers-and-services";
import {AsklessServer, AuthenticateUserContext} from "../../../../src";
import {CreateProductRoute} from "./routes/create-product-route";
import {ListProductsRoute} from "./routes/list-products-route";
import {DeleteProductRoute} from "./routes/delete-product-route";
import {ReadRouteInstance} from "../../../../src/route/ReadRoute";
import {ProductEntity} from "../../domain/entity/product-entity";
import {ProductsService, ProductsServiceParams} from "../../domain/repository/products-service";


export class ProductsController implements Controller {
    private readonly productsService: ProductsService;

    constructor(initProductsService : (params:ProductsServiceParams) => ProductsService) {
        this.productsService = initProductsService({
            notifyChangesProductsChanged: () => this.listProductsRoute.notifyChanges() /** <-- call .notifyChanges(..) whenever you want the users to refresh data */
        });
    }

    // TODO: no final pesquisar por temp_flutter_chat_app_with_mysql
    // TODO: testar todos exemplos de novo!

    listProductsRoute: ReadRouteInstance<ProductEntity[], AuthenticateUserContext<number>>;

    initializeRoutes(server: AsklessServer): void {
        /** [CREATE] product      */ new CreateProductRoute().addCreateRoute(server, this.productsService);
        /** [READ]   product-list */ this.listProductsRoute = new ListProductsRoute().addReadRoute(server, this.productsService);
        /** [DELETE] product      */ new DeleteProductRoute().addDeleteRoute(server, this.productsService);
    }

}
