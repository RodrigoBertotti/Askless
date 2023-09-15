import {AsklessErrorParams} from "../client/response/AsklessError";
import {AsklessErrorCode} from "../client/Types";


export class ErrorResponse extends Error implements AsklessErrorParams {
    code?: AsklessErrorCode | string;
    description?: string;
    stack?;

    constructor(params:{
        code: AsklessErrorCode | string,
        description?: string,
        stack?
    }) {
        super(`${params.code}: ${params.description ?? ''}`);
        this.code = params.code;
        this.description = params.description;
        this.stack = params.stack;
    }

}
