

//TODO onupdate client:
//TODO onupdate server:
export const environment = {
  flutterClient: {
    versions: [
      {
        name: "1.0.0",
        code: 1,
      },
      {
        name: "1.0.1",
        code: 2,
      },
      //TODO onupdate
    ],
    current: 2, //TODO onupdate
  },
  webClient: {
    versions: [
      {
        name: "1.0.0",
        code: 1,
      },
      //TODO onupdate
    ],
    current: 1, //TODO onupdate
  },

  server: {
    versions: [
      {
        name: "1.0.0",
        code: 1,
        clientVersionCodeSupported: {
          flutter: {
            moreThanOrEqual: null,
            lessThanOrEqual: null,
          },
          web: {
            moreThanOrEqual: null,
            lessThanOrEqual: null,
          },
        }
      },
    ],
    //TODO onupdate client:
    //TODO onupdate server:
    current: "1.0.0",
  },
};
