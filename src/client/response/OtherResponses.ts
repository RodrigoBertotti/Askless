import { Utils } from "../Utils";
import {RespondError} from "./RespondError";


/** @internal */
export class ResponseCli {
  private readonly _class_type_response = "_";
  public static readonly RESPONSE_PREFIX = "RES-";

  public serverId:string;

  constructor(
    public readonly clientRequestId: string, // evitar que o servidor receba 2 vezes a mesma mensagem e evitar que o cliente receba 2 vezes a mesma mensagem
    public readonly output: any,
    public readonly error?: RespondError,
    public dataType = "ResponseCli",
    serverId?: string
  ) {
    if (serverId == null)
      this.serverId = ResponseCli.RESPONSE_PREFIX + Utils.makeId(11);
    else
      this.serverId = serverId;
  }

  get isSuccess(): boolean {
    return this.error == null;
  }
}

/** @internal */
export class ServerConfirmReceiptCli extends ResponseCli {
  //enviar 1 vez após o recebimento da informação e deve ficar enviando isso TODA vez que o servidor tentar enviar a informação novamente
  private readonly _class_type_serverconfirmreceipt = "_";

  constructor(clientRequestId: string) {
    super(clientRequestId, "RECEIVED", undefined, "ServerConfirmReceiptCli");
  }
}

/** @internal */
export class ConfigureConnectionResponseCli extends ResponseCli {
  private readonly _class_type_configureconnection = "_";

  constructor(clientRequestId: string, connectionConfiguration) {
    super(
      clientRequestId,
      connectionConfiguration,
      undefined,
      "ConfigureConnectionResponse"
    );
  }
}

