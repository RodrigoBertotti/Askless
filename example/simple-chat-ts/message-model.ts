import {MessageEntity} from "./message-entity";


export class MessageModel extends MessageEntity {

    constructor(
        text:string,
        origin:'blue' | 'green',
        createdAt: Date,
    ) {
        super(text, origin, createdAt);
    }

    static fromEntity (entity:MessageEntity) {
        return Object.assign(new MessageModel(null,null,null), entity);
    }

    toOutput () {
        return {
            "text": this.text,
            "origin": this.origin,
            "createdAtTimestamp": this.createdAt.getTime(),
        }
    }

    static fromEntityList(entityList: MessageEntity[]) {
        return entityList.map(entity => MessageModel.fromEntity(entity));
    }
}