import {OnClientFailsToReceive, OnClientSuccessfullyReceives} from "../../route/ReadRoute";

export type RespondSuccessParams = {
    output: any;
    onClientSuccessfullyReceives?: OnClientSuccessfullyReceives;
    onClientFailsToReceive?: OnClientFailsToReceive;
};

/**
 *  Must the return of the `route` when the
 *  request is successfully accomplished.
 *
 *  The construtor param it's
 *  an object that can have the following fields:
 *
 *  - `output` The data that the client will receive as response (optional).
 *
 *  - `onClientSuccessfullyReceives:(clientId) => void`
 *  Callback that is triggered when the client receives the `output` (optional).
 *
 *  - `onClientFailsToReceive:(clientId) => void`
 *  Callback that is triggered when the client did\'nt receive the `output` (optional).
 *
 *  @example
 *  create(context: CreateRouteContext): void {
 *      let product = context.body as Product;
 *      product = await productsRepository.save(product);
 *      context.respondSuccess({
 *          output: product,
 *          onClientSuccessfullyReceives: () => console.log("_CreateProduct: Client "+context.ownClientId+" received the response"),
 *          onClientFailsToReceive: () => console.log("_CreateProduct: Client "+context.ownClientId+" didn\'t receive the response"),
 *      });
 *  }
 * */
export class RespondSuccess {
    private readonly _class_type_success = "_";

    public readonly onClientFailsToReceive: OnClientFailsToReceive;
    public readonly onClientSuccessfullyReceives: OnClientSuccessfullyReceives;
    public readonly output: any;

    /**
     *  The construtor param it's
     *  an object that can have the following fields:
     *
     *  - `output` The data that the client will receive as response (optional).
     *
     *  - `onClientSuccessfullyReceives:(clientId) => void`
     *  Callback that is triggered when the client receives the `output` (optional).
     *
     *  - `onClientFailsToReceive:(clientId) => void`
     *  Callback that is triggered when the client did\'nt receive the `output` (optional).
     *
     *  @example
     *  create(context: CreateRouteContext): void {
     *      let product = context.body as Product;
     *      product = await productsRepository.save(product);
     *      context.respondSuccess({
     *          output: product,
     *          onClientSuccessfullyReceives: () => console.log("_CreateProduct: Client "+context.ownClientId+" received the response"),
     *          onClientFailsToReceive: () => console.log("_CreateProduct: Client "+context.ownClientId+" didn\'t receive the response"),
     *      });
     *  }
     */
    constructor(successParams?: RespondSuccessParams) {
        //if((successParams as RespondSuccessParams).output==null){
        //    throw Error("Err");
        //}
        if (successParams) {
            this.output = successParams.output;
            this.onClientSuccessfullyReceives =
                successParams.onClientSuccessfullyReceives;
            this.onClientFailsToReceive = successParams.onClientFailsToReceive;
        }
    }
}
