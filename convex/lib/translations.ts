export type Language = "ro" | "en" | "de";

export function getTranslatedField<T extends Record<string, any>>(
  item: T,
  fieldName: string,
  language: Language
): string {
  const translatedFieldName = `${fieldName}_${language}`;
  
  if (item[translatedFieldName]) {
    return item[translatedFieldName];
  }
  
  if (item[`${fieldName}_ro`]) {
    return item[`${fieldName}_ro`];
  }
  
  if (item[fieldName]) {
    return item[fieldName];
  }
  
  return "";
}

export function addTranslatedFields<T extends Record<string, any>>(
  item: T,
  language: Language
): T & { translatedName?: string; translatedDescription?: string } {
  return {
    ...item,
    translatedName: getTranslatedField(item, "name", language),
    translatedDescription: getTranslatedField(item, "description", language),
  };
}
