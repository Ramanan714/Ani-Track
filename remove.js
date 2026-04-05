class RemoveManager {
    static currentUser = null;
    static items = [];
    static categories = [];
    static currentMode = 'items';
    static selectedItems = new Set();
    static selectedCategories = new Set();
    static pendingAction = null;
    static pendingBulkAction = null;

    static init() {
        console.log('🚀 [REMOVE] Initializing Remove Page...');
        
        // Check if user is logged in
        if (!this.checkUserLoggedIn()) {
            return;
        }
        
        this.loadUserData();
        this.setupEventListeners();
        this.setupTimeAndGreeting();
        this.loadUserSettings();
        this.renderItems();
        this.renderCategories();
        this.updateStats();
        this.updateSelectionCounts();
        
        console.log('✅ [REMOVE] Remove Page initialized for user:', this.currentUser?.name);
    }

    static checkUserLoggedIn() {
        // Try to get current user from StorageManager
        let currentUser = null;
        if (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) {
            currentUser = StorageManager.getCurrentUser();
        }
        
        const profile = JSON.parse(localStorage.getItem('anime_tracker_profile') || '{}');
        const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
        
        if ((!currentUser && !profile.id) || !isLoggedIn) {
            console.log('⚠️ [REMOVE] No logged-in user detected, redirecting to login...');
            this.showNotification('Please login to continue', 'info', 2000);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }
        
        this.currentUser = currentUser || {
            id: profile.id,
            identifier: profile.identifier,
            name: profile.name
        };
        
        console.log('✅ [REMOVE] User logged in:', this.currentUser?.name);
        return true;
    }

    static loadUserData() {
        // Load items
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            this.items = StorageManager.getActivities();
        } else {
            const storageKey = `user_data_${this.currentUser?.id}`;
            this.items = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
        
        // Load categories
        const categoriesSet = new Set();
        this.items.forEach(item => {
            if (item.type) categoriesSet.add(item.type);
        });
        
        // Add default categories if they exist in items
        const defaultCategories = ['anime', 'series', 'manga', 'manwha', 'manhua'];
        defaultCategories.forEach(cat => {
            if (this.items.some(item => item.type === cat)) {
                categoriesSet.add(cat);
            }
        });
        
        this.categories = Array.from(categoriesSet);
        
        console.log(`📊 [REMOVE] Loaded ${this.items.length} items and ${this.categories.length} categories`);
    }

    static setupTimeAndGreeting() {
        const updateTime = () => {
            const now = new Date();
            
            const dateEl = document.getElementById('currentDate');
            const timeEl = document.getElementById('currentTime');
            const greetingEl = document.getElementById('greetingTime');
            const userNameEl = document.getElementById('userName');
            
            if (dateEl) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                dateEl.textContent = now.toLocaleDateString('en-US', options);
            }
            
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            }
            
            if (greetingEl) {
                const hour = now.getHours();
                let greeting = 'Good Morning';
                if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
                else if (hour >= 17 && hour < 21) greeting = 'Good Evening';
                else if (hour >= 21 || hour < 5) greeting = 'Good Night';
                greetingEl.textContent = `${greeting},`;
            }
            
            if (userNameEl && this.currentUser) {
                userNameEl.textContent = this.currentUser.name;
            }
        };
        
        updateTime();
        setInterval(updateTime, 60000);
        
        // Load avatar
        this.loadAvatar();
    }

    static loadAvatar() {
        const avatarKey = `user_avatar_${this.currentUser?.id}`;
        const savedAvatar = localStorage.getItem(avatarKey);
        const avatarImg = document.getElementById('avatarImage');
        
        if (avatarImg) {
            if (savedAvatar && savedAvatar !== 'null' && savedAvatar !== 'undefined') {
                avatarImg.src = savedAvatar;
            } else {
                const name = this.currentUser?.name || 'User';
                const initials = name.charAt(0).toUpperCase();
                avatarImg.src = `https://ui-avatars.com/api/?name=${initials}&background=3498db&color=fff&size=60`;
            }
        }
    }

    static setupEventListeners() {
        // Side panel toggles
        const menuToggle = document.getElementById('menuToggle');
        const settingsToggle = document.getElementById('settingsToggle');
        const closeMenu = document.getElementById('closeMenu');
        const closeSettings = document.getElementById('closeSettings');
        const overlay = document.getElementById('overlay');
        
        if (menuToggle) menuToggle.addEventListener('click', () => this.toggleSidePanel('menuPanel'));
        if (settingsToggle) settingsToggle.addEventListener('click', () => this.toggleSidePanel('settingsPanel'));
        if (closeMenu) closeMenu.addEventListener('click', () => this.closeSidePanel('menuPanel'));
        if (closeSettings) closeSettings.addEventListener('click', () => this.closeSidePanel('settingsPanel'));
        if (overlay) overlay.addEventListener('click', () => this.closeAllPanels());

        // Mode toggle
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
        });

        // Items controls
        const selectAllItems = document.getElementById('selectAllItems');
        const deselectAllItems = document.getElementById('deselectAllItems');
        const deleteSelectedItems = document.getElementById('deleteSelectedItems');
        
        if (selectAllItems) selectAllItems.addEventListener('click', () => this.selectAllItems());
        if (deselectAllItems) deselectAllItems.addEventListener('click', () => this.deselectAllItems());
        if (deleteSelectedItems) deleteSelectedItems.addEventListener('click', () => this.confirmBulkDelete('items'));

        // Categories controls
        const selectAllCategories = document.getElementById('selectAllCategories');
        const deselectAllCategories = document.getElementById('deselectAllCategories');
        const deleteSelectedCategories = document.getElementById('deleteSelectedCategories');
        
        if (selectAllCategories) selectAllCategories.addEventListener('click', () => this.selectAllCategories());
        if (deselectAllCategories) deselectAllCategories.addEventListener('click', () => this.deselectAllCategories());
        if (deleteSelectedCategories) deleteSelectedCategories.addEventListener('click', () => this.confirmBulkDelete('categories'));

        // Search and filters
        const searchItems = document.getElementById('searchItems');
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const searchCategories = document.getElementById('searchCategories');
        
        if (searchItems) searchItems.addEventListener('input', () => this.renderItems());
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.renderItems());
        if (statusFilter) statusFilter.addEventListener('change', () => this.renderItems());
        if (searchCategories) searchCategories.addEventListener('input', () => this.renderCategories());

        // Bottom actions
        const closePageBtn = document.getElementById('closePageBtn');
        const goToAddPageBtn = document.getElementById('goToAddPageBtn');
        
        if (closePageBtn) closePageBtn.addEventListener('click', () => window.location.href = 'index.html');
        if (goToAddPageBtn) goToAddPageBtn.addEventListener('click', () => window.location.href = 'add.html');

        // Settings
        const themeSelector = document.getElementById('themeSelector');
        const exportBtn = document.getElementById('exportData');
        const importBtn = document.getElementById('importData');
        const resetBtn = document.getElementById('resetSettings');
        const fileImport = document.getElementById('fileImport');
        
        if (themeSelector) themeSelector.addEventListener('change', (e) => this.setTheme(e.target.value));
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
        if (importBtn) importBtn.addEventListener('click', () => fileImport.click());
        if (fileImport) fileImport.addEventListener('change', (e) => this.importData(e.target.files[0]));
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetSettings());

        // Modal close buttons
        const closeConfirmModal = document.getElementById('closeConfirmModal');
        const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
        const confirmActionBtn = document.getElementById('confirmActionBtn');
        const closeBulkConfirmModal = document.getElementById('closeBulkConfirmModal');
        const bulkCancelConfirmBtn = document.getElementById('bulkCancelConfirmBtn');
        const bulkConfirmActionBtn = document.getElementById('bulkConfirmActionBtn');
        
        if (closeConfirmModal) closeConfirmModal.addEventListener('click', () => this.closeConfirmModal());
        if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', () => this.closeConfirmModal());
        if (confirmActionBtn) confirmActionBtn.addEventListener('click', () => this.executePendingAction());
        if (closeBulkConfirmModal) closeBulkConfirmModal.addEventListener('click', () => this.closeBulkConfirmModal());
        if (bulkCancelConfirmBtn) bulkCancelConfirmBtn.addEventListener('click', () => this.closeBulkConfirmModal());
        if (bulkConfirmActionBtn) bulkConfirmActionBtn.addEventListener('click', () => this.executeBulkDelete());

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeConfirmModal();
                this.closeBulkConfirmModal();
                this.closeAllPanels();
            }
        });
    }

    static toggleSidePanel(panelId) {
        const panel = document.getElementById(panelId);
        const overlay = document.getElementById('overlay');
        if (panel) {
            panel.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            document.body.style.overflow = panel.classList.contains('active') ? 'hidden' : '';
        }
    }

    static closeSidePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.remove('active');
        const overlay = document.getElementById('overlay');
        if (!document.querySelector('.side-panel.active') && overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    static closeAllPanels() {
        document.querySelectorAll('.side-panel').forEach(panel => panel.classList.remove('active'));
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    static switchMode(mode) {
        this.currentMode = mode;
        
        // Update button states
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Show/hide mode content
        const itemsMode = document.getElementById('itemsMode');
        const categoriesMode = document.getElementById('categoriesMode');
        
        if (mode === 'items') {
            if (itemsMode) itemsMode.style.display = 'block';
            if (categoriesMode) categoriesMode.style.display = 'none';
            this.renderItems();
        } else {
            if (itemsMode) itemsMode.style.display = 'none';
            if (categoriesMode) categoriesMode.style.display = 'block';
            this.renderCategories();
        }
    }

    static updateStats() {
        const totalItems = this.items.length;
        const totalCategories = this.categories.length;
        
        const totalItemsEl = document.getElementById('totalItems');
        const totalCategoriesEl = document.getElementById('totalCategories');
        
        if (totalItemsEl) totalItemsEl.textContent = totalItems;
        if (totalCategoriesEl) totalCategoriesEl.textContent = totalCategories;
        
        // Update filter dropdowns
        this.updateFilters();
    }

    static updateFilters() {
        // Update category filter dropdown
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            const categories = ['all', ...this.categories];
            const currentValue = categoryFilter.value;
            categoryFilter.innerHTML = categories.map(cat => 
                `<option value="${cat}">${cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`
            ).join('');
            if (currentValue) categoryFilter.value = currentValue;
        }
    }

    static updateSelectionCounts() {
        const itemsSelected = this.selectedItems.size;
        const categoriesSelected = this.selectedCategories.size;
        
        const itemsCountEl = document.getElementById('itemsSelectionCount');
        const categoriesCountEl = document.getElementById('categoriesSelectionCount');
        
        if (itemsCountEl) itemsCountEl.textContent = `${itemsSelected} selected out of ${this.items.length} items`;
        if (categoriesCountEl) categoriesCountEl.textContent = `${categoriesSelected} selected out of ${this.categories.length} categories`;
    }

    static renderItems() {
        const container = document.getElementById('itemsContainer');
        const emptyState = document.getElementById('itemsEmptyState');
        
        if (!container) return;
        
        // Apply filters
        const searchTerm = document.getElementById('searchItems')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        
        let filteredItems = this.items.filter(item => {
            const matchesSearch = searchTerm === '' || item.title.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || item.type === categoryFilter;
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchesSearch && matchesCategory && matchesStatus;
        });
        
        if (filteredItems.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = filteredItems.map(item => `
            <div class="item-card ${this.selectedItems.has(item.id) ? 'selected' : ''}" data-item-id="${item.id}">
                <div class="item-card-header">
                    <span class="item-title">${this.escapeHtml(item.title)}</span>
                    <span class="item-type" style="background: ${this.getCategoryColor(item.type)}">${item.type.toUpperCase()}</span>
                </div>
                <div class="item-status status-${item.status?.replace('-', '') || 'unknown'}">
                    ${this.formatStatus(item.status)}
                </div>
                <div class="item-card-actions">
                    <button class="select-item-btn ${this.selectedItems.has(item.id) ? 'selected' : ''}" data-item-id="${item.id}">
                        <i class="fas ${this.selectedItems.has(item.id) ? 'fa-check-circle' : 'fa-circle'}"></i>
                        ${this.selectedItems.has(item.id) ? 'Selected' : 'Select'}
                    </button>
                    <button class="delete-item-btn" data-item-id="${item.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to item buttons
        document.querySelectorAll('.select-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.dataset.itemId;
                this.toggleSelectItem(itemId);
            });
        });
        
        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.dataset.itemId;
                this.confirmDeleteItem(itemId);
            });
        });
    }

    static renderCategories() {
        const container = document.getElementById('categoriesContainer');
        const emptyState = document.getElementById('categoriesEmptyState');
        
        if (!container) return;
        
        const searchTerm = document.getElementById('searchCategories')?.value.toLowerCase() || '';
        
        let filteredCategories = this.categories.filter(cat => 
            searchTerm === '' || cat.toLowerCase().includes(searchTerm)
        );
        
        if (filteredCategories.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = filteredCategories.map(category => `
            <div class="category-card ${this.selectedCategories.has(category) ? 'selected' : ''}" data-category="${category}">
                <div class="category-name">
                    <div class="category-color" style="background: ${this.getCategoryColor(category)}"></div>
                    <span>${this.escapeHtml(category)}</span>
                </div>
                <div class="category-actions">
                    <button class="select-category-btn ${this.selectedCategories.has(category) ? 'selected' : ''}" data-category="${category}">
                        <i class="fas ${this.selectedCategories.has(category) ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <button class="delete-category-btn" data-category="${category}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to category buttons
        document.querySelectorAll('.select-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = btn.dataset.category;
                this.toggleSelectCategory(category);
            });
        });
        
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = btn.dataset.category;
                this.confirmDeleteCategory(category);
            });
        });
    }

    static toggleSelectItem(itemId) {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
        } else {
            this.selectedItems.add(itemId);
        }
        this.renderItems();
        this.updateSelectionCounts();
    }

    static toggleSelectCategory(category) {
        if (this.selectedCategories.has(category)) {
            this.selectedCategories.delete(category);
        } else {
            this.selectedCategories.add(category);
        }
        this.renderCategories();
        this.updateSelectionCounts();
    }

    static selectAllItems() {
        const searchTerm = document.getElementById('searchItems')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        
        const filteredItems = this.items.filter(item => {
            const matchesSearch = searchTerm === '' || item.title.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || item.type === categoryFilter;
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchesSearch && matchesCategory && matchesStatus;
        });
        
        filteredItems.forEach(item => this.selectedItems.add(item.id));
        this.renderItems();
        this.updateSelectionCounts();
        this.showNotification(`${filteredItems.length} items selected`, 'info', 1500);
    }

    static deselectAllItems() {
        this.selectedItems.clear();
        this.renderItems();
        this.updateSelectionCounts();
        this.showNotification('All items deselected', 'info', 1500);
    }

    static selectAllCategories() {
        const searchTerm = document.getElementById('searchCategories')?.value.toLowerCase() || '';
        const filteredCategories = this.categories.filter(cat => 
            searchTerm === '' || cat.toLowerCase().includes(searchTerm)
        );
        
        filteredCategories.forEach(cat => this.selectedCategories.add(cat));
        this.renderCategories();
        this.updateSelectionCounts();
        this.showNotification(`${filteredCategories.length} categories selected`, 'info', 1500);
    }

    static deselectAllCategories() {
        this.selectedCategories.clear();
        this.renderCategories();
        this.updateSelectionCounts();
        this.showNotification('All categories deselected', 'info', 1500);
    }

    static confirmDeleteItem(itemId) {
        this.pendingAction = { type: 'item', id: itemId };
        document.getElementById('confirmMessage').innerHTML = 'Are you sure you want to delete this item?';
        document.getElementById('confirmModal').classList.add('active');
    }

    static confirmDeleteCategory(category) {
        // Check if category has items
        const itemsWithCategory = this.items.filter(item => item.type === category);
        let message = `Are you sure you want to delete category "${category}"?`;
        if (itemsWithCategory.length > 0) {
            message += `<br><br><span style="color: #e74c3c;">Warning: ${itemsWithCategory.length} item(s) will become uncategorized!</span>`;
        }
        
        this.pendingAction = { type: 'category', name: category };
        document.getElementById('confirmMessage').innerHTML = message;
        document.getElementById('confirmModal').classList.add('active');
    }

    static confirmBulkDelete(type) {
        const count = type === 'items' ? this.selectedItems.size : this.selectedCategories.size;
        if (count === 0) {
            this.showNotification('No items selected', 'error');
            return;
        }
        
        this.pendingBulkAction = { type: type };
        document.getElementById('bulkConfirmMessage').innerHTML = `Are you sure you want to delete ${count} selected ${type}?`;
        document.getElementById('bulkConfirmModal').classList.add('active');
    }

    static executePendingAction() {
        if (!this.pendingAction) return;
        
        if (this.pendingAction.type === 'item') {
            this.deleteItem(this.pendingAction.id);
        } else if (this.pendingAction.type === 'category') {
            this.deleteCategory(this.pendingAction.name);
        }
        
        this.closeConfirmModal();
        this.pendingAction = null;
    }

    static deleteItem(itemId) {
        // Remove from items array
        this.items = this.items.filter(item => item.id !== itemId);
        this.selectedItems.delete(itemId);
        
        // Save to storage
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(this.items));
        
        // Update UI
        this.renderItems();
        this.updateStats();
        this.updateSelectionCounts();
        this.showNotification('Item deleted successfully', 'success');
        
        console.log(`🗑️ [REMOVE] Item deleted: ${itemId}`);
    }

    static deleteCategory(category) {
        // Update items with this category to 'uncategorized'
        this.items = this.items.map(item => {
            if (item.type === category) {
                return { ...item, type: 'uncategorized' };
            }
            return item;
        });
        
        // Remove from categories list
        this.categories = this.categories.filter(c => c !== category);
        this.selectedCategories.delete(category);
        
        // Save to storage
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(this.items));
        
        // Update UI
        this.renderItems();
        this.renderCategories();
        this.updateStats();
        this.updateFilters();
        this.updateSelectionCounts();
        this.showNotification(`Category "${category}" deleted`, 'success');
        
        console.log(`🗑️ [REMOVE] Category deleted: ${category}`);
    }

    static executeBulkDelete() {
        if (!this.pendingBulkAction) return;
        
        if (this.pendingBulkAction.type === 'items') {
            this.bulkDeleteItems();
        } else if (this.pendingBulkAction.type === 'categories') {
            this.bulkDeleteCategories();
        }
        
        this.closeBulkConfirmModal();
        this.pendingBulkAction = null;
    }

    static bulkDeleteItems() {
        const itemsToDelete = Array.from(this.selectedItems);
        const deletedCount = itemsToDelete.length;
        
        this.items = this.items.filter(item => !this.selectedItems.has(item.id));
        this.selectedItems.clear();
        
        // Save to storage
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(this.items));
        
        // Update UI
        this.renderItems();
        this.updateStats();
        this.updateSelectionCounts();
        this.showNotification(`${deletedCount} items deleted successfully`, 'success');
        
        console.log(`🗑️ [REMOVE] Bulk deleted ${deletedCount} items`);
    }

    static bulkDeleteCategories() {
        const categoriesToDelete = Array.from(this.selectedCategories);
        const deletedCount = categoriesToDelete.length;
        
        // Update items with these categories to 'uncategorized'
        this.items = this.items.map(item => {
            if (categoriesToDelete.includes(item.type)) {
                return { ...item, type: 'uncategorized' };
            }
            return item;
        });
        
        // Remove from categories list
        this.categories = this.categories.filter(c => !categoriesToDelete.includes(c));
        this.selectedCategories.clear();
        
        // Save to storage
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(this.items));
        
        // Update UI
        this.renderItems();
        this.renderCategories();
        this.updateStats();
        this.updateFilters();
        this.updateSelectionCounts();
        this.showNotification(`${deletedCount} categories deleted successfully`, 'success');
        
        console.log(`🗑️ [REMOVE] Bulk deleted ${deletedCount} categories`);
    }

    static getCategoryColor(category) {
        if (typeof StorageManager !== 'undefined' && StorageManager.getCategoryColor) {
            return StorageManager.getCategoryColor(category, this.currentUser?.id);
        }
        const colors = {
            anime: '#3498db',
            series: '#9b59b6',
            manga: '#e74c3c',
            manwha: '#f39c12',
            manhua: '#1abc9c'
        };
        return colors[category] || '#3498db';
    }

    static formatStatus(status) {
        const statusMap = {
            'watching': 'Watching/Reading',
            'completed': 'Completed',
            'on-hold': 'On Hold',
            'dropped': 'Dropped',
            'plan-to-watch': 'Plan to Watch'
        };
        return statusMap[status] || status || 'Unknown';
    }

    static closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
    }

    static closeBulkConfirmModal() {
        document.getElementById('bulkConfirmModal').classList.remove('active');
    }

    static setTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        if (typeof ThemeManager !== 'undefined' && ThemeManager.setTheme) {
            ThemeManager.setTheme(theme);
        }
        localStorage.setItem('preferredTheme', theme);
    }

    static loadUserSettings() {
        const settings = JSON.parse(localStorage.getItem('anime_tracker_settings') || '{}');
        const themeSelector = document.getElementById('themeSelector');
if (themeSelector) {
    // Set current value from saved theme
    const currentTheme = ThemeManager.getSavedTheme();
    themeSelector.value = currentTheme;
    
    themeSelector.addEventListener('change', (e) => {
        const newTheme = e.target.value;
        console.log(`🎨 [THEME] User changed theme to: ${newTheme} (${ThemeManager.THEME_NAMES[newTheme]})`);
        ThemeManager.setTheme(newTheme);
        
        // Show notification
        this.showNotification(`Theme changed to ${ThemeManager.THEME_DISPLAY[newTheme]}`, 'success', 1500);
    });
}
    }

    static exportData() {
    console.log('📦 [EXPORT] Starting data export...');
    
    // Get current user
    const currentUser = StorageManager.getCurrentUser();
    const profile = StorageManager.getProfile();
    
    if (!currentUser && !profile.id) {
        this.showNotification('No user logged in', 'error');
        return;
    }
    
    const userId = currentUser?.id || profile.id;
    const userIdentifier = currentUser?.identifier || profile.identifier;
    const userName = currentUser?.name || profile.name;
    
    console.log(`👤 [EXPORT] Exporting data for user: ${userName} (${userIdentifier})`);
    
    // Get all user activities
    let activities = [];
    if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
        activities = StorageManager.getActivities();
    } else {
        const storageKey = `user_data_${userId}`;
        activities = JSON.parse(localStorage.getItem(storageKey) || '[]');
    }
    
    // Separate items by status
    const wishlistItems = activities.filter(item => item.status === 'plan-to-watch');
    const favoriteItems = activities.filter(item => item.isFavorite === true);
    const activeItems = activities.filter(item => item.status !== 'plan-to-watch');
    
    // Get user avatar
    const avatarKey = `user_avatar_${userId}`;
    const avatar = localStorage.getItem(avatarKey);
    
    // Get user categories
    let categories = [];
    if (typeof StorageManager !== 'undefined' && StorageManager.getCategories) {
        categories = StorageManager.getCategories();
    } else {
        const colorsKey = `user_category_colors_${userId}`;
        const categoryColors = JSON.parse(localStorage.getItem(colorsKey) || '{}');
        categories = Object.keys(categoryColors);
    }
    
    // Get category colors
    const categoryColors = {};
    categories.forEach(cat => {
        if (typeof StorageManager !== 'undefined' && StorageManager.getCategoryColor) {
            categoryColors[cat] = StorageManager.getCategoryColor(cat, userId);
        } else {
            const colorsKey = `user_category_colors_${userId}`;
            const colors = JSON.parse(localStorage.getItem(colorsKey) || '{}');
            categoryColors[cat] = colors[cat] || '#3498db';
        }
    });
    
    // Get user settings
    const settings = JSON.parse(localStorage.getItem('anime_tracker_settings') || '{}');
    
    // Get user theme
    const userTheme = localStorage.getItem(`user_theme_${userId}`) || localStorage.getItem('preferredTheme') || 'system';
    
    // Compile all data
    const exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        user: {
            id: userId,
            identifier: userIdentifier,
            name: userName,
            loginDate: profile.loginDate,
            createdAt: profile.createdAt || profile.loginDate
        },
        stats: {
            totalItems: activities.length,
            totalWishlist: wishlistItems.length,
            totalFavorites: favoriteItems.length,
            totalCategories: categories.length
        },
        data: {
            activities: activities,
            wishlist: wishlistItems,
            favorites: favoriteItems,
            activeItems: activeItems,
            categories: categories,
            categoryColors: categoryColors,
            settings: settings,
            theme: userTheme
        }
    };
    
    // Add avatar if exists
    if (avatar && avatar !== 'null' && avatar !== 'undefined') {
        exportData.user.avatar = avatar;
    }
    
    console.log('📊 [EXPORT] Export data summary:', {
        totalItems: activities.length,
        wishlist: wishlistItems.length,
        favorites: favoriteItems.length,
        categories: categories.length,
        exportSize: JSON.stringify(exportData).length + ' bytes'
    });
    
    // Create and download file
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anime-tracker-backup-${userIdentifier || userId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ [EXPORT] Data exported successfully!');
    this.showNotification(`Exported ${activities.length} items, ${categories.length} categories`, 'success', 3000);
    
    // Return export data for debugging
    return exportData;
}

    static importData(file) {
    console.log('📥 [IMPORT] Starting data import...');
    
    if (!file) {
        this.showNotification('No file selected', 'error');
        return;
    }
    
    // Check file type
    if (!file.name.endsWith('.json')) {
        this.showNotification('Please select a JSON file', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const importData = JSON.parse(e.target.result);
            console.log('📥 [IMPORT] File loaded:', importData);
            
            // Validate file structure
            if (!importData.version || !importData.user || !importData.data) {
                throw new Error('Invalid backup file format');
            }
            
            const currentUser = StorageManager.getCurrentUser();
            const profile = StorageManager.getProfile();
            const userId = currentUser?.id || profile.id;
            const userIdentifier = currentUser?.identifier || profile.identifier;
            
            console.log(`👤 [IMPORT] Current user: ${userIdentifier}`);
            console.log(`👤 [IMPORT] Backup user: ${importData.user.identifier}`);
            
            // Check if backup belongs to current user
            let isDifferentUser = false;
            if (importData.user.identifier !== userIdentifier) {
                isDifferentUser = true;
                console.warn(`⚠️ [IMPORT] Backup belongs to different user: ${importData.user.name} (${importData.user.identifier})`);
                if (!confirm(`This backup belongs to "${importData.user.name}" (${importData.user.identifier}).\n\nImporting will add their items to your account. Continue?`)) {
                    console.log('❌ [IMPORT] User cancelled import');
                    return;
                }
            }
            
            // Get existing activities
            let existingActivities = [];
            if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
                existingActivities = StorageManager.getActivities();
            } else {
                const storageKey = `user_data_${userId}`;
                existingActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            }
            
            console.log(`📊 [IMPORT] Existing activities: ${existingActivities.length}`);
            console.log(`📊 [IMPORT] Import activities: ${importData.data.activities.length}`);
            
            // Merge activities (avoid duplicates by ID)
            const existingIds = new Set(existingActivities.map(a => a.id));
            let newActivities = [...existingActivities];
            let duplicateCount = 0;
            let newCount = 0;
            
            importData.data.activities.forEach(importedItem => {
                if (existingIds.has(importedItem.id)) {
                    duplicateCount++;
                    console.log(`⚠️ [IMPORT] Duplicate item skipped: ${importedItem.title} (ID: ${importedItem.id})`);
                } else {
                    // Ensure the item has current user's ID
                    const cleanedItem = {
                        ...importedItem,
                        userId: userId,
                        userIdentifier: userIdentifier,
                        lastUpdated: new Date().toISOString()
                    };
                    newActivities.push(cleanedItem);
                    newCount++;
                }
            });
            
            console.log(`✅ [IMPORT] Added ${newCount} new items, skipped ${duplicateCount} duplicates`);
            
            // Merge categories and colors
            let existingCategoryColors = {};
            if (typeof StorageManager !== 'undefined' && StorageManager.getCategoryColors) {
                existingCategoryColors = StorageManager.getCategoryColors(userId);
            } else {
                const colorsKey = `user_category_colors_${userId}`;
                existingCategoryColors = JSON.parse(localStorage.getItem(colorsKey) || '{}');
            }
            
            const mergedCategoryColors = { ...existingCategoryColors, ...importData.data.categoryColors };
            let newCategoryCount = 0;
            Object.keys(importData.data.categoryColors).forEach(cat => {
                if (!existingCategoryColors[cat]) newCategoryCount++;
            });
            console.log(`✅ [IMPORT] Added ${newCategoryCount} new categories`);
            
            // Merge settings (only if not overwriting)
            let mergedSettings = {};
            if (importData.data.settings) {
                const existingSettings = JSON.parse(localStorage.getItem('anime_tracker_settings') || '{}');
                mergedSettings = { ...existingSettings, ...importData.data.settings };
            }
            
            // Merge theme preference
            let mergedTheme = importData.data.theme || 'system';
            
            // Confirm import
            const confirmMessage = `Import Summary:
            
📊 Items: ${newCount} new, ${duplicateCount} duplicates skipped
🏷️ Categories: ${newCategoryCount} new
⚙️ Settings: Will be merged
🎨 Theme: Will be set to ${mergedTheme}
${isDifferentUser ? '\n⚠️ This backup is from a different user!' : ''}

Do you want to proceed with the import?`;
            
            if (!confirm(confirmMessage)) {
                console.log('❌ [IMPORT] User cancelled import');
                return;
            }
            
            // Save merged activities
            const storageKey = `user_data_${userId}`;
            localStorage.setItem(storageKey, JSON.stringify(newActivities));
            console.log(`✅ [IMPORT] Saved ${newActivities.length} activities`);
            
            // Save merged category colors
            const colorsKey = `user_category_colors_${userId}`;
            localStorage.setItem(colorsKey, JSON.stringify(mergedCategoryColors));
            console.log(`✅ [IMPORT] Saved ${Object.keys(mergedCategoryColors).length} category colors`);
            
            // Save merged settings
            localStorage.setItem('anime_tracker_settings', JSON.stringify(mergedSettings));
            console.log(`✅ [IMPORT] Saved settings`);
            
            // Apply theme if changed
            if (mergedTheme !== localStorage.getItem(`user_theme_${userId}`)) {
                localStorage.setItem(`user_theme_${userId}`, mergedTheme);
                if (typeof ThemeManager !== 'undefined' && ThemeManager.setTheme) {
                    ThemeManager.setTheme(mergedTheme);
                }
                console.log(`✅ [IMPORT] Theme updated to: ${mergedTheme}`);
            }
            
            // Import avatar if exists and user confirms
            if (importData.user.avatar && importData.user.avatar !== 'null' && importData.user.avatar !== 'undefined') {
                const importAvatar = confirm('Import profile picture from backup?');
                if (importAvatar) {
                    const avatarKey = `user_avatar_${userId}`;
                    localStorage.setItem(avatarKey, importData.user.avatar);
                    console.log(`✅ [IMPORT] Avatar imported`);
                    // Reload avatar if on profile page
                    if (typeof ProfileManager !== 'undefined' && ProfileManager.loadAvatar) {
                        ProfileManager.loadAvatar();
                    }
                }
            }
            
            // Reload all data on current page
            if (typeof this.loadDashboardData === 'function') {
                this.loadDashboardData();
            }
            if (typeof this.loadWishlist === 'function') {
                this.loadWishlist();
            }
            if (typeof this.loadUserData === 'function') {
                this.loadUserData();
            }
            if (typeof this.renderFavorites === 'function') {
                this.renderFavorites();
            }
            if (typeof this.updateCategoryCapsules === 'function') {
                this.updateCategoryCapsules();
            }
            if (typeof this.renderWishlist === 'function') {
                this.renderWishlist();
            }
            
            console.log('✅ [IMPORT] Import completed successfully!');
            this.showNotification(`Import completed! Added ${newCount} items, ${newCategoryCount} categories`, 'success', 4000);
            
            // Refresh the page to show all changes
            setTimeout(() => {
                if (confirm('Import completed! Refresh the page to see all changes?')) {
                    window.location.reload();
                }
            }, 500);
            
        } catch (error) {
            console.error('❌ [IMPORT] Error:', error);
            this.showNotification('Error importing file: ' + error.message, 'error');
        }
    };
    
    reader.onerror = () => {
        console.error('❌ [IMPORT] File read error');
        this.showNotification('Error reading file', 'error');
    };
    
    reader.readAsText(file);
}

    static resetSettings() {
        const defaultSettings = {
            theme: 'system',
            notifications: true
        };
        
        localStorage.setItem('anime_tracker_settings', JSON.stringify(defaultSettings));
        this.loadUserSettings();
        this.showNotification('Settings reset!', 'success');
    }

    static escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    static showNotification(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `<span>${message}</span><button class="notification-close">&times;</button>`;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
        setTimeout(() => notification.remove(), duration);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    RemoveManager.init();
});