export type PetStats = {
  hunger: number;
  energy: number;
  hygiene: number;
  health: number;
  happiness: number;
  ageTicks: number;
  lastTickMs: number;
};

const PET_TICK_MS = 60 * 60 * 1000;
const MAX_DECAY_TICKS = 48;
// Preserve the age unit of existing saved pets (one tick = five minutes).
const AGE_TICKS_PER_HOUR = 12;

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function createDefaultPetStats(now = Date.now()): PetStats {
  return { hunger: 100, energy: 100, hygiene: 100, health: 100, happiness: 100, ageTicks: 0, lastTickMs: now };
}

export function normalizePetStats(value: unknown): PetStats {
  const data = value && typeof value === "object" ? value as Partial<PetStats> : {};
  const fallback = createDefaultPetStats();
  return {
    hunger: clamp(Math.round(readNumber(data.hunger, fallback.hunger))),
    energy: clamp(Math.round(readNumber(data.energy, fallback.energy))),
    hygiene: clamp(Math.round(readNumber(data.hygiene, fallback.hygiene))),
    health: clamp(Math.round(readNumber(data.health, fallback.health))),
    happiness: clamp(Math.round(readNumber(data.happiness, fallback.happiness))),
    ageTicks: Math.max(0, Math.round(readNumber(data.ageTicks, 0))),
    lastTickMs: readNumber(data.lastTickMs, fallback.lastTickMs),
  };
}

export function applyPetDecay(pet: PetStats, now = Date.now()): boolean {
  // Recover from a device clock being corrected backwards.
  if (pet.lastTickMs > now) {
    pet.lastTickMs = now;
    return true;
  }

  const elapsedTicks = Math.floor((now - pet.lastTickMs) / PET_TICK_MS);
  if (elapsedTicks < 1) return false;

  pet.ageTicks += elapsedTicks * AGE_TICKS_PER_HOUR;
  pet.lastTickMs += elapsedTicks * PET_TICK_MS;

  // A long absence counts for at most two days of needs. Advancing lastTickMs
  // for the entire absence prevents charging the skipped time on the next visit.
  for (let tick = 0; tick < Math.min(elapsedTicks, MAX_DECAY_TICKS); tick++) {
    pet.hunger = clamp(pet.hunger - 2);
    pet.energy = clamp(pet.energy - 1);
    pet.hygiene = clamp(pet.hygiene - 1);
    pet.happiness = clamp(pet.happiness - 1);

    const careScore = (pet.hunger + pet.energy + pet.hygiene + pet.happiness) / 4;
    let healthLoss = careScore <= 40 ? 1 : 0;
    if (pet.hunger <= 20) healthLoss++;
    if (pet.hygiene <= 20) healthLoss++;
    if (pet.energy <= 15) healthLoss++;

    if (healthLoss > 0) pet.health = clamp(pet.health - healthLoss);
    else if (careScore >= 65) pet.health = clamp(pet.health + 2);

    if (pet.health <= 30) pet.happiness = clamp(pet.happiness - 1);
  }

  return true;
}
