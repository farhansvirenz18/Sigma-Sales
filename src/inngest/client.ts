import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "sigma-sales",
  name: "Sigma Sales Processing",
  eventKey: process.env.INNGEST_EVENT_KEY || "",
  signingKey: process.env.INNGEST_SIGNING_KEY || "",
});
