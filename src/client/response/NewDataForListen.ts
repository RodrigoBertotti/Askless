import {makeId} from "../../Utils";

export class NewDataForListener {
    public static readonly PREFIX = "NEW-";
    private readonly _class_type_newDataForListener = "_";
    public readonly dataType = "NewDataForListener";
    public readonly serverId: string;

    constructor(
        public output: any,
        public listenId: string
    ) {
        this.serverId = NewDataForListener.generateIdPrefix() + listenId;
    }

    static generateIdPrefix() {
        return NewDataForListener.PREFIX + makeId(5) + "-";
    }
}
