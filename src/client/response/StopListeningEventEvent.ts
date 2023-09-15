import {makeId} from "../../Utils";

export class StopListeningEventEvent {
    public static readonly PREFIX = "STOP-";
    private readonly _class_type_stoplistening = "_";
    public readonly dataType = "StopListening";
    public readonly serverId: string;

    constructor(
        public listenId: string
    ) {
        this.serverId = StopListeningEventEvent.generateIdPrefix() + listenId;
    }

    static generateIdPrefix() {
        return StopListeningEventEvent.PREFIX + makeId(5) + "-";
    }
}
