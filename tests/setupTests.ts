import "@testing-library/jest-dom";
// Enable IndexedDB for Dexie in Vitest (jsdom)
import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
// Provide webcrypto in jsdom if missing
import { webcrypto } from "node:crypto";
// @ts-ignore
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;