export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  authUsers: [
    { email: process.env.AUTH_USER_1_EMAIL ?? "", password: process.env.AUTH_USER_1_PASSWORD ?? "" },
    { email: process.env.AUTH_USER_2_EMAIL ?? "", password: process.env.AUTH_USER_2_PASSWORD ?? "" },
  ].filter((account) => account.email && account.password),
};
