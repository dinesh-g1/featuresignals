export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const path = (route: string) => `${BASE_PATH}${route}`;
