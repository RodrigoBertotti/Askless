import { AbstractTimedTask } from "./AbstractTimedTask";
import {
  AsklessServer,
  ws_clientIdInternalApp,
  ws_isAlive,
} from "../index";

export class DisconnectClientsWhoDidntPingTask extends AbstractTimedTask {
  constructor(server: AsklessServer) {
    super(server);
  }


  //override
  protected run() {
    this.server.logger("DisconnectClientsWhoDidntPingTask", "debug");
    if (!this.server?.wss) {
      this.server.logger("DisconnectClientsWhoDidntPingTask: this.server?.wss IS NULL", "error");
      return;
    }
    this.server.wss.clients.forEach((ws) => {
      if (ws[ws_isAlive] == false) {
        this.server.logger("Disconnecting user " + ws[ws_clientIdInternalApp] + " because he didn't ping", "debug");
        return ws.terminate();
      }
      ws[ws_isAlive] = false;
    });
  }
}
