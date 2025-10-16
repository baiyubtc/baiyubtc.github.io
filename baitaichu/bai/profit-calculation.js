// 利润计算页面初始化函数
function initProfitCalculation() {
    console.log('初始化利润计算页面');
    bindProfitEvents();
}

// 绑定页面事件
function bindProfitEvents() {
    // 导入Excel按钮
    document.getElementById('import-profit-btn').addEventListener('click', importProfitExcel);
    
    // 导出结果按钮 (初始状态禁用)
    const exportResultBtn = document.getElementById('export-result-btn');
    exportResultBtn.disabled = true;
    exportResultBtn.addEventListener('click', exportCalculationResult);
    
    // 清空结果按钮
    document.getElementById('clear-result-btn').addEventListener('click', clearCalculationResult);
}

// 导入Excel进行利润计算
function importProfitExcel() {
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
                    
                    // 获取第一个工作表
                    const firstSheetName = wb.SheetNames[0];
                    const ws = wb.Sheets[firstSheetName];
                    
                    // 转换为JSON数据
                    const jsonData = XLSX.utils.sheet_to_json(ws);
                    
                    if (jsonData.length === 0) {
                        alert('Excel文件内容为空');
                        return;
                    }
                    
                    // 检查是否有SKU列
                    const hasSKUColumn = Object.keys(jsonData[0]).some(key => 
                        key.toLowerCase().includes('sku') || 
                        key.includes('SKU')
                    );
                    
                    if (!hasSKUColumn) {
                        alert('Excel文件中未找到SKU列，请确保包含SKU信息');
                        return;
                    }
                    
                    // 检查是否有收入金额列
                    const hasRevenueColumn = Object.keys(jsonData[0]).some(key => 
                        key.toLowerCase().includes('收入') || 
                        key.toLowerCase().includes('revenue') ||
                        key.includes('金额')
                    );
                    
                    if (!hasRevenueColumn) {
                        alert('Excel文件中未找到收入金额列，请确保包含收入信息');
                        return;
                    }
                    
                    // 显示加载中状态
                    showLoadingState();
                    
                    // 获取所有产品数据用于匹配SKU
                    getAllProducts().then(products => {
                        // 创建SKU到成本的映射
                        const skuToCost = new Map();
                        products.forEach(product => {
                            if (product.sku) {
                                skuToCost.set(product.sku.toUpperCase(), parseFloat(product.costPrice) || 0);
                            }
                        });
                        
                        // 处理数据，添加成本和利润列
                        const processedData = processExcelData(jsonData, skuToCost);
                        
                        // 显示处理结果
                        displayCalculationResult(processedData);
                        
                        // 启用导出按钮
                        document.getElementById('export-result-btn').disabled = false;
                        
                        // 存储处理后的数据供导出使用
                        window.processedExcelData = processedData;
                        window.originalWorkbook = wb;
                        window.originalSheetName = firstSheetName;
                        
                    }).catch(error => {
                        alert('获取产品数据失败: ' + error.message);
                        showEmptyState();
                    });
                    
                } catch (error) {
                    alert('导入失败: ' + error.message);
                    showEmptyState();
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };
    fileInput.click();
}

// 处理Excel数据，添加成本和利润列
function processExcelData(jsonData, skuToCost) {
    // 查找SKU列和收入金额列
    let skuColumn = '';
    let revenueColumn = '';
    
    const firstRow = jsonData[0];
    Object.keys(firstRow).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (!skuColumn && (lowerKey.includes('sku') || key.includes('SKU'))) {
            skuColumn = key;
        }
        if (!revenueColumn && (lowerKey.includes('收入') || lowerKey.includes('revenue') || key.includes('金额'))) {
            revenueColumn = key;
        }
    });
    
    // 处理每一行数据
    let totalCost = 0;
    let totalProfit = 0;
    let totalRevenue = 0;
    
    const processedData = jsonData.map(row => {
        // 获取SKU并匹配成本
        const sku = row[skuColumn] ? row[skuColumn].toString().toUpperCase() : '';
        const cost = skuToCost.get(sku) || 0;
        
        // 获取收入金额
        const revenue = parseFloat(row[revenueColumn]) || 0;
        
        // 计算利润
        const profit = revenue - cost;
        
        // 更新总计
        totalCost += cost;
        totalProfit += profit;
        totalRevenue += revenue;
        
        // 返回包含新增列的行数据
        return {
            ...row,
            '成本': cost,
            '利润': profit
        };
    });
    
    // 添加汇总行
    const summaryRow = {
        [skuColumn]: '总计',
        [revenueColumn]: totalRevenue,
        '成本': totalCost,
        '利润': totalProfit
    };
    
    // 添加总计信息（这些信息不会显示在表格中，但会用于导出）
    processedData.summary = {
        totalCost,
        totalProfit,
        totalRevenue
    };
    
    return processedData;
}

