
const DB_NAME = 'BibleAppDB';
const DB_VERSION = 2;
const STORES = ['bookmarks', 'notes', 'highlights', 'history'];

let dbInstance = null;
let dbPromise = null;

export const IndexedDBService = {
    openDB: () => {
        if (dbInstance) return Promise.resolve(dbInstance);
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                dbPromise = null;
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const transaction = event.target.transaction;

                STORES.forEach(storeName => {
                    let store;
                    if (!db.objectStoreNames.contains(storeName)) {
                        store = db.createObjectStore(storeName, { keyPath: 'id' });
                    } else {
                        store = transaction.objectStore(storeName);
                    }

                    // Add timestamp index to history store for efficient sorting/pruning
                    if (storeName === 'history' && !store.indexNames.contains('timestamp')) {
                        store.createIndex('timestamp', 't', { unique: false });
                    }
                });
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                dbInstance.onclose = () => {
                    dbInstance = null;
                    dbPromise = null;
                };
                resolve(dbInstance);
            };
        });

        return dbPromise;
    },

    getAll: async (storeName, query = null) => {
        const db = await IndexedDBService.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);

            // If query is an IDBKeyRange, use it directly
            // If we want to sort by timestamp (for history), check if index exists
            let request;
            if (storeName === 'history' && !query && store.indexNames.contains('timestamp')) {
                // Return history sorted by timestamp (oldest first by default)
                // We typically want newest first for UI, so we might need to reverse in app or use cursor
                // For now, keep existing behavior (return all, sort in app) or use getAll on index
                const index = store.index('timestamp');
                request = index.getAll();
            } else {
                request = query ? store.getAll(query) : store.getAll();
            }

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    get: async (storeName, id) => {
        const db = await IndexedDBService.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    put: async (storeName, item) => {
        const db = await IndexedDBService.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    delete: async (storeName, id) => {
        const db = await IndexedDBService.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    clear: async (storeName) => {
        const db = await IndexedDBService.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    // Count items
    count: async (storeName) => {
        const db = await IndexedDBService.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    // Get oldest keys (IDs) using an index
    getOldestKeys: async (storeName, indexName, count = 1) => {
        const db = await IndexedDBService.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);

            if (!store.indexNames.contains(indexName)) {
                reject(new Error(`Index ${indexName} not found in store ${storeName}`));
                return;
            }

            const index = store.index(indexName);
            const request = index.getAllKeys(null, count);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
};
