class Dashboard {
    static currentItems = [];
    static currentCategory = 'all';
    static currentStatus = 'all';
    static currentSort = 'date';
    static currentUser = null;
    static allCategories = new Set();

    static init() {
        console.log('🚀 [INDEX] Dashboard initializing...');
        
        if (!this.checkUserLoggedIn()) return;
        
        this.loadCurrentUser();
        this.loadAllCategories();
        this.setupEventListeners();
        this.setupTimeAndGreeting();
        this.loadDashboardData();
        this.loadUserSettings();
        this.addMobileOptimizations();
        this.updateCategoryCapsules();
        this.updateStatusCapsules();
        
        console.log('✅ [INDEX] Dashboard initialized for user:', this.currentUser?.identifier);
    }

    static checkUserLoggedIn() {
        let currentUser = null;
        if (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) {
            currentUser = StorageManager.getCurrentUser();
        }
        const profile = JSON.parse(localStorage.getItem('anime_tracker_profile') || '{}');
        const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
        
        if ((!currentUser && !profile.id) || !isLoggedIn) {
            console.log('⚠️ [INDEX] No logged-in user detected, redirecting to login...');
            this.showNotification('Please login to continue', 'info', 2000);
            setTimeout(() => window.location.href = 'login.html', 1500);
            return false;
        }
        
        this.currentUser = currentUser || { id: profile.id, identifier: profile.identifier, name: profile.name };
        console.log('✅ [INDEX] User logged in:', this.currentUser?.identifier);
        return true;
    }

    static loadAllCategories() {
        this.allCategories.clear();
        if (typeof StorageManager !== 'undefined' && StorageManager.getCategories) {
            const categories = StorageManager.getCategories();
            categories.forEach(cat => this.allCategories.add(cat));
        }
        // Also add categories from items
        this.currentItems.forEach(item => {
            if (item.type) this.allCategories.add(item.type);
        });
        console.log(`📁 [INDEX] Loaded ${this.allCategories.size} categories`);
    }

    static updateCategoryCapsules() {
        const container = document.getElementById('categoryCapsules');
        if (!container) return;
        
        let capsulesHtml = '<button class="capsule active" data-category="all">All</button>';
        Array.from(this.allCategories).sort().forEach(category => {
            const count = this.currentItems.filter(item => item.type === category).length;
            capsulesHtml += `<button class="capsule" data-category="${category}">${category.charAt(0).toUpperCase() + category.slice(1)}<span class="count-badge">${count}</span></button>`;
        });
        
        container.innerHTML = capsulesHtml;
        
        document.querySelectorAll('#categoryCapsules .capsule').forEach(capsule => {
            capsule.addEventListener('click', () => {
                const category = capsule.dataset.category;
                this.setCategoryFilter(category);
            });
        });
    }

    static updateStatusCapsules() {
        const container = document.getElementById('statusCapsules');
        if (!container) return;
        
        const statuses = [
            { value: 'all', label: 'All' },
            { value: 'watching', label: 'Watching/Reading' },
            { value: 'completed', label: 'Completed' },
            { value: 'plan-to-watch', label: 'Wishlist' },
            { value: 'on-hold', label: 'On Hold' },
            { value: 'dropped', label: 'Dropped' }
        ];
        
        let capsulesHtml = '';
        statuses.forEach(status => {
            const count = status.value === 'all' ? this.currentItems.length : this.currentItems.filter(item => item.status === status.value).length;
            const isActive = (status.value === 'all' && this.currentStatus === 'all') || (status.value !== 'all' && this.currentStatus === status.value);
            capsulesHtml += `<button class="capsule ${isActive ? 'active' : ''}" data-status="${status.value}">${status.label}<span class="count-badge">${count}</span></button>`;
        });
        
        container.innerHTML = capsulesHtml;
        
        document.querySelectorAll('#statusCapsules .capsule').forEach(capsule => {
            capsule.addEventListener('click', () => {
                const status = capsule.dataset.status;
                this.setStatusFilter(status);
            });
        });
    }

