export const DEFAULT_CATEGORY_NAME = "AI";

export type CategoryOption = {
  id: string;
  name: string;
};

export function findDefaultCategoryId(categories: CategoryOption[]) {
  return categories.find((category) => category.name === DEFAULT_CATEGORY_NAME)?.id;
}

export function defaultCategoryScope(categories: CategoryOption[], defaultScope = "all", fallback = "all") {
  const preferred = defaultScope.trim();
  if (preferred === "all") return "all";
  if (categories.some((category) => category.id === preferred)) return preferred;
  return fallback;
}

export function selectedCategoryOrDefault(category: string | undefined, categories: CategoryOption[], defaultScope = "all", fallback = "all") {
  return category?.trim() || defaultCategoryScope(categories, defaultScope, fallback);
}
