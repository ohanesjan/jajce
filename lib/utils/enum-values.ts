export function enumValues<TEnum extends Record<string, string>>(
  enumObject: TEnum,
): Array<TEnum[keyof TEnum]> {
  return Object.values(enumObject) as Array<TEnum[keyof TEnum]>;
}
