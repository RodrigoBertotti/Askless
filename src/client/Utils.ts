export const CLIENT_GENERATED_ID_PREFIX = "CLIENT_GENERATED_ID-";

export class Utils {
  public static async wait(ms: number) {
    //https://stackoverflow.com/a/33292942/4508758
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  //https://stackoverflow.com/a/1349426/4508758
  public static makeId(length?: number): string {
    if (!length) length = 10;
    let result = "";
    let characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  static getOwnClientId(clientId) {
    if (clientId == null) return null;
    return clientId.toString().startsWith(CLIENT_GENERATED_ID_PREFIX)
      ? null
      : clientId;
  }

  static async delay(time: number) {
    //https://stackoverflow.com/a/951057/4508758
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  static isJson(obj): boolean {
    const t = typeof obj;
    return (
      ["boolean", "number", "string", "symbol", "function"].indexOf(t) == -1
    );
  }
}
