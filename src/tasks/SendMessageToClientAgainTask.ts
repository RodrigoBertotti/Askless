import { AbstractTimedTask } from "./AbstractTimedTask";
import {AsklessServer} from "../index";

export class SendMessageToClientAgainTask extends AbstractTimedTask {
  constructor(server: AsklessServer<any>) {
    super(server);
  }

  //override
  protected run() {
    const clientsId_clientInfo = this.server?.clientMiddleware?.clients?.getAllClientsInfos();
    if (!this.server?.wss) {
      this.server.logger("SendMessageToClientAgainTask: this.server?.clientMiddleware?.clients?.getAllClientsInfos() IS NULL", "error");
      return;
    }
    for (let clientId of Object.keys(clientsId_clientInfo)) {
      if (!clientsId_clientInfo.hasOwnProperty(clientId)) {
        return;
      }
      const info = clientsId_clientInfo[clientId];
      const removePendingMessageThatClientShouldReceiveList_clientId_serverId: Array<{
        clientIdInternalApp: string;
        serverId: string;
      }> = [];
      info.pendingMessages.forEach((pending) => {
        this.server.clientMiddleware.assertSendDataToClient(
          clientId,
          pending.dataSentToClient,
          false,
            pending.onClientReceiveOutputWithSuccess,
        );

        if (pending.canBeRemovedFromQueue((this.server.config ?? {})["millisecondsToStopTryingToSendMessage"])) {
          removePendingMessageThatClientShouldReceiveList_clientId_serverId.push(
            {
              clientIdInternalApp: clientId,
              serverId: pending.dataSentToClient.serverId,
            }
          );
        }
      });

      for (let i = 0; i < removePendingMessageThatClientShouldReceiveList_clientId_serverId.length; i++) {
        const re = removePendingMessageThatClientShouldReceiveList_clientId_serverId[i];
        this.server.clientMiddleware.clients.removePendingMessage(
          re.clientIdInternalApp,
          false,
          re.serverId
        );
      }
    }
  }
}
