import { AbstractTimedTask } from "./AbstractTimedTask";
import { ServerInternalImp, ws_clientId } from "../index";
import {ClientInfo} from "../client_middleware/Clients";

export class ClearRuntimeDataFromDisconnectedClientTask extends AbstractTimedTask {
  constructor(server: ServerInternalImp) {
    super(server);
  }

  //override
  protected run() {
    if (!this.server?.clientMiddleware?.clients) {
      this.server.logger("ClearRuntimeDataFromDisconnectedClientTask this.server?.clientMiddleware?.clients IS NULL", "error");
      return;
    }
    const clientsId_clientInfo = this.server.clientMiddleware.clients.getAllClientsInfos();
    for (let clientId in clientsId_clientInfo) {
      if (!clientsId_clientInfo.hasOwnProperty(clientId)) {
        return;
      }
      const clientInfo = clientsId_clientInfo[clientId] as ClientInfo;
      if (clientInfo.canBeDeleted((this.server.config??{})["intervalInSecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"])) {
        this.server.logger("Cleaning data from disconnected user " + clientId, "debug");
        this.server.clientMiddleware.clients.deleteClientsInfos([
          clientId,
        ]);
      }
    }
  }
}
