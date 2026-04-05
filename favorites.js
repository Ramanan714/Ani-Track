class FavoritesManager {
    static currentUser = null;
    static favorites = [];
    static currentFilters = {
        search: '',
        category: 'all',
        status: 'all',
        sort: 'newest'
    };

    static init() {
        console.log('🚀 [FAVORITES] Initializing Favorites Page...');
        
        // Show loading animation
        this.showLoading();
        
        // Check if user is logged in
        if (!this.checkUserLoggedIn()) {
            return;
        }
        
        this.loadUserData();
        this.setupEventListeners();
        this.setupTimeAndGreeting();
        this.loadUserSettings();
        this.updateCategoryCapsules();
        this.updateStatusCapsules();
        
        // Simulate loading delay for animation
        setTimeout(() => {
            this.renderFavorites();
            this.hideLoading();
        }, 800);
        
        console.log('✅ [FAVORITES] Favorites Page initialized for user:', this.currentUser?.name);
    }

    static showLoading() {
        const loader = document.getElementById('starLoader');
        if (loader) {
            loader.classList.remove('fade-out');
            loader.style.display = 'flex';
        }
    }

    static hideLoading() {
        const loader = document.getElementById('starLoader');
        const mainContent = document.getElementById('mainContent');
        
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
                if (mainContent) mainContent.style.display = 'block';
            }, 500);
        } else if (mainContent) {
            mainContent.style.display = 'block';
        }
    }

    static checkUserLoggedIn() {
        let currentUser = null;
        if (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) {
            currentUser = StorageManager.getCurrentUser();
        }
        
        const profile = JSON.parse(localStorage.getItem('anime_tracker_profile') || '{}');
        const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
        
        if ((!currentUser && !profile.id) || !isLoggedIn) {
            console.log('⚠️ [FAVORITES] No logged-in user detected, redirecting to login...');
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
        
        console.log('✅ [FAVORITES] User logged in:', this.currentUser?.name);
        return true;
    }

    static loadUserData() {
        // Load all activities and filter favorites
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            const allActivities = StorageManager.getActivities();
            this.favorites = allActivities.filter(activity => activity.isFavorite === true);
        } else {
            const storageKey = `user_data_${this.currentUser?.id}`;
            const allActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            this.favorites = allActivities.filter(activity => activity.isFavorite === true);
        }
        
        console.log(`📊 [FAVORITES] Loaded ${this.favorites.length} favorites`);
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

    static updateCategoryCapsules() {
        // Get unique categories from favorites
        const categories = new Set();
        this.favorites.forEach(item => {
            if (item.type) categories.add(item.type);
        });
        
        // Sort categories alphabetically
        const sortedCategories = Array.from(categories).sort();
        
        const container = document.getElementById('categoryCapsules');
        if (!container) return;
        
        // Build capsules HTML
        let capsulesHtml = '<button class="capsule active" data-category="all">All</button>';
        
        sortedCategories.forEach(category => {
            const count = this.favorites.filter(item => item.type === category).length;
            capsulesHtml += `
                <button class="capsule" data-category="${category}">
                    ${category.charAt(0).toUpperCase() + category.slice(1)}
                    <span class="count-badge">${count}</span>
                </button>
            `;
        });
        
        container.innerHTML = capsulesHtml;
        
        // Add click event listeners to category capsules
        document.querySelectorAll('#categoryCapsules .capsule').forEach(capsule => {
            capsule.addEventListener('click', () => {
                const category = capsule.dataset.category;
                this.setCategoryFilter(category);
            });
        });
    }

    static updateStatusCapsules() {
        // Define statuses with their display names
        const statuses = [
            { value: 'all', label: 'All' },
            { value: 'watching', label: 'Watching/Reading' },
            { value: 'completed', label: 'Completed' },
            { value: 'plan-to-watch', label: 'Wishlist' },
            { value: 'on-hold', label: 'On Hold' },
            { value: 'dropped', label: 'Dropped' }
        ];
        
        const container = document.getElementById('statusCapsules');
        if (!container) return;
        
        // Build capsules HTML with counts
        let capsulesHtml = '';
        
        statuses.forEach(status => {
            let count = 0;
            if (status.value === 'all') {
                count = this.favorites.length;
            } else {
                count = this.favorites.filter(item => item.status === status.value).length;
            }
            
            const isActive = (status.value === 'all' && this.currentFilters.status === 'all') || 
                            (status.value !== 'all' && this.currentFilters.status === status.value);
            
            capsulesHtml += `
                <button class="capsule ${isActive ? 'active' : ''}" data-status="${status.value}">
                    ${status.label}
                    <span class="count-badge">${count}</span>
                </button>
            `;
        });
        
        container.innerHTML = capsulesHtml;
        
        // Add click event listeners to status capsules
        document.querySelectorAll('#statusCapsules .capsule').forEach(capsule => {
            capsule.addEventListener('click', () => {
                const status = capsule.dataset.status;
                this.setStatusFilter(status);
            });
        });
    }

    static setCategoryFilter(category) {
        // Update active state on capsules
        document.querySelectorAll('#categoryCapsules .capsule').forEach(capsule => {
            if (capsule.dataset.category === category) {
                capsule.classList.add('active');
            } else {
                capsule.classList.remove('active');
            }
        });
        
        // Update filter value
        this.currentFilters.category = category;
        
        // Re-render favorites
        this.renderFavorites();
        
        // Show notification for filter change
        if (category !== 'all') {
            this.showNotification(`Filtering by: ${category}`, 'info', 1500);
        } else {
            this.showNotification('Showing all categories', 'info', 1500);
        }
    }

    static setStatusFilter(status) {
        // Update active state on capsules
        document.querySelectorAll('#statusCapsules .capsule').forEach(capsule => {
            if (capsule.dataset.status === status) {
                capsule.classList.add('active');
            } else {
                capsule.classList.remove('active');
            }
        });
        
        // Update filter value
        this.currentFilters.status = status;
        
        // Re-render favorites
        this.renderFavorites();
        
        // Show notification for filter change
        if (status !== 'all') {
            const statusLabel = this.getStatusLabel(status);
            this.showNotification(`Filtering by: ${statusLabel}`, 'info', 1500);
        } else {
            this.showNotification('Showing all statuses', 'info', 1500);
        }
    }

    static getStatusLabel(status) {
        const statusMap = {
            'watching': 'Watching/Reading',
            'completed': 'Completed',
            'plan-to-watch': 'Wishlist',
            'on-hold': 'On Hold',
            'dropped': 'Dropped'
        };
        return statusMap[status] || status;
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

        // Search input
        const searchInput = document.getElementById('searchFavorites');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.renderFavorites();
            });
        }

        // Sort dropdown
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentFilters.sort = e.target.value;
                this.renderFavorites();
            });
        }

        // Clear filter buttons
        const clearCategoryFilter = document.getElementById('clearCategoryFilter');
        const clearStatusFilter = document.getElementById('clearStatusFilter');
        
        if (clearCategoryFilter) {
            clearCategoryFilter.addEventListener('click', () => {
                this.setCategoryFilter('all');
            });
        }
        
        if (clearStatusFilter) {
            clearStatusFilter.addEventListener('click', () => {
                this.setStatusFilter('all');
            });
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

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllPanels();
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

    static updateSummaryStats() {
        // Update total favorites count
        const favoritesCountEl = document.getElementById('favoritesCount');
        if (favoritesCountEl) favoritesCountEl.textContent = this.favorites.length;
        
        // Update category stats
        const categoryStats = {};
        this.favorites.forEach(item => {
            if (item.type) {
                categoryStats[item.type] = (categoryStats[item.type] || 0) + 1;
            }
        });
        
        const summaryStats = document.getElementById('categoryStats');
        if (summaryStats) {
            summaryStats.innerHTML = Object.entries(categoryStats).slice(0, 5).map(([cat, count]) => `
                <div class="summary-stat-item">
                    <i class="fas fa-tag"></i>
                    <span>${cat}: ${count}</span>
                </div>
            `).join('');
        }
    }

    static renderFavorites() {
        const container = document.getElementById('favoritesContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (!container) return;
        
        // Apply filters
        let filteredFavorites = this.favorites.filter(item => {
            const matchesSearch = this.currentFilters.search === '' || 
                item.title.toLowerCase().includes(this.currentFilters.search);
            const matchesCategory = this.currentFilters.category === 'all' || 
                item.type === this.currentFilters.category;
            const matchesStatus = this.currentFilters.status === 'all' || 
                item.status === this.currentFilters.status;
            return matchesSearch && matchesCategory && matchesStatus;
        });
        
        // Apply sorting
        filteredFavorites = this.sortFavorites(filteredFavorites);
        
        if (filteredFavorites.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = filteredFavorites.map(item => this.createFavoriteCard(item)).join('');
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-fav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.dataset.id;
                this.removeFromFavorites(itemId);
            });
        });
        
        document.querySelectorAll('.favorite-star').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.dataset.id;
                this.removeFromFavorites(itemId);
            });
        });
        
        // Update summary stats
        this.updateSummaryStats();
    }

    static sortFavorites(items) {
        const sortBy = this.currentFilters.sort;
        
        return [...items].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.addedDate) - new Date(a.addedDate);
                case 'oldest':
                    return new Date(a.addedDate) - new Date(b.addedDate);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                default:
                    return new Date(b.addedDate) - new Date(a.addedDate);
            }
        });
    }

    static createFavoriteCard(item) {
        const progressPercent = item.total ? Math.round((item.progress / item.total) * 100) : 0;
        const statusClass = item.status ? item.status.replace('-', '') : '';
        const categoryColor = this.getCategoryColor(item.type);
        const date = new Date(item.addedDate).toLocaleDateString();
        const progressText = item.progress ? `${item.progress}${item.total ? ` / ${item.total}` : ''}` : 'Not started';
        
        return `
            <div class="favorite-card" data-id="${item.id}">
                <div class="favorite-card-header">
                    <div>
                        <h3 class="favorite-title">${this.escapeHtml(item.title)}</h3>
                        <div class="favorite-badges">
                            <span class="favorite-type" style="background: ${categoryColor}">${item.type.toUpperCase()}</span>
                            <span class="favorite-status status-${statusClass}">${this.formatStatus(item.status)}</span>
                        </div>
                    </div>
                    <button class="favorite-star" data-id="${item.id}" title="Remove from favorites">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
                <div class="favorite-card-body">
                    <div class="favorite-progress">
                        <div class="progress-label">
                            <span>Progress</span>
                            <span>${progressText}</span>
                        </div>
                        ${item.total ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        ` : ''}
                    </div>
                    ${item.notes ? `
                    <div class="favorite-notes">
                        <i class="fas fa-quote-left"></i>
                        <p>${this.escapeHtml(item.notes)}</p>
                    </div>
                    ` : ''}
                </div>
                <div class="favorite-card-footer">
                    <span class="favorite-date">
                        <i class="fas fa-calendar"></i> Added: ${date}
                    </span>
                    <button class="remove-fav-btn" data-id="${item.id}">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    }

    static removeFromFavorites(itemId) {
        if (!confirm('Remove this item from your favorites?')) return;
        
        // Update in storage
        let allActivities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            allActivities = StorageManager.getActivities();
        } else {
            const storageKey = `user_data_${this.currentUser?.id}`;
            allActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
        
        const updatedActivities = allActivities.map(activity => {
            if (activity.id === itemId) {
                return { ...activity, isFavorite: false };
            }
            return activity;
        });
        
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        
        // Reload favorites
        this.loadUserData();
        this.updateCategoryCapsules();
        this.updateStatusCapsules();
        this.renderFavorites();
        this.showNotification('Removed from favorites', 'success');
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
    FavoritesManager.init();
});