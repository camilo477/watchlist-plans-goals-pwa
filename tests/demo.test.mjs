import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/demoStore.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { DemoStore, DEMO_STORAGE_KEY } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const memoryStorage = () => {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
};

test("demo edits persist in one tab, remain separate from another visitor and reset to fictitious examples", async () => {
  const storage = memoryStorage();
  const first = new DemoStore(storage);
  const second = new DemoStore(memoryStorage());
  let updates = 0;
  const unsubscribe = first.subscribe(() => updates++);
  await new Promise(resolve => queueMicrotask(resolve));
  first.put("plans", "my-plan", { title: "Visitar el parque", status: "idea", sort: 100 });
  first.put("plans", "my-plan", { status: "done" }, true);
  assert.equal(first.get("plans", "my-plan").title, "Visitar el parque");
  assert.equal(second.get("plans", "my-plan"), undefined);
  assert.equal(new DemoStore(storage).get("plans", "my-plan").status, "done");
  assert.equal(updates, 3);
  first.remove("watchlist", "900001");
  first.put("tamagotchi", "shared", { happiness: 42 });
  assert.equal(new DemoStore(storage).get("tamagotchi", "shared").happiness, 42);
  first.reset();
  assert.equal(first.get("plans", "my-plan"), undefined);
  assert.equal(first.list("watchlist").length, 3);
  assert.equal(first.get("tamagotchi", "shared"), undefined);
  assert.doesNotMatch(storage.getItem(DEMO_STORAGE_KEY), /camilo|diana|hotmail|yahoo/i);
  unsubscribe();
  const count = updates;
  first.reset();
  assert.equal(updates, count);
});

test("demo runs with unavailable or corrupt browser storage and snapshots cannot mutate the store", () => {
  const broken = { getItem: () => { throw new Error("storage disabled"); }, setItem: () => { throw new Error("quota"); }, removeItem() {} };
  const demo = new DemoStore(broken);
  demo.put("goals", "test", { progress: { current: 1 } });
  const snapshot = demo.get("goals", "test");
  snapshot.progress.current = 9;
  assert.equal(demo.get("goals", "test").progress.current, 1);
  const storage = memoryStorage();
  storage.setItem(DEMO_STORAGE_KEY, "invalid json");
  assert.equal(new DemoStore(storage).list("plans").length, 3);
  storage.setItem(DEMO_STORAGE_KEY, "{}");
  assert.equal(new DemoStore(storage).list("plans").length, 3);
});
