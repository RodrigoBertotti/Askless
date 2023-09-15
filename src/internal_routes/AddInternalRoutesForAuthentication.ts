import {AsklessServer} from "../index";



export class AddInternalRoutesForAuthentication<USER_ID> {


    run (askless:AsklessServer<USER_ID>)  {
        askless.addRoute.forAllUsers.delete({
            route: "askless-internal/authentication",
            handleDelete: context => {
                if (context.userId == null) {
                    context.successCallback({'result': 'NO-OP'});
                    return;
                }
                askless.clearAuthentication(context.userId);
                context.successCallback({'result': 'OK'});
            },
            toOutput: entity => entity,
        });
    }

}
