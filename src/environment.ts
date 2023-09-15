export const environment = {
  server: {
    name: "2.0.0", //TODO onupdate: change package.json as well
    code: 4,
    clientVersionCodeSupported: {
      flutter: {
        moreThanOrEqual: 4,
        lessThanOrEqual: null,
      },
      javascript: { /* not supported anymore */
        moreThanOrEqual: null,
        lessThanOrEqual: 3,
      },
    }
  }
}
