export function createFormData(payload: Record<string, any>): FormData {
  const formData: FormData = new FormData();

  Object.entries(payload)
    .filter(([key, value]) => value !== undefined && value !== null)
    .forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((valueItem: any) => {
          formData.append(`${key}[]`, valueItem);
        });
      } else {
        formData.append(key, value);
      }
    });

  return formData;
}
