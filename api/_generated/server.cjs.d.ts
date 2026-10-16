// أنواع لحزمة الخادم المُجمَّعة (server.cjs) التي يولّدها scripts/bundle-server-for-vercel.mjs
// تمنع خطأ TS7016 (implicit any) عند فحص TypeScript في Vercel.
declare const serverModule: {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
  default?: {
    fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
  };
};

export default serverModule;
