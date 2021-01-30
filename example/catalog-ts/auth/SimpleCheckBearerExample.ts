import {GrantConnection} from "../../../dist/askless";


export class SimpleCheckBearerExample {

    private static readonly ownClientId_bearer = {
        1: 'Bearer abcd',
        2: 'Bearer efgh',
        3: 'Bearer ijkl'
    };

    static readonly validateToken:GrantConnection = async (ownClientId:string|number, headers:Map<string, any>) =>{
        const realToken = SimpleCheckBearerExample.ownClientId_bearer[ownClientId];
        return headers['Authorization'] == realToken;
    }

}
