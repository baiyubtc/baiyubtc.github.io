// 产品管理页面初始化函数
function initProductManagement() {
    console.log('初始化产品管理页面');
    loadProducts();
    bindEvents();
}

// 加载产品列表
function loadProducts() {
    const productsGrid = document.querySelector('#product-management .products-grid');
    productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>加载中...</p></div>';
    
    getAllProducts().then(products => {
        if (products.length === 0) {
            productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>暂无产品数据，请添加产品</p></div>';
            return;
        }
        
        productsGrid.innerHTML = '';
        products.forEach(product => {
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);
        });
    }).catch(error => {
        console.error('加载产品失败:', error);
        productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><p>加载失败，请重试</p></div>';
    });
}

// 创建产品卡片
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;
    
    // 计算产品指标
    const metrics = calculateProductMetrics(product);
    const profitPercentage = (parseFloat(metrics.promotionProfit) / parseFloat(product.declarePrice)) * 100;
    const isHighProfit = profitPercentage >= 30;
    
    card.innerHTML = `
        <div class="product-image-container">
            <img src="${product.image || 'https://via.placeholder.com/280x280?text=No+Image'}" alt="${product.name}" class="product-image">
            ${product.category ? `<div class="product-category">${product.category}</div>` : ''}
            <div class="product-actions">
                <button class="action-btn copy-btn" title="复制">📋</button>
                <button class="action-btn edit-btn" title="编辑">✏️</button>
                <button class="action-btn delete-btn" title="删除">🗑️</button>
            </div>
        </div>
        <div class="product-info">
            <div class="product-sku-info">
                SPU: ${product.spu || '-'}
                SKC: ${product.skc || '-'}
                SKU: ${product.sku || '-'}
            </div>
            <div class="product-name">${product.name || '未命名产品'}</div>
            <div class="price-info">
                <span class="cost-price">进货价格: ¥${product.costPrice || '0'}</span>
                <span class="declare-price">申报价: ¥${product.declarePrice || '0'}</span>
            </div>
            <div class="ad-fee">广告扣费: ¥${metrics.adFee}</div>
            <div class="profit-info ${isHighProfit ? 'profit-high' : 'profit-low'}">
                推广利润: ¥${metrics.promotionProfit}
                ${!isHighProfit ? ` (利润: ¥${(parseFloat(product.declarePrice) - parseFloat(metrics.promotionProfit)).toFixed(2)})` : ''}
            </div>
        </div>
    `;
    
    // 绑定事件
    card.querySelector('.copy-btn').addEventListener('click', () => copyProduct(product));
    card.querySelector('.edit-btn').addEventListener('click', () => editProduct(product));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteProductConfirm(product.id));
    
    return card;
}

// 绑定页面事件
function bindEvents() {
    // 添加产品按钮
    document.querySelector('#product-management .add-product-btn').addEventListener('click', showAddProductModal);
    
    // 导出按钮
    document.getElementById('export-all-btn').addEventListener('click', exportProducts);
    
    // 导入按钮
    document.getElementById('import-btn').addEventListener('click', importProducts);
    
    // 搜索功能
    const searchBtn = document.querySelector('#product-management .search-row .btn-primary');
    const searchInput = document.querySelector('#product-management .search-input[placeholder="搜索产品名称、关键词..."]');
    
    searchBtn.addEventListener('click', () => {
        const keyword = searchInput.value.trim();
        if (keyword) {
            searchProductsByKeyword(keyword);
        } else {
            loadProducts();
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
    
    // 图片搜索
    const imgSearchBtn = document.querySelectorAll('#product-management .btn-primary')[1];
    imgSearchBtn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    // 这里仅更新UI，实际的图片搜索功能需要更复杂的实现
                    const imgSearchInput = document.querySelector('#product-management .img-search-input');
                    imgSearchInput.value = file.name;
                    alert('图片搜索功能需要更复杂的图像处理算法，这里仅作演示');
                };
                reader.readAsDataURL(file);
            }
        };
        fileInput.click();
    });
    
    // 排序功能
    const sortBtn = document.querySelector('#product-management .advanced-actions .btn:not(.btn-danger)');
    sortBtn.addEventListener('click', () => {
        const sortOptions = [
            { text: '最晚更新时间', value: 'desc' },
            { text: '最早更新时间', value: 'asc' }
        ];
        
        const option = prompt('请选择排序方式:\n1. 最晚更新时间\n2. 最早更新时间');
        if (option === '1') {
            sortProducts(false);
        } else if (option === '2') {
            sortProducts(true);
        }
    });
    
    // 批量删除
    const batchDeleteBtn = document.querySelector('#product-management .btn-danger');
    batchDeleteBtn.addEventListener('click', showBatchDeleteModal);
}

