import { Callback, Listen, ModificationType, RequestType } from "./Types";
import {makeId} from "../Utils";

/** @internal */
export abstract class AbstractRequestCli {
  public readonly clientRequestId = makeId(10); //Tanto para o cliente, quanto para o servidor (mesma implementação nos 2 lados --->) será usado para 2 motivos: 1) confirmar recebimento de informação (3 vezes) ... 2) Caso o 1 falhar, evitar que seja recebido 2 vezes a mesma informação.

  protected constructor(public requestType: RequestType) {}
}
/** @internal */
export class ClientConfirmReceiptCli extends AbstractRequestCli {
  //enviar 1 vez após o recebimento da informação e deve ficar enviando isso TODA vez que o servidor tentar enviar a informação novamente
  public static readonly type = "_class_type_clientconfirmreceipt";
  private readonly _class_type_clientconfirmreceipt = "_";

  constructor(public serverId: string) {
    super(RequestType.CONFIRM_RECEIPT);
  }
}
/** @internal */
export class ConfigureConnectionRequestCli extends AbstractRequestCli {
  //enviar 1 vez após o recebimento da informação e deve ficar enviando isso TODA vez que o servidor tentar enviar a informação novamente
  public static readonly type = "_class_type_configureconnectionrequest";
  private readonly _class_type_configureconnectionrequest = "_";

  public clientType:'flutter'|'javascript';

  constructor(public clientId, public headers) {
    super(RequestType.CONFIGURE_CONNECTION);
  }
}
/** @internal */
export class ModifyCli extends AbstractRequestCli {
  static readonly type = "_class_type_modify";
  private readonly _class_type_modify = "_";
  private callback: Callback;

  constructor(
    public route: string,
    modificationType: ModificationType,
    public body?,
    public query?: object
  ) {
    super((modificationType as unknown) as RequestType);
  }

  setCallback(callback: Callback): ModifyCli {
    this.callback = callback;
    return this;
  }
}
/** @internal */
export class ReadCli extends AbstractRequestCli {
  public static readonly type = "_class_type_read";
  private readonly _class_type_read = "_";
  private callback: Callback;

  constructor(public route: string, public query?: object) {
    super(RequestType.READ);
  }

  setCallback(callback: Callback): ReadCli {
    this.callback = callback;
    return this;
  }
}
/** @internal */
export class ListenCli extends AbstractRequestCli {
  public static readonly type = "_class_type_listen";
  private readonly _class_type_listen = "_";
  private listen: Listen;

  constructor(
    public route: string,
    public listenId: string,
    public query?: object
  ) {
    super(RequestType.LISTEN);
  }

  doListen(listen: Listen): ListenCli {
    this.listen = listen;
    return this;
  }
}
