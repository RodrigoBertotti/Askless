import {makeId} from "../../Utils";
import {AsklessError} from "./AsklessError";


/** @internal */
export class AsklessResponse {
  private readonly _class_type_response = "_";
  public static readonly RESPONSE_PREFIX = "RES-";

  public serverId:string;

  constructor(
    public readonly clientRequestId: string, // evitar que o servidor receba 2 vezes a mesma mensagem e evitar que o cliente receba 2 vezes a mesma mensagem
    public readonly output: any,
    public readonly error?: AsklessError,
    public dataType = "AsklessResponse",
    serverId?: string
  ) {
    if (clientRequestId == null) {
      throw Error("AsklessResponse: clientRequestId is null");
    }

    if (serverId == null)
      this.serverId = AsklessResponse.RESPONSE_PREFIX + makeId(11);
    else
      this.serverId = serverId;
  }

  get success(): boolean {
    return this.error == null;
  }
}

/** @internal */
export class ServerConfirmReceiptCli extends AsklessResponse {
  //enviar 1 vez após o recebimento da informação e deve ficar enviando isso TODA vez que o servidor tentar enviar a informação novamente
  private readonly _class_type_serverconfirmreceipt = "_";

  constructor(clientRequestId: string) {
    super(clientRequestId, "RECEIVED", undefined, "ServerConfirmReceiptCli");
  }
}

/** @internal */
export class ConfigureConnectionAsklessResponse extends AsklessResponse {
  private readonly _class_type_configureconnection = "_";

  constructor(clientRequestId: string, connectionConfiguration) {
    super(
      clientRequestId,
        { connectionConfiguration: connectionConfiguration },
      undefined,
      "ConfigureConnectionResponse",
    );
  }
}

export class AuthenticateAsklessResponse extends AsklessResponse {
  private readonly _class_type_authenticateresponse = "_";

  constructor(
      clientRequestId: string,
      output: {credentialErrorCode?:string, userId?: string | number, claims?: string []},
      error?: AsklessError
  ) {
    super(
        clientRequestId,
        output,
        error,
        "ConfigureConnectionResponse",
    );
  }
}
