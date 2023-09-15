


export class MessageEntity {
    constructor(
       public readonly text:string,
       public readonly origin:'blue' | 'green',
       public readonly createdAt: Date,
    ) {}
}