// 搜索产品
function searchProductsByKeyword(keyword) {
    const productsGrid = document.querySelector('#product-management .products-grid');
    productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>搜索中...</p></div>';
    
    searchProducts(keyword).then(products => {
        if (products.length === 0) {
            productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❓</div><p>未找到匹配的产品</p></div>';
            return;
        }
        
        productsGrid.innerHTML = '';
        products.forEach(product => {
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);
        });
    }).catch(error => {
        console.error('搜索失败:', error);
        productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><p>搜索失败，请重试</p></div>';
    });
}

// 排序产品
function sortProducts(ascending) {
    const productsGrid = document.querySelector('#product-management .products-grid');
    productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>排序中...</p></div>';
    
    getProductsSortedByUpdateTime(ascending).then(products => {
        productsGrid.innerHTML = '';
        products.forEach(product => {
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);
        });
    }).catch(error => {
        console.error('排序失败:', error);
        productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><p>排序失败，请重试</p></div>';
    });
}

// 显示添加产品模态框
function showAddProductModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">添加产品</div>
            <form id="add-product-form">
                <div class="form-group">
                    <div class="image-upload-preview" id="image-preview-container">
                        <span>点击或拖拽上传图片</span>
                    </div>
                    <input type="file" id="image-upload" accept="image/*" style="display: none;">
                </div>
                <div class="form-group">
                    <label class="form-label">SPU</label>
                    <input type="text" class="form-input" name="spu" placeholder="请输入SPU">
                </div>
                <div class="form-group">
                    <label class="form-label">SKC</label>
                    <input type="text" class="form-input" name="skc" placeholder="请输入SKC">
                </div>
                <div class="form-group">
                    <label class="form-label">SKU</label>
                    <input type="text" class="form-input" name="sku" placeholder="请输入SKU">
                </div>
                <div class="form-group">
                    <label class="form-label">进货价格</label>
                    <input type="number" class="form-input" name="costPrice" placeholder="请输入进货价格" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">申报价</label>
                    <input type="number" class="form-input" name="declarePrice" placeholder="请输入申报价" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">广告出价比例</label>
                    <input type="number" class="form-input" name="adBidRatio" placeholder="请输入广告出价比例" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label class="form-label">产品名称</label>
                    <textarea class="form-textarea" name="name" placeholder="请输入产品名称"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">购买链接</label>
                    <input type="text" class="form-input" name="purchaseLink" placeholder="请输入购买链接">
                </div>
                <div class="form-group">
                    <label class="form-label">分类</label>
                    <input type="text" class="form-input" name="category" placeholder="请输入分类名称">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn" id="cancel-add">取消</button>
                    <button type="submit" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 图片上传预览
    const previewContainer = modal.querySelector('#image-preview-container');
    const fileInput = modal.querySelector('#image-upload');
    let imageDataUrl = null;
    
    previewContainer.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageDataUrl = event.target.result;
                previewContainer.innerHTML = `<img src="${imageDataUrl}" alt="预览" class="image-preview">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 处理粘贴图片
    document.addEventListener('paste', (e) => {
        if (modal.contains(document.activeElement)) {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        imageDataUrl = event.target.result;
                        previewContainer.innerHTML = `<img src="${imageDataUrl}" alt="预览" class="image-preview">`;
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    });
    
    // 表单提交
    const form = modal.querySelector('#add-product-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const product = {
            image: imageDataUrl,
            spu: formData.get('spu'),
            skc: formData.get('skc'),
            sku: formData.get('sku'),
            costPrice: formData.get('costPrice'),
            declarePrice: formData.get('declarePrice'),
            adBidRatio: formData.get('adBidRatio'),
            name: formData.get('name'),
            purchaseLink: formData.get('purchaseLink'),
            category: formData.get('category'),
            updateTime: new Date().toISOString()
        };
        
        saveProduct(product).then(() => {
            alert('产品添加成功！');
            document.body.removeChild(modal);
            loadProducts();
        }).catch(error => {
            alert('添加失败: ' + error.message);
        });
    });
    
    // 取消按钮
    modal.querySelector('#cancel-add').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// 编辑产品
function editProduct(product) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">编辑产品</div>
            <form id="edit-product-form">
                <div class="form-group">
                    <div class="image-upload-preview" id="edit-image-preview-container">
                        ${product.image ? `<img src="${product.image}" alt="预览" class="image-preview">` : '<span>点击或拖拽上传图片</span>'}
                    </div>
                    <input type="file" id="edit-image-upload" accept="image/*" style="display: none;">
                </div>
                <div class="form-group">
                    <label class="form-label">SPU</label>
                    <input type="text" class="form-input" name="spu" value="${product.spu || ''}" placeholder="请输入SPU">
                </div>
                <div class="form-group">
                    <label class="form-label">SKC</label>
                    <input type="text" class="form-input" name="skc" value="${product.skc || ''}" placeholder="请输入SKC">
                </div>
                <div class="form-group">
                    <label class="form-label">SKU</label>
                    <input type="text" class="form-input" name="sku" value="${product.sku || ''}" placeholder="请输入SKU">
                </div>
                <div class="form-group">
                    <label class="form-label">进货价格</label>
                    <input type="number" class="form-input" name="costPrice" value="${product.costPrice || ''}" placeholder="请输入进货价格" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">申报价</label>
                    <input type="number" class="form-input" name="declarePrice" value="${product.declarePrice || ''}" placeholder="请输入申报价" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">广告出价比例</label>
                    <input type="number" class="form-input" name="adBidRatio" value="${product.adBidRatio || 0}" placeholder="请输入广告出价比例" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">产品名称</label>
                    <textarea class="form-textarea" name="name" placeholder="请输入产品名称">${product.name || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">购买链接</label>
                    <input type="text" class="form-input" name="purchaseLink" value="${product.purchaseLink || ''}" placeholder="请输入购买链接">
                </div>
                <div class="form-group">
                    <label class="form-label">分类</label>
                    <input type="text" class="form-input" name="category" value="${product.category || ''}" placeholder="请输入分类名称">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn" id="cancel-edit">取消</button>
                    <button type="submit" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 图片上传预览
    const previewContainer = modal.querySelector('#edit-image-preview-container');
    const fileInput = modal.querySelector('#edit-image-upload');
    let imageDataUrl = product.image;
    
    previewContainer.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageDataUrl = event.target.result;
                previewContainer.innerHTML = `<img src="${imageDataUrl}" alt="预览" class="image-preview">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 表单提交
    const form = modal.querySelector('#edit-product-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const updatedProduct = {
            id: product.id,
            image: imageDataUrl,
            spu: formData.get('spu'),
            skc: formData.get('skc'),
            sku: formData.get('sku'),
            costPrice: formData.get('costPrice'),
            declarePrice: formData.get('declarePrice'),
            adBidRatio: formData.get('adBidRatio'),
            name: formData.get('name'),
            purchaseLink: formData.get('purchaseLink'),
            category: formData.get('category'),
            updateTime: new Date().toISOString()
        };
        
        saveProduct(updatedProduct).then(() => {
            alert('产品更新成功！');
            document.body.removeChild(modal);
            loadProducts();
        }).catch(error => {
            alert('更新失败: ' + error.message);
        });
    });
    
    // 取消按钮
    modal.querySelector('#cancel-edit').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// 复制产品
