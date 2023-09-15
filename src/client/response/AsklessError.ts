import {AsklessErrorCode} from "../Types";


export type AsklessErrorParams = {
    code?: AsklessErrorCode | string;
    description?: string;
};

/**
 *  Must the return of the `route` when the
 *  request could not be accomplished. <br>
 *
 *  The construtor param it's
 *  an object that can have the following fields:
 *
 *  - `code:AsklessErrorCode|string` Set a code for the error (optional).
 *
 *  - `description?:string` Additional text describing the error (optional).
 *
 *  - `stack?`  Send errors to the client,
 *  making it easier to test in a development environment (optional).
 *  Server will only use this field if
 *  `sendInternalErrorsToClient` is `true`.
 *
 * @example
 *   delete(context: DeleteRouteContext): void {
 *      if(context.userId==null) {
 *          return context.errorCallback({
 *              code: AsklessErrorCode.PERMISSION_DENIED,
 *              description: 'Only logged users can delete',
 *          });
 *      }
 *      //...
 *  }
 *
 * */
export class AsklessError {
    readonly code?: AsklessErrorCode | string;
    readonly description?: string;

    /**
     *  The construtor param it's
     *  an object that can have the following fields:
     *
     *  - `code:AsklessErrorCode|string` Set a code for the error (optional).
     *
     *  - `description?:string` Additional text describing the error (optional).
     *
     *  @example
     *  delete(context: DeleteRouteContext): void {
     *      if(context.userId==null) {
     *          return context.errorCallback({
     *              code: AsklessErrorCode.PERMISSION_DENIED,
     *              description: 'Only logged users can delete',
     *          });
     *      }
     *      //...
     *  }
     *
     * */
    constructor(asklessErrorParams?: AsklessErrorParams) {
        this.code = asklessErrorParams?.code;
        this.description = asklessErrorParams?.description;
    }
}
