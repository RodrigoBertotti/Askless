import { AbstractTimedTask } from "./AbstractTimedTask";
import {
  ServerInternalImp,
  ws_clientId,
  ws_isAlive,
} from "../index";

export class DisconnectClientsWhoDidntPingTask extends AbstractTimedTask {
  constructor(server: ServerInternalImp) {
    super(server);
  }

  //override
  protected run() {
    if (!this.server?.wss) {
      this.server.logger("DisconnectClientsWhoDidntPingTask: this.server?.wss IS NULL", "error");
      return;
    }
    this.server.wss.clients.forEach((ws) => {
      if (ws[ws_isAlive] == false) {
        this.server.logger("Disconnecting user " + ws[ws_clientId] + " because he didn't ping", "debug");
        return ws.terminate();
      }
      ws[ws_isAlive] = false;
    });
  }
}