function copyProduct(product) {
    const newSku = prompt('请输入新的SKU:', product.sku);
    if (newSku && newSku !== product.sku) {
        const copiedProduct = {
            ...product,
            id: null,
            sku: newSku,
            updateTime: new Date().toISOString()
        };
        
        saveProduct(copiedProduct).then(() => {
            alert('产品复制成功！');
            loadProducts();
        }).catch(error => {
            alert('复制失败: ' + error.message);
        });
    }
}

// 删除确认
function deleteProductConfirm(productId) {
    if (confirm('确定要删除这个产品吗？')) {
        deleteProduct(productId).then(() => {
            alert('产品删除成功！');
            loadProducts();
        }).catch(error => {
            alert('删除失败: ' + error.message);
        });
    }
}

// 显示批量删除模态框
function showBatchDeleteModal() {
    alert('批量删除功能需要先选择产品');
}

// 导出产品
function exportProducts() {
    getAllProducts().then(products => {
        if (products.length === 0) {
            alert('没有产品数据可导出');
            return;
        }
        
        // 按分类分组
        const productsByCategory = {};
        products.forEach(product => {
            const category = product.category || '未分类';
            if (!productsByCategory[category]) {
                productsByCategory[category] = [];
            }
            productsByCategory[category].push(product);
        });
        
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 为每个分类创建工作表
        Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
            const wsData = categoryProducts.map(product => {
                const metrics = calculateProductMetrics(product);
                return {
                    '产品图片': product.image || '',
                    'SPU': product.spu || '',
                    'SKC': product.skc || '',
                    'SKU': product.sku || '',
                    '产品名称': product.name || '',
                    '进货价格': product.costPrice || 0,
                    '申报价': product.declarePrice || 0,
                    '广告扣费': metrics.adFee,
                    '推广后利润': metrics.promotionProfit
                };
            });
            
            const ws = XLSX.utils.json_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, category);
        });
        
        // 导出为Excel文件
        XLSX.writeFile(wb, '产品数据_' + new Date().toLocaleDateString() + '.xlsx');
    }).catch(error => {
        alert('导出失败: ' + error.message);
    });
}

