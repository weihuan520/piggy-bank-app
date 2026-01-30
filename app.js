// 常量配置
const STORAGE_KEY = 'transactions';
const MAX_NOTE_LENGTH = 50;
const TOAST_DURATION = 2000;
const ANIMATION_DURATION = 300;

// 数据存储
let transactions = [];
let currentFilter = 'all';

// 初始化数据
function initData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        transactions = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('数据加载失败:', error);
        transactions = [];
    }
}

// 分类配置
const categories = {
    income: [
        { id: 'salary', name: '工资', icon: '💼' },
        { id: 'bonus', name: '奖金', icon: '🎁' },
        { id: 'investment', name: '理财', icon: '📈' },
        { id: 'parttime', name: '兼职', icon: '💪' },
        { id: 'gift', name: '礼金', icon: '🧧' },
        { id: 'refund', name: '退款', icon: '↩️' },
        { id: 'other', name: '其他', icon: '💰' }
    ],
    expense: [
        { id: 'food', name: '餐饮', icon: '🍔' },
        { id: 'transport', name: '交通', icon: '🚗' },
        { id: 'shopping', name: '购物', icon: '🛍️' },
        { id: 'entertainment', name: '娱乐', icon: '🎮' },
        { id: 'medical', name: '医疗', icon: '💊' },
        { id: 'education', name: '教育', icon: '📚' },
        { id: 'housing', name: '住房', icon: '🏠' },
        { id: 'other', name: '其他', icon: '💸' }
    ]
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initData();
    updateDate();
    updateBalance();
    renderTransactions();
    setupForm();
    setupEventDelegation();
});

// 事件委托设置
function setupEventDelegation() {
    // 交易列表事件委托
    const transactionsList = document.getElementById('transactionsList');
    transactionsList.addEventListener('click', function(e) {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (id) {
                deleteTransaction(id);
            }
        }
    });
}

// 更新日期显示
function updateDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('zh-CN', options);
}

// 更新余额
function updateBalance() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;
    
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense);
    
    // 更新统计页面
    updateMonthlyStats();
}

// 格式化金额
function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '¥0.00';
    }
    return '¥' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// XSS防护：转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 渲染交易列表
function renderTransactions() {
    const list = document.getElementById('transactionsList');
    let filteredTransactions = [...transactions];
    
    // 按日期排序（最新的在前）
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 应用筛选
    if (currentFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === currentFilter);
    }
    
    if (filteredTransactions.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🐽</span>
                <p>还没有记账哦~</p>
                <p class="empty-hint">点击上方按钮开始记账吧！</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = filteredTransactions.map(t => {
        const category = getCategory(t.type, t.category);
        const amountClass = t.type === 'income' ? 'income' : 'expense';
        const amountPrefix = t.type === 'income' ? '+' : '-';
        const safeNote = escapeHtml(t.note || '无备注');
        const safeCategoryName = escapeHtml(category.name);
        
        return `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-icon ${amountClass}">
                    ${escapeHtml(category.icon)}
                </div>
                <div class="transaction-info">
                    <div class="transaction-category">${safeCategoryName}</div>
                    <div class="transaction-note">${safeNote}</div>
                </div>
                <div>
                    <div class="transaction-amount ${amountClass}">
                        ${amountPrefix}${formatCurrency(t.amount)}
                    </div>
                    <div class="transaction-date">${formatDate(t.date)}</div>
                </div>
                <button class="delete-btn" data-id="${t.id}" aria-label="删除">🗑️</button>
            </div>
        `;
    }).join('');
}

// 获取分类信息
function getCategory(type, categoryId) {
    const categoryList = categories[type] || [];
    return categoryList.find(c => c.id === categoryId) || { name: '未知', icon: '❓' };
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 打开弹窗
function openModal(type) {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const typeInput = document.getElementById('transactionType');
    
    typeInput.value = type;
    title.textContent = type === 'income' ? '记收入 💰' : '记支出 💸';
    
    renderCategories(type);
    
    // 设置默认日期为今天
    document.getElementById('date').valueAsDate = new Date();
    
    modal.classList.add('active');
}

// 关闭弹窗
function closeModal() {
    const modal = document.getElementById('modalOverlay');
    modal.classList.remove('active');
    
    // 重置表单
    document.getElementById('transactionForm').reset();
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// 渲染分类选项
function renderCategories(type) {
    const grid = document.getElementById('categoryGrid');
    const categoryList = categories[type] || [];
    
    grid.innerHTML = categoryList.map(cat => `
        <div class="category-item" data-category="${cat.id}" onclick="selectCategory(this)">
            <span class="category-icon">${cat.icon}</span>
            <span class="category-name">${cat.name}</span>
        </div>
    `).join('');
}

// 选择分类
function selectCategory(element) {
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
}

// 设置表单
function setupForm() {
    const form = document.getElementById('transactionForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        try {
            const type = document.getElementById('transactionType').value;
            const amountInput = document.getElementById('amount');
            const amount = parseFloat(amountInput.value);
            const category = document.querySelector('.category-item.selected');
            const note = document.getElementById('note').value.trim();
            const date = document.getElementById('date').value;
            
            // 验证输入
            if (!amount || amount <= 0) {
                showToast('请输入有效的金额！⚠️');
                amountInput.focus();
                return;
            }
            
            if (!category) {
                showToast('请选择分类！⚠️');
                return;
            }
            
            if (!date) {
                showToast('请选择日期！⚠️');
                return;
            }
            
            const transaction = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                type: type,
                amount: amount,
                category: category.dataset.category,
                note: note.substring(0, MAX_NOTE_LENGTH),
                date: date,
                createdAt: new Date().toISOString()
            };
            
            transactions.push(transaction);
            saveTransactions();
            
            updateBalance();
            renderTransactions();
            closeModal();
            
            // 显示成功提示
            showToast('记账成功！🎉');
        } catch (error) {
            console.error('保存记账失败:', error);
            showToast('保存失败，请重试！❌');
        }
    });
}

