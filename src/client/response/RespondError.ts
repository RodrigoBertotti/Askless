import {RespondErrorCode} from "../Types";


export type RespondErrorParams = {
    code?: RespondErrorCode | string;
    description?: string;
    stack?;
};

/**
 *  Must the return of the `route` when the
 *  request could not be accomplished. <br>
 *
 *  The construtor param it's
 *  an object that can have the following fields:
 *
 *  - `code:RespondErrorCode|string` Set a code for the error (optional).
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
 *      if(context.ownClientId==null) {
 *          return context.respondError({
 *              code: RespondErrorCode.PERMISSION_DENIED,
 *              description: 'Only logged users can delete',
 *          });
 *      }
 *      //...
 *  }
 *
 * */
export class RespondError {
    private readonly _class_type_reqerror = "_";
    readonly code: RespondErrorCode | string;
    readonly description: string;
    readonly stack: any;

    /**
     *  The construtor param it's
     *  an object that can have the following fields:
     *
     *  - `code:RespondErrorCode|string` Set a code for the error (optional).
     *
     *  - `description?:string` Additional text describing the error (optional).
     *
     *  - `stack?`  Send errors to the client,
     *  making it easier to test in a development environment (optional).
     *  Server will only use this field if
     *  `sendInternalErrorsToClient` is `true`.
     *
     *  @example
     *  delete(context: DeleteRouteContext): void {
     *      if(context.ownClientId==null) {
     *          return context.respondError({
     *              code: RespondErrorCode.PERMISSION_DENIED,
     *              description: 'Only logged users can delete',
     *          });
     *      }
     *      //...
     *  }
     *
     * */
    constructor(respondErrorParams?: RespondErrorParams) {
        if (respondErrorParams) {
            this.code = respondErrorParams.code;
            this.description = respondErrorParams.description;
            this.stack = respondErrorParams.stack;
        }
    }
    //TODO? onClientSuccessfullyReceives and onClientFailsToReceive
};