// 导入产品
function importProducts() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    
                    let importedCount = 0;
                    let skippedCount = 0;
                    
                    // 处理每个工作表
                    wb.SheetNames.forEach(sheetName => {
                        const ws = wb.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(ws);
                        
                        jsonData.forEach(row => {
                            // 检查是否已存在相同SKU的产品
                            searchProductsBySku(row['SKU']).then(existingProducts => {
                                if (existingProducts.length === 0) {
                                    // 创建新产品
                                    const newProduct = {
                                        image: row['产品图片'],
                                        spu: row['SPU'],
                                        skc: row['SKC'],
                                        sku: row['SKU'],
                                        name: row['产品名称'],
                                        costPrice: row['进货价格'],
                                        declarePrice: row['申报价'],
                                        category: sheetName,
                                        updateTime: new Date().toISOString()
                                    };
                                    
                                    saveProduct(newProduct).then(() => {
                                        importedCount++;
                                    });
                                } else {
                                    skippedCount++;
                                }
                            });
                        });
                    });
                    
                    setTimeout(() => {
                        alert(`导入完成！成功导入 ${importedCount} 个产品，跳过 ${skippedCount} 个已存在的产品`);
                        loadProducts();
                    }, 1000);
                    
                } catch (error) {
                    alert('导入失败: ' + error.message);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };
    fileInput.click();
}