// 显示计算结果
function displayCalculationResult(data) {
    const resultContainer = document.getElementById('calculation-result');
    
    // 清空容器
    resultContainer.innerHTML = '';
    
    // 创建表格
    const table = document.createElement('table');
    table.className = 'result-table';
    
    // 获取所有列名
    const columns = Object.keys(data[0]).filter(key => key !== 'summary');
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 创建表格内容
    const tbody = document.createElement('tbody');
    data.slice(0, 100).forEach((row, index) => {  // 限制最多显示100行
        const tr = document.createElement('tr');
        if (row[columns[0]] === '总计') {
            tr.className = 'summary-row';
        }
        
        columns.forEach(col => {
            const td = document.createElement('td');
            
            // 如果是数字类型且不是SKU列，格式化显示
            if (col === '成本' || col === '利润') {
                td.textContent = row[col].toFixed(2);
                if (col === '利润') {
                    td.className = row[col] >= 0 ? 'positive-profit' : 'negative-profit';
                }
            } else {
                td.textContent = row[col];
            }
            
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    // 添加表格到容器
    resultContainer.appendChild(table);
    
    // 显示汇总信息
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'summary-stats';
    
    const summary = data.summary || {};
    summaryContainer.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">总成本:</span>
            <span class="summary-value">¥${summary.totalCost.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">总利润:</span>
            <span class="summary-value ${summary.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">¥${summary.totalProfit.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">总收入:</span>
            <span class="summary-value">¥${summary.totalRevenue.toFixed(2)}</span>
        </div>
    `;
    
    resultContainer.appendChild(summaryContainer);
    
    // 如果数据超过100行，显示提示
    if (data.length > 100) {
        const notice = document.createElement('div');
        notice.className = 'data-notice';
        notice.textContent = `仅显示前100行数据，共${data.length}行`;
        resultContainer.appendChild(notice);
    }
}

// 导出计算结果
function exportCalculationResult() {
    if (!window.processedExcelData) {
        alert('没有可导出的数据');
        return;
    }
    
    try {
        // 获取原始工作簿
        const wb = window.originalWorkbook;
        const sheetName = window.originalSheetName;
        
        // 准备导出数据（去除summary属性）
        const exportData = window.processedExcelData.map(row => {
            const newRow = { ...row };
            delete newRow.summary;
            return newRow;
        });
        
        // 创建新的工作表
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // 替换原始工作表
        wb.Sheets[sheetName] = ws;
        
        // 导出为Excel文件
        XLSX.writeFile(wb, '利润计算结果_' + new Date().toLocaleDateString() + '.xlsx');
        
        alert('导出成功！');
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

// 清空计算结果
function clearCalculationResult() {
    const resultContainer = document.getElementById('calculation-result');
    resultContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>请导入Excel文件进行利润计算</p></div>';
    
    // 禁用导出按钮
    document.getElementById('export-result-btn').disabled = true;
    
    // 清空存储的数据
    window.processedExcelData = null;
    window.originalWorkbook = null;
    window.originalSheetName = null;
}

// 显示加载状态
function showLoadingState() {
    const resultContainer = document.getElementById('calculation-result');
    resultContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>计算中...</p></div>';
}

// 显示空状态
function showEmptyState() {
    const resultContainer = document.getElementById('calculation-result');
    resultContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>请导入Excel文件进行利润计算</p></div>';
}

// 辅助函数：计算产品基础指标
function calculateProductMetrics(product) {
    const declarePrice = parseFloat(product.declarePrice) || 0;
    const costPrice = parseFloat(product.costPrice) || 0;
    const adBidRatio = parseFloat(product.adBidRatio) || 1;
    
    // 广告扣费
    const adFee = adBidRatio > 0 ? (declarePrice / adBidRatio).toFixed(2) : '0.00';
    
    // 推广后利润
    const promotionProfit = (declarePrice - parseFloat(adFee) - costPrice).toFixed(2);
    
    return {
        adFee,
        promotionProfit
    };
}