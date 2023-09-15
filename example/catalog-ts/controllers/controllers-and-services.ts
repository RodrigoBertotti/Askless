import {AsklessServer} from "../../../src";
import {ProductsController} from "./products-controller/products-controller";
import {ProductsService} from "../domain/repository/products-service";


export interface Controller {
    initializeRoutes (server: AsklessServer) : void;
}

let _controllers:Array<Controller>;

let _productsService: ProductsService;

export function initializeControllers(server:AsklessServer) {
    _controllers = [
        new ProductsController((params) => _productsService = new ProductsService(params)),
    ]
    for (const controller of _controllers) {
        controller.initializeRoutes(server);
    }
}