import { ResponseCli } from "../client/response/OtherResponses";
import { AbstractTimedTask } from "./AbstractTimedTask";
import { ClientInfo } from "../client_middleware/Clients";
import { ServerInternalImp } from "../index";

export class SendMessageToClientAgainTask extends AbstractTimedTask {
  constructor(server: ServerInternalImp) {
    super(server);
  }

  //override
  protected run() {
    const clientsId_clientInfo = this.server?.clientMiddleware?.clients?.getAllClientsInfos();
    if (!this.server?.wss) {
      this.server.logger("SendMessageToClientAgainTask: this.server?.clientMiddleware?.clients?.getAllClientsInfos() IS NULL", "error");
      return;
    }
    for (let clientId in clientsId_clientInfo) {
      if (!clientsId_clientInfo.hasOwnProperty(clientId)) {
        return;
      }
      const info = clientsId_clientInfo[clientId] as ClientInfo;
      const removePendingMessageThatClientShouldReceiveList_clientId_serverId: Array<{
        clientId: string | number;
        serverId: string;
      }> = [];
      info.pendingMessages.forEach((pending) => {
        this.server.clientMiddleware.assertSendDataToClient(
          clientId,
          pending.dataSentToClient,
          false,
          undefined,
          undefined
        );

        if (pending.canBeRemovedFromQueue((this.server.config ?? {})["secondsToStopTryingToSendMessageAgainAndAgain"])) {
          removePendingMessageThatClientShouldReceiveList_clientId_serverId.push(
            {
              clientId: clientId,
              serverId: pending.dataSentToClient.serverId,
            }
          );
        }
      });

      for (let i = 0; i < removePendingMessageThatClientShouldReceiveList_clientId_serverId.length; i++) {
        const re = removePendingMessageThatClientShouldReceiveList_clientId_serverId[i];
        this.server.clientMiddleware.clients.removePendingMessage(
          re.clientId,
          false,
          re.serverId
        );
      }
    }
  }
}
