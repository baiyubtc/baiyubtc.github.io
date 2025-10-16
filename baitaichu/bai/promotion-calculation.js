// 活动推广计算页面初始化函数
function initPromotionCalculation() {
    console.log('初始化活动推广计算页面');
    loadPromotionProducts();
    bindPromotionEvents();
}

// 加载产品列表
function loadPromotionProducts() {
    const productsGrid = document.querySelector('#promotion-calculation .products-grid');
    productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>加载中...</p></div>';
    
    getAllProducts().then(products => {
        if (products.length === 0) {
            productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>暂无产品数据</p></div>';
            return;
        }
        
        productsGrid.innerHTML = '';
        products.forEach(product => {
            const productCard = createPromotionProductCard(product);
            productsGrid.appendChild(productCard);
        });
    }).catch(error => {
        console.error('加载产品失败:', error);
        productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><p>加载失败，请重试</p></div>';
    });
}

// 创建活动推广计算页面的产品卡片
function createPromotionProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;
    
    // 计算各项指标
    const metrics = calculatePromotionMetrics(product);
    
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
            
            <!-- 可编辑的价格信息 -->
            <div class="editable-price-info">
                <div class="price-row">
                    <span class="price-label">进货价格:</span>
                    <span class="price-value cost-price">¥${product.costPrice || '0'}</span>
                    <button class="quick-edit-btn" data-field="costPrice">修改</button>
                </div>
                <div class="price-row">
                    <span class="price-label">申报价:</span>
                    <span class="price-value declare-price">¥${product.declarePrice || '0'}</span>
                    <button class="quick-edit-btn" data-field="declarePrice">修改</button>
                </div>
                <div class="price-row">
                    <span class="price-label">广告出价比例:</span>
                    <span class="price-value ad-ratio">${product.adBidRatio || '0'}</span>
                    <button class="quick-edit-btn" data-field="adBidRatio">修改</button>
                </div>
            </div>
            
            <!-- 活动价模块 -->
            <div class="activity-price-section">
                <div class="section-title">活动价（95折）</div>
                <div class="activity-price-details">
                    <div class="activity-price-row">
                        <span class="detail-label">卖价:</span>
                        <span class="detail-value sell-price">¥${metrics.sellPrice}</span>
                    </div>
                    <div class="activity-price-row">
                        <span class="detail-label">利润:</span>
                        <span class="detail-value profit ${metrics.profit >= 1 ? 'profit-positive' : 'profit-negative'}">¥${metrics.profit}</span>
                    </div>
                    <div class="activity-price-row">
                        <span class="detail-label">利润率:</span>
                        <span class="detail-value profit-rate ${metrics.profitRate >= 30 ? 'profit-rate-high' : 'profit-rate-low'}">${metrics.profitRate}%</span>
                    </div>
                </div>
            </div>
            
            <!-- 推广模块 -->
            <div class="promotion-section">
                <div class="section-title">推广</div>
                <div class="promotion-details">
                    <div class="promotion-row">
                        <span class="detail-label">广告扣费:</span>
                        <span class="detail-value ad-fee">¥${metrics.adFee}</span>
                    </div>
                    <div class="promotion-row">
                        <span class="detail-label">推广后利润:</span>
                        <span class="detail-value promotion-profit ${metrics.promotionProfit >= 0 ? 'profit-positive' : 'profit-negative'}">¥${metrics.promotionProfit}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 绑定事件
    card.querySelector('.copy-btn').addEventListener('click', () => copyProduct(product));
    card.querySelector('.edit-btn').addEventListener('click', () => editProduct(product));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteProductConfirm(product.id));
    
    // 绑定快速编辑事件
    const editButtons = card.querySelectorAll('.quick-edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const field = e.currentTarget.dataset.field;
            const currentValue = product[field];
            const newValue = prompt(`请输入新的${field === 'costPrice' ? '进货价格' : field === 'declarePrice' ? '申报价' : '广告出价比例'}:`, currentValue);
            
            if (newValue !== null) {
                const updatedProduct = {
                    ...product,
                    [field]: parseFloat(newValue) || 0,
                    updateTime: new Date().toISOString()
                };
                
                saveProduct(updatedProduct).then(() => {
                    // 更新UI
                    const priceValue = e.currentTarget.previousElementSibling;
                    if (field === 'costPrice' || field === 'declarePrice') {
                        priceValue.textContent = `¥${updatedProduct[field]}`;
                    } else {
                        priceValue.textContent = updatedProduct[field];
                    }
                    
                    // 重新计算并更新活动价格和推广信息
                    const updatedMetrics = calculatePromotionMetrics(updatedProduct);
                    updateProductCardMetrics(card, updatedMetrics);
                    
                    // 保存更新后的产品
                    product[field] = updatedProduct[field];
                }).catch(error => {
                    alert('更新失败: ' + error.message);
                });
            }
        });
    });
    
    return card;
}

// 更新产品卡片的计算指标
function updateProductCardMetrics(card, metrics) {
    // 更新活动价格模块
    card.querySelector('.sell-price').textContent = `¥${metrics.sellPrice}`;
    
    const profitElement = card.querySelector('.profit');
    profitElement.textContent = `¥${metrics.profit}`;
    if (metrics.profit >= 1) {
        profitElement.className = 'detail-value profit profit-positive';
    } else {
        profitElement.className = 'detail-value profit profit-negative';
    }
    
    const profitRateElement = card.querySelector('.profit-rate');
    profitRateElement.textContent = `${metrics.profitRate}%`;
    if (metrics.profitRate >= 30) {
        profitRateElement.className = 'detail-value profit-rate profit-rate-high';
    } else {
        profitRateElement.className = 'detail-value profit-rate profit-rate-low';
    }
    
    // 更新推广模块
    card.querySelector('.ad-fee').textContent = `¥${metrics.adFee}`;
    
    const promotionProfitElement = card.querySelector('.promotion-profit');
    promotionProfitElement.textContent = `¥${metrics.promotionProfit}`;
    if (metrics.promotionProfit >= 0) {
        promotionProfitElement.className = 'detail-value promotion-profit profit-positive';
    } else {
        promotionProfitElement.className = 'detail-value promotion-profit profit-negative';
    }
}

