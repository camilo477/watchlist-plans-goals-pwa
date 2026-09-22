import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// These pure modules have no imports; use the existing TypeScript dependency
// to exercise production logic with Node 20's built-in test runner.
async function loadTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

const { timeTogether, RELATIONSHIP_START_MS } = await loadTypeScript("../src/lib/relationship.ts");
const { createDefaultPetStats, normalizePetStats, applyPetDecay } = await loadTypeScript("../src/lib/petStats.ts");
const HOUR = 3_600_000;

test("the anniversary is January 9, 2026 at 00:01 in Colombia, regardless of device timezone", () => {
  assert.equal(RELATIONSHIP_START_MS, Date.UTC(2026, 0, 9, 5, 1));
  assert.equal(timeTogether(Date.parse("2026-01-09T05:01:01Z")).totalSeconds, 1);
});

test("the counter handles second, minute and day boundaries without rounding up", () => {
  assert.equal(timeTogether(RELATIONSHIP_START_MS + 999).totalSeconds, 0);
  assert.deepEqual(timeTogether(RELATIONSHIP_START_MS + 86_400_000), {
    totalSeconds: 86_400, days: 1, hours: 0, minutes: 0, seconds: 0,
  });
  assert.deepEqual(timeTogether(RELATIONSHIP_START_MS + 90_061_000), {
    totalSeconds: 90_061, days: 1, hours: 1, minutes: 1, seconds: 1,
  });
  assert.equal(timeTogether(RELATIONSHIP_START_MS - 1000).totalSeconds, 0);
});

test("a long suspension or restart needs no stored counter to recover elapsed seconds", () => {
  const beforeSleep = timeTogether(Date.parse("2026-09-20T05:01:00Z"));
  const afterRestart = timeTogether(Date.parse("2026-09-21T05:01:07Z"));
  assert.equal(afterRestart.totalSeconds - beforeSleep.totalSeconds, 86_407);
  assert.equal(afterRestart.days, 255);
});

test("Zanahoria can rest overnight and stay healthy for a full day", () => {
  const pet = createDefaultPetStats(0);
  applyPetDecay(pet, 8 * HOUR);
  assert.equal(pet.hunger, 84);
  assert.equal(pet.energy, 92);
  assert.equal(pet.health, 100);
  applyPetDecay(pet, 24 * HOUR);
  assert.equal(pet.hunger, 52);
  assert.equal(pet.health, 100);
  assert.ok(pet.happiness >= 75);
});

test("short visits preserve the partial hour instead of postponing decay", () => {
  const pet = createDefaultPetStats(0);
  assert.equal(applyPetDecay(pet, 1000), false);
  assert.equal(applyPetDecay(pet, 1.5 * HOUR), true);
  assert.equal(pet.lastTickMs, HOUR);
  const saved = normalizePetStats(JSON.parse(JSON.stringify(pet)));
  assert.equal(applyPetDecay(saved, 1.75 * HOUR), false);
  assert.equal(applyPetDecay(saved, 2 * HOUR), true);
  assert.equal(saved.hunger, 96);
  assert.equal(saved.ageTicks, 24);
});

test("a long absence caps needs at two days and cannot be charged twice", () => {
  const pet = createDefaultPetStats(0);
  const twoDays = createDefaultPetStats(0);
  applyPetDecay(pet, 30 * 24 * HOUR);
  applyPetDecay(twoDays, 48 * HOUR);
  for (const stat of ["hunger", "energy", "hygiene", "health", "happiness"]) {
    assert.equal(pet[stat], twoDays[stat]);
  }
  const saved = { ...pet };
  assert.equal(applyPetDecay(pet, 30 * 24 * HOUR), false);
  assert.deepEqual(pet, saved);
  assert.equal(pet.ageTicks, 30 * 24 * 12);
});

test("good care gradually restores health, while poor care still has consequences", () => {
  const caredFor = { ...createDefaultPetStats(0), health: 60 };
  applyPetDecay(caredFor, 5 * HOUR);
  assert.equal(caredFor.health, 70);
  const hungry = { ...createDefaultPetStats(0), hunger: 10 };
  applyPetDecay(hungry, HOUR);
  assert.ok(hungry.health < 100);
});

test("old saved pets keep their stats and age; invalid values stay bounded", () => {
  const oldPet = { ...createDefaultPetStats(0), ageTicks: 450, hunger: 42 };
  assert.deepEqual(normalizePetStats(oldPet), oldPet);
  const invalid = normalizePetStats({ hunger: -3, energy: 500, health: NaN });
  assert.equal(invalid.hunger, 0);
  assert.equal(invalid.energy, 100);
  assert.equal(invalid.health, 100);
});

test("correcting a device clock backwards does not freeze the pet's needs", () => {
  const pet = createDefaultPetStats(2 * HOUR);
  applyPetDecay(pet, HOUR);
  assert.equal(pet.hunger, 100);
  assert.equal(pet.lastTickMs, HOUR);
  applyPetDecay(pet, 2 * HOUR);
  assert.equal(pet.hunger, 98);
});
