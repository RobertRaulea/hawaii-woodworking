const explicitStorageUrl = import.meta.env.VITE_PRODUCTS_STORAGE_URL as string | undefined;

export const storageUrl = explicitStorageUrl ?? '';
