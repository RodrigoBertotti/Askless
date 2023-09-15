import {AsklessError} from "./response/AsklessError";


export enum ModificationType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
//Atenção os campos de ModificationType precisam estar inclusos em RequestType
export enum RequestType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LISTEN = "LISTEN",
  CONFIRM_RECEIPT = "CONFIRM_RECEIPT",
  CONFIGURE_CONNECTION = "CONFIGURE_CONNECTION",
  AUTHENTICATE = "AUTHENTICATE",
  READ = "READ",
}

export enum CrudRequestType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  READ = "READ",
}

export enum AsklessErrorCode {
  /** An unknown error occurred on the server side */
  INTERNAL_ERROR = "INTERNAL_ERROR",

  /** The authenticated user doesn't have permission to modify or/and access the requested resource */
  PERMISSION_DENIED = "PERMISSION_DENIED",

  /** The route wasn't added on the server side  */
  INVALID_ROUTE = "INVALID_ROUTE",

  /**
   * `credential` wasn't accepted in the `authenticate` function on the server side
   *
   * Example: accessToken is invalid, invalid email, invalid password, etc.  */
  INVALID_CREDENTIAL = "INVALID_CREDENTIAL",

  /**
   * The request could not proceed because the informed `route` requires authentication by the client.
   *
   * To fix this, choose to either:
   *  - call AsklessClient.instance.authenticate(...) in the client side before performing this request
   *
   *  or
   *
   *  - change the route on the server side from `addRouteFor.authenticatedUsers` to `addRoute.forAllUsers`
   * */
  PENDING_AUTHENTICATION = "PENDING_AUTHENTICATION",

  /**
   * The server didn't give a response to the `authentication(..)` function on the server side, to fix this, make sure to
   * call either `accept.asAuthenticatedUser(..)`, `accept.asUnauthenticatedUser()` or `reject(..)` callbacks in the `authentication(..)` function on the server side.
   * */
  AUTHORIZE_TIMEOUT = "AUTHORIZE_TIMEOUT",
}


export type Callback = (output: any, error?: AsklessError) => void;
export type Listen = (onData: any, error?: AsklessError) => void;

export type OnReceivedContext<LOGGED_IN_OR_NOT, LOCALS> = { params:object, locals: LOCALS}  & LOGGED_IN_OR_NOT;
export type OnReceived<ENTITY, LOGGED_IN_OR_NOT, LOCALS> = (entity: ENTITY, context:OnReceivedContext<LOGGED_IN_OR_NOT, LOCALS>) => void;
