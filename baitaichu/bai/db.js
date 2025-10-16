// 数据库名称和版本
const DB_NAME = 'ProductManagementDB';
const DB_VERSION = 5;
let db = null;

// 初始化数据库
function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('数据库打开失败:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('数据库打开成功');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            const oldVersion = event.oldVersion;
            
            console.log(`数据库从版本 ${oldVersion} 升级到版本 ${DB_VERSION}`);
            
            // 版本1的结构
            if (oldVersion < 1) {
                // 创建产品存储对象
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    productStore.createIndex('sku', 'sku', { unique: false });
                    productStore.createIndex('skc', 'skc', { unique: false });
                    productStore.createIndex('spu', 'spu', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                    productStore.createIndex('category', 'category', { unique: false });
                    productStore.createIndex('updateTime', 'updateTime', { unique: false });
                }

                // 创建分类存储对象
                if (!db.objectStoreNames.contains('categories')) {
                    const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                    categoryStore.createIndex('name', 'name', { unique: true });
                }
            }
            
            // 版本5的升级
            if (oldVersion < 5) {
                // 为产品存储添加额外的索引
                if (db.objectStoreNames.contains('products')) {
                    const productStore = event.currentTarget.transaction.objectStore('products');
                    
                    // 检查索引是否已存在，避免重复创建
                    try {
                        if (!productStore.indexNames.contains('costPrice')) {
                            productStore.createIndex('costPrice', 'costPrice', { unique: false });
                        }
                        if (!productStore.indexNames.contains('declarePrice')) {
                            productStore.createIndex('declarePrice', 'declarePrice', { unique: false });
                        }
                        if (!productStore.indexNames.contains('adBidRatio')) {
                            productStore.createIndex('adBidRatio', 'adBidRatio', { unique: false });
                        }
                    } catch (e) {
                        console.warn('索引创建失败（可能已存在）:', e);
                    }
                }
                
                console.log('数据库已升级到版本5');
            }

            console.log('数据库升级完成');
        };
    });
}

// 添加或更新产品
function saveProduct(product) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            
            if (!product.updateTime) {
                product.updateTime = new Date().toISOString();
            }
            
            const request = store.put(product);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 获取所有产品
function getAllProducts() {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 根据ID获取产品
function getProductById(id) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 删除产品
function deleteProduct(id) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 批量删除产品
function deleteProducts(ids) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            
            ids.forEach(id => {
                store.delete(id);
            });

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 根据SKU搜索产品
function searchProductsBySku(sku) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('sku');
            const range = IDBKeyRange.only(sku);
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 模糊搜索产品
function searchProducts(keyword) {
    return getAllProducts().then(products => {
        return products.filter(product => 
            product.name?.includes(keyword) ||
            product.sku?.includes(keyword) ||
            product.skc?.includes(keyword) ||
            product.spu?.includes(keyword)
        );
    });
}

// 按更新时间排序产品
function getProductsSortedByUpdateTime(ascending = false) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('updateTime');
            const request = ascending ? index.getAll() : index.getAll(IDBKeyRange.upperBound(Date.now()), 'prev');

            request.onsuccess = () => {
                const products = request.result;
                if (!ascending) {
                    products.reverse();
                }
                resolve(products);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 添加分类
function addCategory(name) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['categories'], 'readwrite');
            const store = transaction.objectStore('categories');
            const request = store.add({ name, createTime: new Date().toISOString() });

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 获取所有分类
function getAllCategories() {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 根据分类获取产品
function getProductsByCategory(categoryName) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('category');
            const range = IDBKeyRange.only(categoryName);
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 导出数据为JSON
function exportData() {
    return Promise.all([
        getAllProducts(),
        getAllCategories()
    ]).then(([products, categories]) => {
        return { products, categories };
    });
}

// 导入数据
function importData(data) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products', 'categories'], 'readwrite');
            const productStore = transaction.objectStore('products');
            const categoryStore = transaction.objectStore('categories');

            // 导入分类
            if (data.categories && data.categories.length > 0) {
                data.categories.forEach(category => {
                    try {
                        categoryStore.put(category);
                    } catch (e) {
                        console.warn('导入分类失败:', e);
                    }
                });
            }

            // 导入产品
            if (data.products && data.products.length > 0) {
                data.products.forEach(product => {
                    productStore.put(product);
                });
            }

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// 计算产品相关数据的辅助函数
function calculateProductMetrics(product) {
    // 计算广告扣费
    const adFee = product.adBidRatio && product.adBidRatio > 0 
        ? (parseFloat(product.declarePrice) / parseFloat(product.adBidRatio)) 
        : 0;
    
    // 计算推广后利润
    const promotionProfit = parseFloat(product.declarePrice) - adFee - parseFloat(product.costPrice);
    
    // 计算95折相关数据
    const sellPrice95 = parseFloat(product.declarePrice) * 0.95;
    const profit95 = sellPrice95 - parseFloat(product.costPrice);
    const profitRate95 = profit95 / sellPrice95 * 100;
    
    return {
        adFee: adFee.toFixed(2),
        promotionProfit: promotionProfit.toFixed(2),
        sellPrice95: sellPrice95.toFixed(2),
        profit95: profit95.toFixed(2),
        profitRate95: profitRate95.toFixed(2) + '%'
    };
}