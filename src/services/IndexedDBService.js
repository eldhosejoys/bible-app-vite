
const DB_NAME = 'BibleAppDB';
const DB_VERSION = 1;
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
                STORES.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id' });
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
            const request = query ? store.getAll(query) : store.getAll();

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
    }
};