// 计算活动推广指标
function calculatePromotionMetrics(product) {
    const costPrice = parseFloat(product.costPrice) || 0;
    const declarePrice = parseFloat(product.declarePrice) || 0;
    const adBidRatio = parseFloat(product.adBidRatio) || 1;
    
    // 95折卖价
    const sellPrice = (declarePrice * 0.95).toFixed(2);
    
    // 利润
    const profit = (sellPrice - costPrice).toFixed(2);
    
    // 利润率
    const profitRate = sellPrice > 0 ? ((profit / sellPrice) * 100).toFixed(1) : '0.0';
    
    // 广告扣费
    const adFee = adBidRatio > 0 ? (declarePrice / adBidRatio).toFixed(2) : '0.00';
    
    // 推广后利润
    const promotionProfit = (declarePrice - parseFloat(adFee) - costPrice).toFixed(2);
    
    return {
        sellPrice,
        profit,
        profitRate,
        adFee,
        promotionProfit
    };
}

// 绑定页面事件
function bindPromotionEvents() {
    // 添加产品按钮
    document.querySelector('#promotion-calculation .add-product-btn').addEventListener('click', showAddProductModal);
    
    // 导出按钮
    document.getElementById('export-promotion-btn').addEventListener('click', exportPromotionProducts);
    
    // 导入按钮
    document.getElementById('import-promotion-btn').addEventListener('click', importProducts);
    
    // 搜索功能
    const searchBtn = document.querySelector('#promotion-calculation .search-row .btn-primary');
    const searchInput = document.querySelector('#promotion-calculation .search-input[placeholder="搜索产品名称、关键词..."]');
    
    searchBtn.addEventListener('click', () => {
        const keyword = searchInput.value.trim();
        if (keyword) {
            searchProductsByKeyword(keyword);
        } else {
            loadPromotionProducts();
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
    
    // 图片搜索
    const imgSearchBtn = document.querySelectorAll('#promotion-calculation .btn-primary')[1];
    imgSearchBtn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgSearchInput = document.querySelector('#promotion-calculation .img-search-input');
                    imgSearchInput.value = file.name;
                    alert('图片搜索功能需要更复杂的图像处理算法，这里仅作演示');
                };
                reader.readAsDataURL(file);
            }
        };
        fileInput.click();
    });
    
    // 排序功能
    const sortBtn = document.querySelector('#promotion-calculation .advanced-actions .btn:not(.btn-danger)');
    sortBtn.addEventListener('click', () => {
        const option = prompt('请选择排序方式:\n1. 利润降序\n2. 利润升序\n3. 推广后利润降序\n4. 推广后利润升序');
        
        switch (option) {
            case '1':
                sortPromotionProducts('profit', false);
                break;
            case '2':
                sortPromotionProducts('profit', true);
                break;
            case '3':
                sortPromotionProducts('promotionProfit', false);
                break;
            case '4':
                sortPromotionProducts('promotionProfit', true);
                break;
        }
    });
    
    // 批量删除
    const batchDeleteBtn = document.querySelector('#promotion-calculation .btn-danger');
    batchDeleteBtn.addEventListener('click', showBatchDeleteModal);
}

// 排序活动推广产品
function sortPromotionProducts(sortBy, ascending) {
    const productsGrid = document.querySelector('#promotion-calculation .products-grid');
    productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>排序中...</p></div>';
    
    getAllProducts().then(products => {
        // 计算每个产品的指标
        const productsWithMetrics = products.map(product => ({
            product,
            metrics: calculatePromotionMetrics(product)
        }));
        
        // 排序
        productsWithMetrics.sort((a, b) => {
            let aValue = parseFloat(a.metrics[sortBy]);
            let bValue = parseFloat(b.metrics[sortBy]);
            
            if (ascending) {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });
        
        // 显示排序后的产品
        productsGrid.innerHTML = '';
        productsWithMetrics.forEach(item => {
            const productCard = createPromotionProductCard(item.product);
            productsGrid.appendChild(productCard);
        });
    }).catch(error => {
        console.error('排序失败:', error);
        productsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><p>排序失败，请重试</p></div>';
    });
}

// 导出活动推广产品
function exportPromotionProducts() {
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
                const metrics = calculatePromotionMetrics(product);
                return {
                    '产品图片': product.image || '',
                    'SPU': product.spu || '',
                    'SKC': product.skc || '',
                    'SKU': product.sku || '',
                    '产品名称': product.name || '',
                    '进货价格': product.costPrice || 0,
                    '申报价': product.declarePrice || 0,
                    '广告出价比例': product.adBidRatio || 0,
                    '95折卖价': metrics.sellPrice,
                    '95折利润': metrics.profit,
                    '利润率': metrics.profitRate + '%',
                    '广告扣费': metrics.adFee,
                    '推广后利润': metrics.promotionProfit
                };
            });
            
            const ws = XLSX.utils.json_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, category);
        });
        
        // 导出为Excel文件
        XLSX.writeFile(wb, '活动推广数据_' + new Date().toLocaleDateString() + '.xlsx');
    }).catch(error => {
        alert('导出失败: ' + error.message);
    });
}