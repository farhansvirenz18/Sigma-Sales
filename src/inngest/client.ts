import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "sigma-sales",
  name: "Sigma Sales Processing",
  retryFunction: async (attempt: number) => ({
    delay: Math.pow(2, attempt) * 1000,
  }),
});
