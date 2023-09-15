import { AbstractTimedTask } from "./AbstractTimedTask";
import {AsklessServer} from "../index";

export class ClearRuntimeDataFromDisconnectedClientTask extends AbstractTimedTask {
  constructor(server: AsklessServer<any>) {
    super(server);
  }

  //override
  protected run() {
    if (!this.server?.clientMiddleware?.clients) {
      this.server.logger("ClearRuntimeDataFromDisconnectedClientTask this.server?.clientMiddleware?.clients IS NULL", "error");
      return;
    }
    const clientsId_clientInfo = this.server.clientMiddleware.clients.getAllClientsInfos();
    for (let clientIdInternalApp of Object.keys(clientsId_clientInfo)) {
      if (!clientsId_clientInfo.hasOwnProperty(clientIdInternalApp)) {
        return;
      }
      const clientInfo = clientsId_clientInfo[clientIdInternalApp];
      if (clientInfo.canBeDeleted((this.server.config??{})["intervalInMillsecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"])) {
        this.server.logger("Cleaning data from disconnected user " + clientIdInternalApp, "debug");
        this.server.clientMiddleware.clients.deleteClientsInfos([clientIdInternalApp,]);
      }
    }
  }
}
