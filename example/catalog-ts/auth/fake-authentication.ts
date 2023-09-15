import {Authenticate} from "../../../src";

export class FakeAuthentication {

    /**
     * The purpose of this FakeAuthentication class is to ilustrate visually the authentication in the App,
     * NEVER use this as a reference to a real scenario
     * */

    private static readonly ownClientId_bearer = {
        1: 'Bearer abcd',
        2: 'Bearer efgh',
        3: 'Bearer ijkl'
    };

    static readonly fakeAuthenticate: Authenticate<number> = (credential, accept, reject) => {
        console.log("fakeAuthenticate");
        console.log(credential);
        if (credential['Authorization'] != null) {
            if (Object.values(this.ownClientId_bearer).includes(credential['Authorization'])) {
                const [userId, fakeBearerToken] = Object.entries(this.ownClientId_bearer).find(
                    ([userId, fakeBearerToken]) => fakeBearerToken == credential['Authorization']
                );
                if (userId == null) {throw new Error("userId must not be null");}
                accept.asAuthenticatedUser({ userId: parseInt(userId) });
            } else {
                console.log("rejecting authentication attempt");
                reject();
            }
        } else {
            accept.asUnauthenticatedUser();
        }
    };

}
