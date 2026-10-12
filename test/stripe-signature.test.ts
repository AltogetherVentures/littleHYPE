import { describe, expect, it } from "vitest";
import { TOLERANCE_SECONDS, signStripePayload, verifyStripeSignature } from "../src/billing/signature";

const secret = "whsec_test_secret";
const body = '{"id":"evt_1","type":"checkout.session.completed"}';
const now = 1_790_000_000;

describe("Stripe webhook signature", () => {
  it("accepts the signature Stripe would send", async () => {
    expect(await verifyStripeSignature(body, await signStripePayload(body, secret, now), secret, now)).toBe(true);
  });

  it("rejects a tampered body, a different secret, and a different timestamp", async () => {
    const header = await signStripePayload(body, secret, now);
    expect(await verifyStripeSignature(body.replace("evt_1", "evt_2"), header, secret, now)).toBe(false);
    expect(await verifyStripeSignature(body, header, "whsec_other", now)).toBe(false);
    expect(await verifyStripeSignature(body, header.replace(`t=${now}`, `t=${now + 1}`), secret, now)).toBe(false);
  });

  it("rejects a replay outside the five-minute window, in either direction", async () => {
    const header = await signStripePayload(body, secret, now);
    expect(await verifyStripeSignature(body, header, secret, now + TOLERANCE_SECONDS)).toBe(true);
    expect(await verifyStripeSignature(body, header, secret, now + TOLERANCE_SECONDS + 1)).toBe(false);
    expect(await verifyStripeSignature(body, header, secret, now - TOLERANCE_SECONDS - 1)).toBe(false);
  });

  it("accepts any one matching v1 among several (secret rotation), ignoring other schemes", async () => {
    const good = (await signStripePayload(body, secret, now)).split(",v1=")[1]!;
    const header = `t=${now},v1=${"0".repeat(64)},v0=${"1".repeat(64)},v1=${good}`;
    expect(await verifyStripeSignature(body, header, secret, now)).toBe(true);
    expect(await verifyStripeSignature(body, `t=${now},v0=${good}`, secret, now)).toBe(false);
  });

  it("rejects missing, empty and malformed headers without throwing", async () => {
    for (const header of [null, "", "garbage", `t=${now}`, `v1=${"a".repeat(64)}`, `t=abc,v1=${"a".repeat(64)}`, `t=${now},v1=short`, `t=${now},v1=${"z".repeat(64)}`, `t=,v1=`, "t=1,t=2,v1=3"]) {
      expect(await verifyStripeSignature(body, header, secret, now), String(header)).toBe(false);
    }
  });

  it("refuses everything when no secret is configured", async () => {
    expect(await verifyStripeSignature(body, await signStripePayload(body, secret, now), "", now)).toBe(false);
  });

  it("is over the exact bytes: reformatted JSON does not verify", async () => {
    const header = await signStripePayload(body, secret, now);
    expect(await verifyStripeSignature(JSON.stringify(JSON.parse(body), null, 2), header, secret, now)).toBe(false);
  });
});