// 保存交易记录
function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
        console.error('保存数据失败:', error);
        showToast('数据保存失败！❌');
    }
}

// 删除交易记录
function deleteTransaction(id) {
    if (!id) return;
    
    if (confirm('确定要删除这条记录吗？')) {
        try {
            transactions = transactions.filter(t => t.id !== id);
            saveTransactions();
            updateBalance();
            renderTransactions();
            showToast('已删除 🗑️');
        } catch (error) {
            console.error('删除记录失败:', error);
            showToast('删除失败，请重试！❌');
        }
    }
}

// 切换筛选器
function toggleFilter() {
    const options = document.getElementById('filterOptions');
    const btn = document.querySelector('.filter-btn');
    
    if (options.style.display === 'none') {
        options.style.display = 'flex';
        btn.classList.add('active');
    } else {
        options.style.display = 'none';
        btn.classList.remove('active');
    }
}

// 筛选交易
function filterTransactions(filter) {
    currentFilter = filter;
    
    // 更新按钮状态
    document.querySelectorAll('.filter-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    // 更新筛选按钮文本
    const filterText = document.getElementById('filterText');
    const filterMap = {
        'all': '全部',
        'income': '收入',
        'expense': '支出'
    };
    filterText.textContent = filterMap[filter];
    
    renderTransactions();
    toggleFilter();
}

// 切换标签页
function switchTab(tab) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    
    // 显示对应页面
    if (tab === 'home') {
        // 首页已经在主容器中
    } else if (tab === 'stats') {
        document.getElementById('statsPage').style.display = 'block';
        updateMonthlyStats();
    } else if (tab === 'settings') {
        document.getElementById('settingsPage').style.display = 'block';
    }
}

// 更新月度统计
function updateMonthlyStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear && t.type === 'expense';
    });
    
    const monthlyExpense = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('monthlyExpense').textContent = formatCurrency(monthlyExpense);
    
    // 按分类统计
    const categoryStats = {};
    monthlyTransactions.forEach(t => {
        if (!categoryStats[t.category]) {
            categoryStats[t.category] = 0;
        }
        categoryStats[t.category] += t.amount;
    });
    
    // 渲染分类统计
    const statsContainer = document.getElementById('categoryStats');
    
    if (Object.keys(categoryStats).length === 0) {
        statsContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📈</span>
                <p>暂无数据</p>
            </div>
        `;
        return;
    }
    
    const sortedCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1] - a[1]);
    
    const maxAmount = sortedCategories[0][1];
    
    statsContainer.innerHTML = sortedCategories.map(([catId, amount]) => {
        const category = getCategory('expense', catId);
        const percentage = (amount / maxAmount) * 100;
        
        return `
            <div class="category-stat-item">
                <div class="category-stat-icon">${category.icon}</div>
                <div class="category-stat-info">
                    <div class="category-stat-name">${category.name}</div>
                    <div class="category-stat-bar">
                        <div class="category-stat-progress" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="category-stat-amount">${formatCurrency(amount)}</div>
            </div>
        `;
    }).join('');
}

// 清空所有数据
function clearAllData() {
    if (confirm('确定要清空所有记账数据吗？此操作不可恢复！')) {
        try {
            transactions = [];
            saveTransactions();
            updateBalance();
            renderTransactions();
            showToast('数据已清空 🗑️');
        } catch (error) {
            console.error('清空数据失败:', error);
            showToast('清空失败，请重试！❌');
        }
    }
}

// 导出数据
function exportData() {
    if (transactions.length === 0) {
        showToast('没有数据可导出！⚠️');
        return;
    }
    
    try {
        const dataStr = JSON.stringify(transactions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `记账数据_${new Date().toLocaleDateString('zh-CN')}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showToast('数据已导出 📥');
    } catch (error) {
        console.error('导出数据失败:', error);
        showToast('导出失败，请重试！❌');
    }
}

// 显示提示
function showToast(message) {
    // 移除旧的toast
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // TOAST_DURATION后移除
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, ANIMATION_DURATION);
    }, TOAST_DURATION);
}

// 更新备注字数统计
function updateNoteCount(input) {
    const count = input.value.length;
    const countElement = input.parentElement.querySelector('.note-count');
    if (countElement) {
        countElement.textContent = `(${count}/${MAX_NOTE_LENGTH})`;
    }
}
