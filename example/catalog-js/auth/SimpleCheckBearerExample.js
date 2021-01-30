

module.exports = class SimpleCheckBearerExample {

    static ownClientId_bearer = {
        1: 'Bearer abcd',
        2: 'Bearer efgh',
        3: 'Bearer ijkl'
    };

    static validateToken = async (ownClientId, headers) =>{
        const realToken = SimpleCheckBearerExample.ownClientId_bearer[ownClientId];
        return headers['Authorization'] === realToken;
    }

};