    static updateEditFormCategories() {
        const editTypeSelect = document.getElementById('editType');
        if (!editTypeSelect) return;
        
        const currentValue = editTypeSelect.value;
        editTypeSelect.innerHTML = '';
        
        Array.from(this.allCategories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            editTypeSelect.appendChild(option);
        });
        
        if (currentValue && this.allCategories.has(currentValue)) {
            editTypeSelect.value = currentValue;
        }
    }

    static loadCurrentUser() {
        const userNameEl = document.getElementById('userName');
        if (userNameEl && this.currentUser) userNameEl.textContent = this.currentUser.name || 'User';
        this.loadUserAvatar();
    }

    static loadUserAvatar() {
        const userId = this.currentUser?.id;
        const avatarKey = userId ? `user_avatar_${userId}` : null;
        const savedAvatar = avatarKey ? localStorage.getItem(avatarKey) : null;
        const avatarImg = document.getElementById('avatarImage');
        if (!avatarImg) return;
        if (savedAvatar && savedAvatar !== 'null' && savedAvatar !== 'undefined') {
            avatarImg.src = savedAvatar;
        } else {
            const name = this.currentUser?.name || 'User';
            avatarImg.src = `https://ui-avatars.com/api/?name=${name.charAt(0).toUpperCase()}&background=3498db&color=fff&size=100`;
        }
    }

    static setupEventListeners() {
        // Side panel toggles
        const menuToggle = document.getElementById('menuToggle');
        const settingsToggle = document.getElementById('settingsToggle');
        const closeMenu = document.getElementById('closeMenu');
        const closeSettings = document.getElementById('closeSettings');
        const overlay = document.getElementById('overlay');
        const menuPanel = document.getElementById('menuPanel');
        const settingsPanel = document.getElementById('settingsPanel');
        
        if (menuToggle) {
            const newMenuBtn = menuToggle.cloneNode(true);
            menuToggle.parentNode.replaceChild(newMenuBtn, menuToggle);
            newMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (menuPanel) menuPanel.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
                document.body.style.overflow = menuPanel?.classList.contains('active') ? 'hidden' : '';
            });
        }
        
        if (settingsToggle) {
            const newSettingsBtn = settingsToggle.cloneNode(true);
            settingsToggle.parentNode.replaceChild(newSettingsBtn, settingsToggle);
            newSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (settingsPanel) settingsPanel.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
                document.body.style.overflow = settingsPanel?.classList.contains('active') ? 'hidden' : '';
            });
        }
        
        if (closeMenu) closeMenu.addEventListener('click', () => {
            if (menuPanel) menuPanel.classList.remove('active');
            if (overlay && !settingsPanel?.classList.contains('active')) overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        if (closeSettings) closeSettings.addEventListener('click', () => {
            if (settingsPanel) settingsPanel.classList.remove('active');
            if (overlay && !menuPanel?.classList.contains('active')) overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        if (overlay) overlay.addEventListener('click', () => {
            if (menuPanel) menuPanel.classList.remove('active');
            if (settingsPanel) settingsPanel.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Search with debounce
        const searchInput = document.getElementById('mainSearch');
        let searchTimeout;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.filterItems(), 300);
            });
        }

        // Sort capsules
        document.querySelectorAll('#sortCapsules .capsule').forEach(capsule => {
            capsule.addEventListener('click', () => {
                const sort = capsule.dataset.sort;
                this.setSortFilter(sort);
            });
        });

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }

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

        // Edit modal
        const closeEditModal = document.getElementById('closeEditModal');
        const cancelEdit = document.getElementById('cancelEdit');
        const editForm = document.getElementById('editForm');
        const deleteItem = document.getElementById('deleteItem');
        
        if (closeEditModal) closeEditModal.addEventListener('click', () => this.closeEditModal());
        if (cancelEdit) cancelEdit.addEventListener('click', () => this.closeEditModal());
        if (editForm) editForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveItemChanges(); });
        if (deleteItem) deleteItem.addEventListener('click', () => this.deleteCurrentItem());

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEditModal();
                if (menuPanel) menuPanel.classList.remove('active');
                if (settingsPanel) settingsPanel.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    static setCategoryFilter(category) {
        document.querySelectorAll('#categoryCapsules .capsule').forEach(c => c.classList.remove('active'));
        const activeCapsule = document.querySelector(`#categoryCapsules .capsule[data-category="${category}"]`);
        if (activeCapsule) activeCapsule.classList.add('active');
        this.currentCategory = category;
        this.filterItems();
    }

    static setStatusFilter(status) {
        document.querySelectorAll('#statusCapsules .capsule').forEach(c => c.classList.remove('active'));
        const activeCapsule = document.querySelector(`#statusCapsules .capsule[data-status="${status}"]`);
        if (activeCapsule) activeCapsule.classList.add('active');
        this.currentStatus = status;
        this.filterItems();
    }

    static setSortFilter(sort) {
        document.querySelectorAll('#sortCapsules .capsule').forEach(c => c.classList.remove('active'));
        const activeCapsule = document.querySelector(`#sortCapsules .capsule[data-sort="${sort}"]`);
        if (activeCapsule) activeCapsule.classList.add('active');
        this.currentSort = sort;
        this.sortAndRenderItems();
    }

    static clearAllFilters() {
        this.setCategoryFilter('all');
        this.setStatusFilter('all');
        document.getElementById('mainSearch').value = '';
        this.filterItems();
        this.showNotification('All filters cleared', 'info', 1500);
    }

    static setupTimeAndGreeting() {
        const updateTime = () => {
            const now = new Date();
            const dateEl = document.getElementById('currentDate');
            const timeEl = document.getElementById('currentTime');
            const greetingEl = document.getElementById('greetingTime');
            
            if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            if (greetingEl) {
                const hour = now.getHours();
                let greeting = 'Good Morning';
                if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
                else if (hour >= 17 && hour < 21) greeting = 'Good Evening';
                else if (hour >= 21 || hour < 5) greeting = 'Good Night';
                greetingEl.textContent = `${greeting},`;
            }
        };
        updateTime();
        setInterval(updateTime, 60000);
    }

    static loadDashboardData() {
        let activities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            activities = StorageManager.getActivities();
        }
        this.currentItems = [...activities];
        this.loadAllCategories();
        this.updateCategoryCapsules();
        this.updateStatusCapsules();
        console.log(`📊 [DATA] Loaded ${activities.length} items for user:`, this.currentUser?.name);
        this.updateStats(activities);
        this.renderItems(activities);
        
        const itemsCount = document.getElementById('itemsCount');
        const emptyState = document.getElementById('emptyState');
        const itemsContainer = document.getElementById('itemsContainer');
        if (itemsCount) itemsCount.textContent = activities.length;
        if (emptyState) emptyState.style.display = activities.length === 0 ? 'block' : 'none';
        if (itemsContainer) itemsContainer.style.display = activities.length === 0 ? 'none' : 'flex';
    }

    static updateStats(activities) {
        const watchingCount = activities.filter(a => a.status === 'watching').length;
        const completedCount = activities.filter(a => a.status === 'completed').length;
        const favoritesCount = activities.filter(a => a.isFavorite).length;
        const watchingEl = document.getElementById('watchingCount');
        const completedEl = document.getElementById('completedCount');
        const favoritesEl = document.getElementById('favoritesCount');
        if (watchingEl) watchingEl.textContent = watchingCount;
        if (completedEl) completedEl.textContent = completedCount;
        if (favoritesEl) favoritesEl.textContent = favoritesCount;
    }

    static renderItems(items) {
        const container = document.getElementById('itemsContainer');
        if (!container) return;
        if (items.length === 0) { container.innerHTML = ''; return; }
        
        const sortedItems = this.sortItems(items);
        container.innerHTML = sortedItems.map(item => this.createItemCard(item)).join('');
        this.attachItemActionListeners();
    }

    static createItemCard(item) {
    const statusClass = item.status ? item.status.replace('-', '') : '';
    const notes = item.notes || 'No notes yet.';
    const categoryColor = this.getCategoryColor(item.type);
    
    // ========== FIXED PROGRESS DISPLAY ==========
    // Priority 1: Use the 'progress' field from the item (stores custom text like "Chapter 34", "Episode 12")
    // Priority 2: Use season/episode combination
    // Priority 3: Show "Not started" as fallback
    
    let progressText = 'Not started';
    
    // Check if progress field exists and has value
    if (item.progress && item.progress.trim() !== '' && item.progress !== '0') {
        progressText = item.progress;
        console.log(`[DEBUG] Progress from item.progress: ${progressText}`);
    } 
    // Check if season and episode both exist
    else if (item.season && item.episode) {
        progressText = `S${item.season} E${item.episode}`;
        console.log(`[DEBUG] Progress from season/episode: ${progressText}`);
    }
    // Check if only episode exists
    else if (item.episode) {
        progressText = `Episode ${item.episode}`;
        console.log(`[DEBUG] Progress from episode: ${progressText}`);
    }
    // Check if only season exists
    else if (item.season) {
        progressText = `Season ${item.season}`;
        console.log(`[DEBUG] Progress from season: ${progressText}`);
    }
    
    console.log(`[DEBUG] Final progress for "${item.title}": ${progressText}`);
    // ========== END OF FIXED PROGRESS DISPLAY ==========
    
    // Status badge color mapping
    const statusColors = {
        'watching': '#3498db',
        'completed': '#2ecc71',
        'on-hold': '#f39c12',
        'dropped': '#e74c3c',
        'plan-to-watch': '#9b59b6'
    };
    const statusColor = statusColors[item.status] || '#95a5a6';
    
    return `
        <div class="item-card" data-id="${item.id}">
            <div class="item-header">
                <div>
                    <h3 class="item-title">${this.escapeHtml(item.title)}</h3>
                    <span class="item-type" style="background: ${categoryColor}">${(item.type || 'unknown').toUpperCase()}</span>
                </div>
                <div class="item-actions">
                    <button class="item-action-btn edit-btn" data-id="${item.id}" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="item-action-btn favorite-btn" data-id="${item.id}" data-favorite="${item.isFavorite || false}">
                        <i class="fas fa-star${item.isFavorite ? '' : '-o'}"></i>
                    </button>
                </div>
            </div>
            <div class="item-body">
                <div class="item-meta">
                    <span class="item-status status-${statusClass}" style="background: ${statusColor}">${this.formatStatus(item.status)}</span>
                    <span class="item-date"><i class="fas fa-calendar"></i> ${new Date(item.addedDate).toLocaleDateString()}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span><i class="fas fa-chart-line"></i> Progress</span>
                        <span class="progress-value" style="color: var(--primary-color); font-weight: 600;">${this.escapeHtml(progressText)}</span>
                    </div>
                    ${item.total ? `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.round((parseInt(item.progress) / parseInt(item.total)) * 100)}%"></div>
                    </div>
                    ` : ''}
                </div>
                ${notes !== 'No notes yet.' ? `<div class="item-notes"><i class="fas fa-quote-left"></i> ${this.escapeHtml(notes)}</div>` : ''}
            </div>
        </div>
    `;
}

    static getCategoryColor(category) {
        if (typeof StorageManager !== 'undefined' && StorageManager.getCategoryColor) {
            return StorageManager.getCategoryColor(category, this.currentUser?.id);
        }
        const colors = { anime: '#3498db', series: '#9b59b6', manga: '#e74c3c', manwha: '#f39c12', manhua: '#1abc9c' };
        return colors[category] || '#3498db';
    }

    static escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

    static attachItemActionListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => this.openEditModal(e.currentTarget.dataset.id)));
        document.querySelectorAll('.favorite-btn').forEach(btn => btn.addEventListener('click', (e) => this.toggleFavorite(e.currentTarget.dataset.id)));
    }

    static openEditModal(itemId) {
        const item = this.currentItems.find(i => i.id === itemId);
        if (!item) return;
        
        // Update categories in edit form before opening
        this.updateEditFormCategories();
        
        document.getElementById('editItemId').value = item.id;
        document.getElementById('editTitle').value = item.title;
        document.getElementById('editType').value = item.type;
        document.getElementById('editStatus').value = item.status;
        document.getElementById('editProgress').value = item.progress || '';
        document.getElementById('editNotes').value = item.notes || '';
        document.getElementById('editModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static closeEditModal() {
        document.getElementById('editModal').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('editForm').reset();
    }

    static saveItemChanges() {
        const itemId = document.getElementById('editItemId').value;
        let activities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            activities = StorageManager.getActivities();
        }
        const updatedActivities = activities.map(activity => {
            if (activity.id === itemId) {
                return {
                    ...activity,
                    title: document.getElementById('editTitle').value,
                    type: document.getElementById('editType').value,
                    status: document.getElementById('editStatus').value,
                    progress: document.getElementById('editProgress').value || '',
                    notes: document.getElementById('editNotes').value || '',
                    lastUpdated: new Date().toISOString()
                };
            }
            return activity;
        });
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        this.currentItems = updatedActivities;
        this.loadAllCategories();
        this.updateCategoryCapsules();
        this.updateStatusCapsules();
        this.renderItems(this.currentItems);
        this.updateStats(updatedActivities);
        this.closeEditModal();
        this.showNotification('Item updated!', 'success');
    }

    static deleteCurrentItem() {
        if (!confirm('Delete this item?')) return;
        const itemId = document.getElementById('editItemId').value;
        let activities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            activities = StorageManager.getActivities();
        }
        const updatedActivities = activities.filter(activity => activity.id !== itemId);
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        this.currentItems = updatedActivities;
        this.loadAllCategories();
        this.updateCategoryCapsules();
        this.updateStatusCapsules();
        this.renderItems(this.currentItems);
        this.updateStats(updatedActivities);
        this.closeEditModal();
        this.showNotification('Item deleted!', 'success');
    }

    static toggleFavorite(itemId) {
        let activities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            activities = StorageManager.getActivities();
        }
        const updatedActivities = activities.map(activity => {
            if (activity.id === itemId) return { ...activity, isFavorite: !activity.isFavorite };
            return activity;
        });
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        this.currentItems = updatedActivities;
        this.renderItems(this.currentItems);
        this.updateStats(updatedActivities);
        const isFavorite = updatedActivities.find(a => a.id === itemId).isFavorite;
        this.showNotification(isFavorite ? 'Added to favorites!' : 'Removed from favorites!', 'info');
    }

    static filterItems() {
        const searchTerm = document.getElementById('mainSearch')?.value.toLowerCase() || '';
        const category = this.currentCategory;
        const status = this.currentStatus;
        
        let filtered = this.currentItems.filter(item => {
            const matchesSearch = searchTerm === '' || item.title.toLowerCase().includes(searchTerm);
            const matchesCategory = category === 'all' || item.type === category;
            const matchesStatus = status === 'all' || item.status === status;
            return matchesSearch && matchesCategory && matchesStatus;
        });
        
        this.renderItems(filtered);
        const itemsCount = document.getElementById('itemsCount');
        if (itemsCount) itemsCount.textContent = filtered.length;
    }

    static sortItems(items) {
        const sortBy = this.currentSort;
        return [...items].sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.title.localeCompare(b.title);
                case 'status': return (a.status || '').localeCompare(b.status || '');
                case 'type': return (a.type || '').localeCompare(b.type || '');
                case 'date':
                default: return new Date(b.addedDate) - new Date(a.addedDate);
            }
        });
    }

    static sortAndRenderItems() {
        const sorted = this.sortItems(this.currentItems);
        this.renderItems(sorted);
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

    static setTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        if (typeof ThemeManager !== 'undefined' && ThemeManager.setTheme) ThemeManager.setTheme(theme);
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
}}

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
        localStorage.setItem('anime_tracker_settings', JSON.stringify({ theme: 'system', notifications: true }));
        this.loadUserSettings();
        this.showNotification('Settings reset!', 'success');
    }

    static addMobileOptimizations() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch-device');
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
document.addEventListener('DOMContentLoaded', () => { Dashboard.init(); });