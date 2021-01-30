import { ResponseCli } from "../client/response/OtherResponses";
import { AbstractTimedTask } from "./AbstractTimedTask";
import { ClientInfo } from "../client_middleware/Clients";
import { ServerInternalImp } from "../index";

export class SendMessageToClientAgainTask extends AbstractTimedTask {
  constructor(server4Flutter: ServerInternalImp) {
    super(server4Flutter);
  }

  run() {
    const clientsId_clientInfo = this.server4Flutter?.clientMiddleware?.clients?.getAllClientsInfos();
    if (!this.server4Flutter?.wss) {
      this.server4Flutter.logger(
        "SendMessageToClientAgainTask: this.server4Flutter?.clientMiddleware?.clients?.getAllClientsInfos() IS NULL",
        "error"
      );
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
        this.server4Flutter.clientMiddleware.assertSendDataToClient(
          clientId,
          pending.dataSentToClient,
          false,
          null,
          null
        );

        if (
          this.server4Flutter.config[
            "secondsToStopTryingToSendMessageAgainAndAgain"
          ] &&
          this.server4Flutter.config[
            "secondsToStopTryingToSendMessageAgainAndAgain"
          ] >= 1 &&
          pending.firstTryAt +
            this.server4Flutter.config[
              "secondsToStopTryingToSendMessageAgainAndAgain"
            ] *
              1000 >=
            Date.now()
        ) {
          removePendingMessageThatClientShouldReceiveList_clientId_serverId.push(
            {
              clientId: clientId,
              serverId: pending.dataSentToClient.serverId,
            }
          );
        }
      });

      for (
        let i = 0;
        i <
        removePendingMessageThatClientShouldReceiveList_clientId_serverId.length;
        i++
      ) {
        const re =
          removePendingMessageThatClientShouldReceiveList_clientId_serverId[i];
        this.server4Flutter.clientMiddleware.clients.removePendingMessage(
          re.clientId,
          false,
          re.serverId
        );
      }
    }
  }
}
