export const withFallBack = async <T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  onFallback?: (error: unknown) => void,
): Promise<T> => {
  try {
    return await primary();
  } catch (error) {
    onFallback?.(error);

    return await fallback();
  }
};
