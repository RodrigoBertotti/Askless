

/**
 *  Must the return of the `route` when the
 *  request is successfully accomplished.
 *
 *  The construtor param it's
 *  an object that can have the following fields:
 *
 *  - `output` The data that the client will receive as response (optional).
 *
 *  - `onReceived:(clientId) => void`
 *  A listener that is triggered every time the client receives `output` (optional).
 *
 *  @example
 *  create(context: CreateRouteContext): void {
 *      let product = context.body as ProductModel;
 *      product = await productsRepository.save(product);
 *      context.successCallback({
 *          output: product,
 *          onReceived: () => console.log("_CreateProduct: Client "+context.userId+" received the response"),
 *      });
 *  }
 * */
export class AsklessSuccess {
    private readonly _class_type_success = "_";


    /**
     *  The construtor param it's
     *  an object that can have the following fields:
     *
     *  - `output` The data that the client will receive as response (optional).
     *
     *  - `onReceived:(clientId) => void`
     *  A listener that is triggered every time the client receives `output` (optional).
     *
     *  @example
     *  create(context: CreateRouteContext): void {
     *      let product = context.body as ProductModel;
     *      product = await productsRepository.save(product);
     *      context.successCallback({
     *          output: product,
     *          onReceived: () => console.log("_CreateProduct: Client "+context.userId+" received the response"),
     *      });
     *  }
     */
    constructor(public readonly output) {}
}
