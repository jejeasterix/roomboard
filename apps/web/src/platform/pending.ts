/**
 * Fichier ouvert en attente du rechargement (choix du lot 5a : ouvrir = recharger la page, le moteur garde son
 * document). IndexedDB garde les octets et la cible par clonage structuré (chemin Tauri, poignée FSA réelle) ; une
 * cible qui ne se clone pas est abandonnée, le fichier reste.
 */
import { hasErrorName, type PendingOpen, type PendingStore, type SaveTarget } from "./files";
import { finished, lazyDb, result } from "./idb";

export const PENDING_DB = "roomboard-fichiers";
const STORE = "ouverture";
/** Clé unique, partagée par tous les onglets : un seul document en attente à la fois (cas d'usage voulu, conflit rare : le dernier Ouvrir gagne). */
const KEY = "courant";

interface Row {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly target: SaveTarget | null;
}

export function isDataClone(e: unknown): boolean {
  return hasErrorName(e, "DataCloneError");
}

export function createMemoryPendingStore(): PendingStore {
  let current: PendingOpen | null = null;
  return {
    async put(p) {
      current = { name: p.name, bytes: p.bytes.slice(), target: p.target };
    },
    async take() {
      const c = current;
      current = null;
      return c;
    },
    async clear() {
      current = null;
    },
  };
}

/** Sans IndexedDB, un fichier ne survit pas au rechargement : Ouvrir le refuse avec cette raison (message clair). */
export function createUnavailablePendingStore(reason: string): PendingStore {
  return {
    async put() {
      throw new Error(reason);
    },
    async take() {
      return null;
    },
    async clear() {},
  };
}

export function createIdbPendingStore(factory: IDBFactory, name: string = PENDING_DB): PendingStore {
  const open = lazyDb(factory, name, 1, (d) => void d.createObjectStore(STORE));
  const write = async (row: Row): Promise<void> => {
    const tx = (await open()).transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(row, KEY); // DataCloneError levée ici, avant toute attente
    await finished(tx);
  };
  return {
    async put(p) {
      const row: Row = { name: p.name, bytes: p.bytes, target: p.target };
      try {
        await write(row);
      } catch (e) {
        if (!isDataClone(e) || p.target === null) throw e;
        await write({ ...row, target: null });
      }
    },
    async take() {
      const tx = (await open()).transaction(STORE, "readwrite");
      const done = finished(tx);
      done.catch(() => undefined); // si la lecture échoue, `done` n'est plus attendu : pas de rejet non géré
      const store = tx.objectStore(STORE);
      const read = result(store.get(KEY) as IDBRequest<Row | undefined>);
      store.delete(KEY); // exécutée après la lecture (ordre des requêtes d'une transaction)
      const row = await read;
      await done;
      return row ? { name: row.name, bytes: new Uint8Array(row.bytes), target: row.target } : null;
    },
    async clear() {
      const tx = (await open()).transaction(STORE, "readwrite");
      const done = finished(tx);
      tx.objectStore(STORE).delete(KEY);
      await done;
    },
  };
}
