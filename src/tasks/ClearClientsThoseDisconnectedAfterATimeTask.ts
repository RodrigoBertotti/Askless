import { AbstractTimedTask } from "./AbstractTimedTask";
import { ServerInternalImp, ws_clientId } from "../index";

export class ClearRuntimeDataFromDisconnectedClientTask extends AbstractTimedTask {
  constructor(server4Flutter: ServerInternalImp) {
    super(server4Flutter);
  }

  run() {
    if (!this.server4Flutter?.clientMiddleware?.clients) {
      this.server4Flutter.logger(
        "ClearRuntimeDataFromDisconnectedClientTask this.server4Flutter?.clientMiddleware?.clients IS NULL",
        "error"
      );
      return;
    }
    const clientsId_clientInfo = this.server4Flutter.clientMiddleware.clients.getAllClientsInfos();
    for (let clientId in clientsId_clientInfo) {
      if (!clientsId_clientInfo.hasOwnProperty(clientId)) {
        return;
      }
      const clientInfo = clientsId_clientInfo[clientId];
      if (
        clientInfo.disconnectedAt != null &&
        clientInfo.disconnectedAt +
          this.server4Flutter.config[
            "intervalInSecondsCheckIfIsNeededToClearRuntimeDataFromDisconnectedClient"
          ] *
            1000 <
          Date.now()
      ) {
        this.server4Flutter.logger(
          "Cleaning data from disconnected user " + clientId,
          "debug",
          clientInfo
        );
        this.server4Flutter.clientMiddleware.clients.deleteClientsInfos([
          clientId,
        ]);
      }
    }
  }
}
