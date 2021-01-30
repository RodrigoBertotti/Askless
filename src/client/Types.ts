import {RespondError} from "./response/RespondError";


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
  READ = "READ",
}

export enum CrudRequestType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  READ = "READ",
}
export enum RespondErrorCode {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  BAD_REQUEST = "BAD_REQUEST",
  NEED_CONFIGURE_HEADERS = "NEED_CONFIGURE_HEADERS",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  TOKEN_INVALID = "TOKEN_INVALID",
}

export type Callback = (output: any, error?: RespondError) => void;
export type Listen = (onData: any, error?: RespondError) => void;
