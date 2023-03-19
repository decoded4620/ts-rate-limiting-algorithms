export const circurlarReferenceReplacer = () => {
  const seen = new WeakSet();
  return (_key: unknown, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

/**
 * Save JSON.stringify with circular reference protection
 * @param input
 * @param indent
 * @returns
 */
export const safeJsonStringify = (input: unknown, indent?: number) => {
  return JSON.stringify(input, circurlarReferenceReplacer(), indent);
};

/**
 * Get the error message or stringify the object thrown
 * @param error the error object
 * @returns the string representation of the error
 */
export const getErrorMessage = (error: unknown): string => {
  let errorMsg = `${error}`;

  if (error instanceof Error) {
    errorMsg = error.message;
  } else if (!(error instanceof String)) {
    errorMsg = safeJsonStringify(error);
  }

  return errorMsg;
};
