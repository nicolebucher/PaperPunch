import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WHATS_NEW } from "../lib/whats-new.ts";

test("App-Kopie von Was-ist-neu ist identisch (bis auf die Kopfzeile)", () => {
  const body = (path) => readFileSync(new URL(path, import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(body("../mobile/src/whatsNewData.ts"), body("../lib/whats-new.ts"));
});

test("Was-ist-neu: ids absteigend, DE und EN gleich viele Punkte", () => {
  WHATS_NEW.forEach((e, i) => {
    if (i > 0) assert.ok(WHATS_NEW[i - 1].id > e.id);
    assert.equal(e.de.items.length, e.en.items.length);
    assert.ok(e.de.items.length >= 1 && e.de.items.length <= 5);
  });
});
