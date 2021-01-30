import { AbstractTimedTask } from "./AbstractTimedTask";
import {
  ServerInternalImp,
  ws_clientId,
  ws_isAlive,
} from "../index";

export class DisconnectClientsWhoDidntPingTask extends AbstractTimedTask {
  constructor(server4Flutter: ServerInternalImp) {
    super(server4Flutter);
  }

  run() {
    if (!this.server4Flutter?.wss) {
      this.server4Flutter.logger(
        "DisconnectClientsWhoDidntPingTask: this.server4Flutter?.wss IS NULL",
        "error"
      );
      return;
    }
    this.server4Flutter.wss.clients.forEach((ws) => {
      if (ws[ws_isAlive] == false) {
        this.server4Flutter.logger(
          "Disconnecting user " + ws[ws_clientId] + " because he didn't ping",
          "debug"
        );
        return ws.terminate();
      }
      ws[ws_isAlive] = false;
    });
  }
}
