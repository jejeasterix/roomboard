/** Aides IndexedDB partagées (repris de `pending.ts`, C4) : promesses d'une transaction et d'une requête, base ouverte
 *  au premier besoin ; une ouverture refusée n'est pas gardée (l'appel suivant réessaie). */
export function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB : transaction refusée"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB : transaction annulée"));
  });
}

export function result<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("IndexedDB : lecture refusée"));
  });
}

export function lazyDb(factory: IDBFactory, name: string, version: number, upgrade: (db: IDBDatabase) => void): () => Promise<IDBDatabase> {
  let db: Promise<IDBDatabase> | null = null;
  return () => {
    db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const r = factory.open(name, version);
      r.onupgradeneeded = () => upgrade(r.result);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error("IndexedDB indisponible"));
    }).catch((e: unknown) => {
      db = null;
      throw e;
    });
    return db;
  };
}
