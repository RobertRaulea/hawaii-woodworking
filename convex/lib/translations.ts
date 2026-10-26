export type Language = "ro" | "en" | "de";

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

export function getTranslatedField<T extends object>(
  item: T,
  fieldName: string,
  language: Language
): string {
  const record = item as Record<string, unknown>;
  return (
    asNonEmptyString(record[`${fieldName}_${language}`]) ??
    asNonEmptyString(record[`${fieldName}_ro`]) ??
    asNonEmptyString(record[fieldName]) ??
    ""
  );
}

export function addTranslatedFields<T extends object>(
  item: T,
  language: Language
): T & { translatedName?: string; translatedDescription?: string } {
  return {
    ...item,
    translatedName: getTranslatedField(item, "name", language),
    translatedDescription: getTranslatedField(item, "description", language),
  };
}
