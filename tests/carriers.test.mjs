import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CARRIERS,
  OTHER_CARRIER_LABEL,
  getTrackingUrl,
} from "../shared/carriers.utils.ts";

test("getTrackingUrl builds a tracking link for each known carrier", () => {
  assert.equal(
    getTrackingUrl("FAN Courier", "AWB123"),
    "https://www.fancourier.ro/awb-tracking/?tracking=AWB123",
  );
  assert.equal(
    getTrackingUrl("Sameday", "AWB123"),
    "https://sameday.ro/status-colet/?awb=AWB123",
  );
  assert.equal(
    getTrackingUrl("Cargus", "AWB123"),
    "https://www.cargus.ro/personal/urmareste-coletul/?tracking_number=AWB123",
  );
});

test("getTrackingUrl matches the stored carrier label case-insensitively", () => {
  assert.equal(
    getTrackingUrl("fan courier", "AWB123"),
    "https://www.fancourier.ro/awb-tracking/?tracking=AWB123",
  );
  assert.equal(
    getTrackingUrl("  SAMEDAY  ", "AWB123"),
    "https://sameday.ro/status-colet/?awb=AWB123",
  );
});

test("getTrackingUrl returns null for unknown carriers and missing data", () => {
  assert.equal(getTrackingUrl(OTHER_CARRIER_LABEL, "AWB123"), null);
  assert.equal(getTrackingUrl("DPD", "AWB123"), null);
  assert.equal(getTrackingUrl(undefined, "AWB123"), null);
  assert.equal(getTrackingUrl("FAN Courier", undefined), null);
  assert.equal(getTrackingUrl("FAN Courier", "   "), null);
});

test("getTrackingUrl URL-encodes the AWB", () => {
  assert.equal(
    getTrackingUrl("FAN Courier", "AWB 12/3"),
    "https://www.fancourier.ro/awb-tracking/?tracking=AWB%2012%2F3",
  );
});

test("CARRIERS exposes the three known couriers", () => {
  assert.deepEqual(
    CARRIERS.map((carrier) => carrier.label),
    ["FAN Courier", "Sameday", "Cargus"],
  );
});
