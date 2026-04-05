class AddActivity {
    static isFavorite = false;
    static currentStatus = 'watching';
    static currentUser = null;

    static init() {
        console.log('🚀 [ADD] Initializing Add Page...');
        
        // Check if user is logged in
        if (!this.checkUserLoggedIn()) {
            return;
        }
        
        this.setupEventListeners();
        this.loadExistingCategories();
        this.loadLatestItems();
        console.log('✅ [ADD] Add Page initialized for user:', this.currentUser?.identifier);
    }

    static checkUserLoggedIn() {
        console.log('🔐 [ADD] Checking login status...');
        
        // Try multiple ways to get user info
        let profile = {};
        let currentUser = null;
        
        // Method 1: Try StorageManager.getProfile()
        if (typeof StorageManager !== 'undefined') {
            try {
                if (typeof StorageManager.getProfile === 'function') {
                    profile = StorageManager.getProfile();
                    console.log('🔐 [ADD] Profile from StorageManager:', profile);
                } else {
                    // Fallback: directly from localStorage
                    const profileData = localStorage.getItem('anime_tracker_profile');
                    profile = profileData ? JSON.parse(profileData) : {};
                    console.log('🔐 [ADD] Profile from localStorage (fallback):', profile);
                }
                
                if (typeof StorageManager.getCurrentUser === 'function') {
                    currentUser = StorageManager.getCurrentUser();
                    console.log('🔐 [ADD] User from StorageManager:', currentUser);
                }
            } catch (e) {
                console.warn('⚠️ [ADD] Error accessing StorageManager:', e);
            }
        } else {
            console.warn('⚠️ [ADD] StorageManager not defined');
            const profileData = localStorage.getItem('anime_tracker_profile');
            profile = profileData ? JSON.parse(profileData) : {};
            console.log('🔐 [ADD] Profile from localStorage:', profile);
        }
        
        // Method 2: Check localStorage directly
        const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
        const userId = localStorage.getItem('user_id');
        const userName = localStorage.getItem('user_name');
        
        console.log('🔐 [ADD] localStorage flags:', { isLoggedIn, userId, userName });
        
        // Determine if user is logged in
        let isUserLoggedIn = isLoggedIn;
        
        // If profile has data but flags are missing, fix it
        if ((profile.id || currentUser?.id) && !isLoggedIn) {
            console.log('🔐 [ADD] Fixing missing session flags...');
            const fixUser = profile.id ? profile : currentUser;
            if (fixUser) {
                localStorage.setItem('user_logged_in', 'true');
                localStorage.setItem('user_id', fixUser.id);
                localStorage.setItem('user_name', fixUser.name);
                isUserLoggedIn = true;
                console.log('🔐 [ADD] Session flags fixed for:', fixUser.name);
            }
        }
        
        if (!isUserLoggedIn) {
            console.log('⚠️ [ADD] No logged-in user detected, redirecting to login...');
            this.showNotification('Please login to continue', 'info', 2000);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }
        
        // Set current user from available data
        this.currentUser = currentUser || profile || {
            id: userId,
            identifier: profile.identifier,
            name: userName || profile.name
        };
        
        console.log('✅ [ADD] User logged in:', this.currentUser);
        return true;
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

        // Add category button
        const addCategoryBtn = document.getElementById('addNewCategoryBtn');
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.addNewCategory());

        // Favorite button
        const markFavorite = document.getElementById('markFavorite');
        if (markFavorite) markFavorite.addEventListener('click', () => this.toggleFavorite());

        // Completed button
        const markCompleted = document.getElementById('markCompleted');
        if (markCompleted) markCompleted.addEventListener('click', () => this.toggleCompleted());

        // Form submission
        const addForm = document.getElementById('addForm');
        if (addForm) addForm.addEventListener('submit', (e) => this.saveActivity(e));

        // Form reset
        const resetForm = document.getElementById('addForm');
        if (resetForm) resetForm.addEventListener('reset', () => this.resetForm());

        // Status change
        const statusSelect = document.getElementById('status');
        if (statusSelect) statusSelect.addEventListener('change', (e) => this.updateCompletionStatus(e.target.value));

        // Season/Episode validation
        const seasonInput = document.getElementById('season');
        const episodeInput = document.getElementById('episode');
        const progressInput = document.getElementById('progress');
        
        if (seasonInput) seasonInput.addEventListener('input', (e) => this.validateNumberInput(e.target, 100));
        if (episodeInput) episodeInput.addEventListener('input', (e) => this.validateNumberInput(e.target, 1000));
        if (progressInput) progressInput.addEventListener('input', (e) => this.validateProgressInput(e.target));

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

    static loadExistingCategories() {
        if (!this.currentUser) {
            console.log('⚠️ [CATEGORIES] No user logged in');
            return;
        }
        
        let categories = [];
        if (typeof StorageManager !== 'undefined' && typeof StorageManager.getCategories === 'function') {
            categories = StorageManager.getCategories();
        } else {
            // Fallback default categories
            categories = ['anime', 'series', 'manga', 'manwha', 'manhua'];
        }
        
        console.log('📁 [CATEGORIES] Loading categories for user:', this.currentUser.identifier);
        console.log('📁 [CATEGORIES] Categories:', categories);
        
        const typeSelect = document.getElementById('type');
        if (!typeSelect) return;
        
        typeSelect.innerHTML = '<option value="">Select Category</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.formatCategoryName(category);
            
            let color = '#3498db';
            if (typeof StorageManager !== 'undefined' && typeof StorageManager.getCategoryColor === 'function') {
                color = StorageManager.getCategoryColor(category);
            }
            option.style.backgroundColor = color;
            option.style.color = '#fff';
            option.style.padding = '5px';
            
            typeSelect.appendChild(option);
        });
        
        console.log('✅ [CATEGORIES] Loaded', categories.length, 'categories');
    }

    static formatCategoryName(category) {
        if (category === 'manwha') return 'Manwha';
        if (category === 'manhua') return 'Manhua';
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    static loadLatestItems() {
        console.log('📊 [LATEST] Loading latest items for user:', this.currentUser?.identifier);
        
        if (!this.currentUser) {
            console.log('⚠️ [LATEST] No user logged in');
            return;
        }
        
        let activities = [];
        if (typeof StorageManager !== 'undefined' && typeof StorageManager.getActivities === 'function') {
            activities = StorageManager.getActivities();
        }
        
        console.log('📊 [LATEST] Total activities loaded for current user:', activities.length);
        
        const latestItems = [...activities]
            .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
            .slice(0, 5);
        
        const container = document.getElementById('latestItemsContainer');
        const emptyLatest = document.getElementById('emptyLatest');
        
        if (!container) return;
        
        if (latestItems.length === 0) {
            container.innerHTML = '';
            if (emptyLatest) emptyLatest.style.display = 'block';
            console.log('📊 [LATEST] No items found for user');
            return;
        }
        
        if (emptyLatest) emptyLatest.style.display = 'none';
        container.innerHTML = latestItems.map(item => this.createLatestItemCard(item)).join('');
        console.log('✅ [LATEST] Displayed', latestItems.length, 'items');
    }

    static createLatestItemCard(item) {
        const date = new Date(item.addedDate).toLocaleDateString();
        const typeClass = item.type ? item.type.toLowerCase() : 'unknown';
        const isFavorite = item.isFavorite ? '<span class="latest-item-favorite"><i class="fas fa-star"></i></span>' : '';
        
        let categoryColor = '#3498db';
        if (typeof StorageManager !== 'undefined' && typeof StorageManager.getCategoryColor === 'function') {
            categoryColor = StorageManager.getCategoryColor(item.type);
        }
        
        let typeIcon = 'fa-film';
        if (item.type === 'anime') typeIcon = 'fa-tv';
        else if (item.type === 'manga' || item.type === 'manwha' || item.type === 'manhua') typeIcon = 'fa-book';
        else if (item.type === 'series') typeIcon = 'fa-clapperboard';
        
        const statusDisplay = this.formatStatusForDisplay(item.status);
        
        return `
            <div class="latest-item-card" data-id="${item.id}">
                <div class="latest-item-icon" style="background: ${categoryColor}">
                    <i class="fas ${typeIcon}"></i>
                </div>
                <div class="latest-item-info">
                    <div class="latest-item-title">
                        ${this.escapeHtml(item.title)}
                        ${isFavorite}
                    </div>
                    <div class="latest-item-meta">
                        <span class="latest-item-type ${typeClass}" style="background: ${categoryColor}">${this.formatCategoryName(item.type)}</span>
                        <span class="latest-item-status">${statusDisplay}</span>
                        <span>${date}</span>
                    </div>
                </div>
            </div>
        `;
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

    static formatStatusForDisplay(status) {
        const statusMap = {
            'watching': 'Watching',
            'completed': 'Completed',
            'on-hold': 'On Hold',
            'dropped': 'Dropped',
            'plan-to-watch': 'Planned'
        };
        return statusMap[status] || status || 'Unknown';
    }

    static addNewCategory() {
        if (!this.currentUser) {
            this.showNotification('Please login to add categories', 'error');
            return;
        }
        
        const newCategory = prompt('Enter new category name (e.g., Light Novel, Webtoon):');
        if (newCategory && newCategory.trim()) {
            const category = newCategory.trim().toLowerCase();
            
            let categoryColor = '#3498db';
            if (typeof StorageManager !== 'undefined' && typeof StorageManager.getCategoryColor === 'function') {
                categoryColor = StorageManager.getCategoryColor(category);
            }
            
            const typeSelect = document.getElementById('type');
            if (typeSelect) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = newCategory.trim();
                option.style.backgroundColor = categoryColor;
                option.style.color = '#fff';
                typeSelect.appendChild(option);
                typeSelect.value = category;
            }
            
            this.showNotification(`Category "${newCategory.trim()}" added!`, 'success');
            console.log('📁 [CATEGORY] New category added for user', this.currentUser.identifier, ':', category);
        }
    }

    static toggleFavorite() {
        this.isFavorite = !this.isFavorite;
        const favoriteBtn = document.getElementById('markFavorite');
        const favoriteStatus = document.getElementById('favoriteStatus');
        
        if (this.isFavorite) {
            if (favoriteBtn) {
                favoriteBtn.classList.add('active');
                favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Remove from Favorites';
            }
            if (favoriteStatus) {
                favoriteStatus.textContent = 'In favorites';
                favoriteStatus.style.color = '#f39c12';
            }
        } else {
            if (favoriteBtn) {
                favoriteBtn.classList.remove('active');
                favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Add to Favorites';
            }
            if (favoriteStatus) {
                favoriteStatus.textContent = 'Not in favorites';
                favoriteStatus.style.color = '#666';
            }
        }
    }

    static toggleCompleted() {
        const statusSelect = document.getElementById('status');
        const completedBtn = document.getElementById('markCompleted');
        const completionStatus = document.getElementById('completionStatus');
        
        if (this.currentStatus === 'completed') {
            this.currentStatus = 'watching';
            if (statusSelect) statusSelect.value = 'watching';
            if (completedBtn) {
                completedBtn.classList.remove('active');
                completedBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Completed';
            }
            if (completionStatus) {
                completionStatus.textContent = 'Status: Watching/Reading';
                completionStatus.style.color = '#666';
            }
        } else {
            this.currentStatus = 'completed';
            if (statusSelect) statusSelect.value = 'completed';
            if (completedBtn) {
                completedBtn.classList.add('active');
                completedBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Watching';
            }
            if (completionStatus) {
                completionStatus.textContent = 'Status: Completed';
                completionStatus.style.color = '#2ecc71';
            }
        }
    }

    static updateCompletionStatus(status) {
        this.currentStatus = status;
        const completedBtn = document.getElementById('markCompleted');
        const completionStatus = document.getElementById('completionStatus');
        
        if (status === 'completed') {
            if (completedBtn) {
                completedBtn.classList.add('active');
                completedBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Watching';
            }
            if (completionStatus) {
                completionStatus.textContent = 'Status: Completed';
                completionStatus.style.color = '#2ecc71';
            }
        } else {
            if (completedBtn) {
                completedBtn.classList.remove('active');
                completedBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Completed';
            }
            if (completionStatus) {
                completionStatus.textContent = `Status: ${this.formatStatusForDisplay(status)}`;
                completionStatus.style.color = '#666';
            }
        }
    }

    static validateNumberInput(input, max) {
        let value = parseInt(input.value);
        if (isNaN(value) || value < 0) {
            input.value = '';
        } else if (value > max) {
            input.value = max;
            this.showNotification(`Maximum value is ${max}`, 'info', 1500);
        }
    }

    static validateProgressInput(input) {
        const value = input.value;
        if (value.length > 30) {
            input.value = value.substring(0, 30);
            this.showNotification('Progress limited to 30 characters', 'info', 1500);
        }
    }

    static saveActivity(e) {
        e.preventDefault();
        console.log('💾 [SAVE] Saving new activity...');
        
        if (!this.currentUser) {
            this.showNotification('Please login to add items', 'error');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }
        
        if (typeof StorageManager !== 'undefined' && typeof StorageManager.checkStorageLimit === 'function') {
            if (!StorageManager.checkStorageLimit()) {
                this.showNotification('Storage limit reached! Please remove some activities.', 'error');
                return;
            }
        }

        const title = document.getElementById('title').value.trim();
        const type = document.getElementById('type').value;
        const status = document.getElementById('status').value;
        
        if (!title) {
            this.showNotification('Please enter a title', 'error');
            document.getElementById('title').focus();
            return;
        }
        
        if (!type) {
            this.showNotification('Please select a category', 'error');
            document.getElementById('type').focus();
            return;
        }
        
        if (!status) {
            this.showNotification('Please select a status', 'error');
            document.getElementById('status').focus();
            return;
        }

       // In add.js saveActivity method, ensure progress is saved
    const activity = {
        id: Date.now().toString(),
        title: title,
        type: type,
        status: status,
        progress: document.getElementById('progress').value || '',  // ← This should capture "Chapter 34" or "Episode 12"
        season: document.getElementById('season').value ? parseInt(document.getElementById('season').value) : null,
        episode: document.getElementById('episode').value ? parseInt(document.getElementById('episode').value) : null,
        isFavorite: this.isFavorite,
        addedDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        userId: this.currentUser.id,
        userIdentifier: this.currentUser.identifier
};

        let success = false;
        if (typeof StorageManager !== 'undefined' && typeof StorageManager.saveActivity === 'function') {
            success = StorageManager.saveActivity(activity);
        } else {
            // Fallback: save directly to localStorage
            const storageKey = `user_data_${this.currentUser.id}`;
            const existingActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            existingActivities.push(activity);
            localStorage.setItem(storageKey, JSON.stringify(existingActivities));
            success = true;
        }
        
        if (success) {
            console.log('✅ [SAVE] Activity saved for user:', this.currentUser.identifier);
            this.showNotification('Activity added successfully!', 'success');
            
            document.getElementById('addForm').reset();
            this.isFavorite = false;
            this.currentStatus = 'watching';
            
            this.resetFavoriteButton();
            this.resetCompletionButton();
            this.loadExistingCategories();
            this.loadLatestItems();
        } else {
            console.error('❌ [SAVE] Failed to save activity');
            this.showNotification('Failed to save activity', 'error');
        }
    }

    static resetFavoriteButton() {
        const favoriteBtn = document.getElementById('markFavorite');
        const favoriteStatus = document.getElementById('favoriteStatus');
        
        if (favoriteBtn) {
            favoriteBtn.classList.remove('active');
            favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Add to Favorites';
        }
        if (favoriteStatus) {
            favoriteStatus.textContent = 'Not in favorites';
            favoriteStatus.style.color = '#666';
        }
    }

    static resetCompletionButton() {
        const completedBtn = document.getElementById('markCompleted');
        const completionStatus = document.getElementById('completionStatus');
        
        if (completedBtn) {
            completedBtn.classList.remove('active');
            completedBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Completed';
        }
        if (completionStatus) {
            completionStatus.textContent = 'Status: Watching/Reading';
            completionStatus.style.color = '#666';
        }
    }

    static resetForm() {
        this.isFavorite = false;
        this.currentStatus = 'watching';
        
        this.resetFavoriteButton();
        this.resetCompletionButton();
        
        const statusSelect = document.getElementById('status');
        if (statusSelect) statusSelect.value = '';
        
        this.showNotification('Form cleared', 'info');
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

    static loadUserSettings() {
        const settings = JSON.parse(localStorage.getItem('anime_tracker_settings') || '{}');
        // Theme selector change handler
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

    static showNotification(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `<span>${message}</span><button class="notification-close">&times;</button>`;
        
        notification.style.cssText = `
            position: fixed;
            top: 15px;
            right: 15px;
            left: 15px;
            padding: 15px;
            background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            border-radius: 12px;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 600;
            font-size: 0.9rem;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
        setTimeout(() => notification.remove(), duration);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    AddActivity.init();
});