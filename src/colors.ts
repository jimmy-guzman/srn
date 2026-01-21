import { styleText } from "node:util";

const createColor = (format: Parameters<typeof styleText>[0]) => {
  return (value: number | string) => {
    return styleText(
      format,
      typeof value === "number" ? value.toString() : value,
    );
  };
};

export const dim = createColor("dim");

export const red = createColor("red");
