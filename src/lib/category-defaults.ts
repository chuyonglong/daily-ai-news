export const DEFAULT_CATEGORY_NAME = "AI";

export type CategoryOption = {
  id: string;
  name: string;
};

export function findDefaultCategoryId(categories: CategoryOption[]) {
  return categories.find((category) => category.name === DEFAULT_CATEGORY_NAME)?.id;
}

export function defaultCategoryScope(categories: CategoryOption[], fallback = "all") {
  return findDefaultCategoryId(categories) ?? fallback;
}

export function selectedCategoryOrDefault(category: string | undefined, categories: CategoryOption[], fallback = "all") {
  return category?.trim() || defaultCategoryScope(categories, fallback);
}
