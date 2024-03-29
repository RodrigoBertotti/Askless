
export function wait(ms: number) {
  //https://stackoverflow.com/a/33292942/4508758
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function copy(value) {
  return value == null
      ? value
      : typeof value == "object"
          ? (
              Array.isArray(value)
                  ? value.map(e => copy(e))
                  : Object.assign({}, value)
          ) : value;
}

//https://stackoverflow.com/a/1349426/4508758
export function makeId(length?: number): string {
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

export function delay(time: number) {
  //https://stackoverflow.com/a/951057/4508758
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function isJson(obj): boolean {
  const t = typeof obj;
  return (
      ["boolean", "number", "string", "symbol", "function"].indexOf(t) == -1
  );
}
