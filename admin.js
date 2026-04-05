class AdminManager {
    static ADMIN_EMAIL = 'adminarjun@gmail.com';
    static users = [];
    static currentUser = null;
    static selectedUser = null;
    static pendingAction = null;
    static STORAGE_LIMIT_MB = 25;
    static selectedUserItems = new Set();
    
    // Filter states for popups
    static currentUsersPopupFilter = 'all';
    static currentItemsCategoryFilter = 'all';
    static currentItemsUserFilter = 'all';
    static currentCategoriesUserFilter = 'all';

    static init() {
        console.log('🚀 [ADMIN] Initializing Admin Panel...');
        
        const currentUser = StorageManager.getCurrentUser();
        const profile = StorageManager.getProfile();
        const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
        
        if (!currentUser || currentUser.identifier !== this.ADMIN_EMAIL || !isLoggedIn) {
            console.log('❌ [ADMIN] Unauthorized access - Redirecting');
            this.showNotification('Unauthorized access. Redirecting...', 'error', 2000);
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }

        this.currentUser = currentUser;
        console.log('✅ [ADMIN] Admin access granted');
        
        this.loadAllUsers();
        this.setupEventListeners();
        this.updateGlobalStats();
        this.updateStorageDisplay();
        this.updateSystemInfo();
        this.loadUserSettings();
        this.loadAllUsersSettings();
        this.setupStatCardClickListeners();

        // Listen for storage changes from other tabs/pages
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.includes('user_data_') || e.key.includes('anime_tracker_activities'))) {
                console.log('🔄 [ADMIN] Detected data change from another page');
                this.loadAllUsers();
                this.updateGlobalStats();
                this.updateStorageDisplay();
                this.loadAllCategoriesSection();
                
                // Refresh current user details if modal is open
                if (this.selectedUser) {
                    this.refreshCurrentUserDetails();
                }
            }
        });
    }
    

    // ============================================
    // STAT CARD CLICK LISTENERS
    // ============================================
    static setupStatCardClickListeners() {
        const usersCard = document.getElementById('statUsersCard');
        const itemsCard = document.getElementById('statItemsCard');
        const categoriesCard = document.getElementById('statCategoriesCard');
        
        if (usersCard) usersCard.addEventListener('click', () => this.showUsersPopup());
        if (itemsCard) itemsCard.addEventListener('click', () => this.showItemsPopup());
        if (categoriesCard) categoriesCard.addEventListener('click', () => this.showCategoriesPopup());
    }

    // ============================================
    // USERS POPUP WITH ITEMS & CATEGORIES COUNT
    // ============================================
    static showUsersPopup() {
        const container = document.getElementById('usersPopupList');
        if (!container) return;
        
        // Build filter capsules for users popup
        const userFilterContainer = document.getElementById('usersPopupUserFilter');
        if (userFilterContainer) {
            const uniqueUsers = [...new Set(this.users.map(u => u.name))];
            userFilterContainer.innerHTML = `
                <button class="filter-capsule ${this.currentUsersPopupFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                ${uniqueUsers.map(name => `
                    <button class="filter-capsule ${this.currentUsersPopupFilter === name ? 'active' : ''}" data-filter="${name}">${this.escapeHtml(name)}</button>
                `).join('')}
            `;
            
            userFilterContainer.querySelectorAll('.filter-capsule').forEach(btn => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.filter;
                    this.currentUsersPopupFilter = filter;
                    this.showUsersPopup();
                });
            });
            
            document.getElementById('usersPopupFilters').style.display = 'block';
        }
        
        let filteredUsers = this.users;
        if (this.currentUsersPopupFilter !== 'all') {
            filteredUsers = this.users.filter(u => u.name === this.currentUsersPopupFilter);
        }
        
        container.innerHTML = filteredUsers.map(user => `
            <div class="popup-item">
                <div class="popup-item-info">
                    <div class="popup-item-name">
                        <i class="fas fa-user-circle"></i>
                        <span>${this.escapeHtml(user.name)}</span>
                    </div>
                    <div class="popup-item-stats">
                        <span class="popup-item-badge" style="background: var(--primary-color)">📦 ${user.itemCount || 0} items</span>
                        <span class="popup-item-badge" style="background: var(--secondary-color)">🏷️ ${user.categoryCount || 0} categories</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('usersPopupModal').classList.add('active');
    }

    // ============================================
    // ITEMS POPUP WITH CATEGORY & USER FILTERS
    // ============================================
    static showItemsPopup() {
        const container = document.getElementById('itemsPopupList');
        if (!container) return;
        
        let allItems = [];
        this.users.forEach(user => {
            const userItems = StorageManager.getActivitiesForUser(user.id);
            userItems.forEach(item => {
                allItems.push({ ...item, userName: user.name, userId: user.id });
            });
        });
        
        // Get unique categories and users for filters
        const uniqueCategories = [...new Set(allItems.map(i => i.type))];
        const uniqueUsers = [...new Set(allItems.map(i => i.userName))];
        
        // Update category filter
        const categoryFilterContainer = document.getElementById('itemsPopupCategoryFilter');
        if (categoryFilterContainer) {
            categoryFilterContainer.innerHTML = `
                <button class="filter-capsule ${this.currentItemsCategoryFilter === 'all' ? 'active' : ''}" data-filter="all">All Categories</button>
                ${uniqueCategories.map(cat => `
                    <button class="filter-capsule ${this.currentItemsCategoryFilter === cat ? 'active' : ''}" data-filter="${cat}">${this.escapeHtml(cat)}</button>
                `).join('')}
            `;
            
            categoryFilterContainer.querySelectorAll('.filter-capsule').forEach(btn => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.filter;
                    this.currentItemsCategoryFilter = filter;
                    this.showItemsPopup();
                });
            });
        }
        
        // Update user filter
        const userFilterContainer = document.getElementById('itemsPopupUserFilter');
        if (userFilterContainer) {
            userFilterContainer.innerHTML = `
                <button class="filter-capsule ${this.currentItemsUserFilter === 'all' ? 'active' : ''}" data-filter="all">All Users</button>
                ${uniqueUsers.map(name => `
                    <button class="filter-capsule ${this.currentItemsUserFilter === name ? 'active' : ''}" data-filter="${name}">${this.escapeHtml(name)}</button>
                `).join('')}
            `;
            
            userFilterContainer.querySelectorAll('.filter-capsule').forEach(btn => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.filter;
                    this.currentItemsUserFilter = filter;
                    this.showItemsPopup();
                });
            });
        }
        
        // Apply filters
        let filteredItems = allItems;
        if (this.currentItemsCategoryFilter !== 'all') {
            filteredItems = filteredItems.filter(i => i.type === this.currentItemsCategoryFilter);
        }
        if (this.currentItemsUserFilter !== 'all') {
            filteredItems = filteredItems.filter(i => i.userName === this.currentItemsUserFilter);
        }
        
        container.innerHTML = filteredItems.map(item => `
            <div class="popup-item">
                <div class="popup-item-info">
                    <div class="popup-item-name">
                        <i class="fas fa-film"></i>
                        <span>${this.escapeHtml(item.title)}</span>
                    </div>
                    <div class="popup-item-stats">
                        <span class="popup-item-badge" style="background: ${this.getCategoryColor(item.type, item.userId)}">${item.type}</span>
                        <span class="popup-item-badge" style="background: #3498db">👤 ${this.escapeHtml(item.userName)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('itemsPopupModal').classList.add('active');
    }

    // ============================================
    // CATEGORIES POPUP WITH USER FILTER
    // ============================================
    static showCategoriesPopup() {
        const container = document.getElementById('categoriesPopupList');
        if (!container) return;
        
        let allCategories = [];
        this.users.forEach(user => {
            const categories = Object.keys(StorageManager.getCategoryColors(user.id));
            categories.forEach(cat => {
                allCategories.push({ 
                    name: cat, 
                    userName: user.name, 
                    userId: user.id, 
                    color: StorageManager.getCategoryColor(cat, user.id) 
                });
            });
        });
        
        // Remove duplicates for filter
        const uniqueUsers = [...new Set(allCategories.map(c => c.userName))];
        
        // Update user filter
        const userFilterContainer = document.getElementById('categoriesPopupUserFilter');
        if (userFilterContainer) {
            userFilterContainer.innerHTML = `
                <button class="filter-capsule ${this.currentCategoriesUserFilter === 'all' ? 'active' : ''}" data-filter="all">All Users</button>
                ${uniqueUsers.map(name => `
                    <button class="filter-capsule ${this.currentCategoriesUserFilter === name ? 'active' : ''}" data-filter="${name}">${this.escapeHtml(name)}</button>
                `).join('')}
            `;
            
            userFilterContainer.querySelectorAll('.filter-capsule').forEach(btn => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.filter;
                    this.currentCategoriesUserFilter = filter;
                    this.showCategoriesPopup();
                });
            });
        }
        
        // Apply filter
        let filteredCategories = allCategories;
        if (this.currentCategoriesUserFilter !== 'all') {
            filteredCategories = filteredCategories.filter(c => c.userName === this.currentCategoriesUserFilter);
        }
        
        // Remove duplicates by category name (for same user, keep one)
        const uniqueCategories = [];
        const seen = new Set();
        filteredCategories.forEach(cat => {
            const key = `${cat.name}_${cat.userId}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueCategories.push(cat);
            }
        });
        
        container.innerHTML = uniqueCategories.map(cat => `
            <div class="popup-item">
                <div class="popup-item-info">
                    <div class="popup-item-name">
                        <div class="category-color" style="background: ${cat.color}"></div>
                        <span>${this.escapeHtml(cat.name)}</span>
                    </div>
                    <div class="popup-item-stats">
                        <span class="popup-item-badge" style="background: #3498db">👤 ${this.escapeHtml(cat.userName)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('categoriesPopupModal').classList.add('active');
    }

    // ============================================
    // CLEAR FILTERS METHODS
    // ============================================
    static clearItemsPopupFilters() {
        this.currentItemsCategoryFilter = 'all';
        this.currentItemsUserFilter = 'all';
        this.showItemsPopup();
    }

    static clearCategoriesPopupFilters() {
        this.currentCategoriesUserFilter = 'all';
        this.showCategoriesPopup();
    }

    // ============================================
    // ACTIVITY STATS POPUP
    // ============================================
    static showActivityPopup(userId, statType, statLabel) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        const activities = StorageManager.getActivitiesForUser(userId);
        let filteredItems = [];
        
        switch(statType) {
            case 'total':
                filteredItems = activities;
                break;
            case 'favorites':
                filteredItems = activities.filter(a => a.isFavorite === true);
                break;
            case 'wishlist':
                filteredItems = activities.filter(a => a.status === 'plan-to-watch');
                break;
            case 'watching':
                filteredItems = activities.filter(a => a.status === 'watching');
                break;
            case 'completed':
                filteredItems = activities.filter(a => a.status === 'completed');
                break;
            case 'onHold':
                filteredItems = activities.filter(a => a.status === 'on-hold');
                break;
            case 'dropped':
                filteredItems = activities.filter(a => a.status === 'dropped');
                break;
            default:
                filteredItems = activities;
        }
        
        const container = document.getElementById('activityPopupList');
        const title = document.getElementById('activityPopupTitle');
        if (title) title.textContent = `${user.name} - ${statLabel} (${filteredItems.length})`;
        
        container.innerHTML = filteredItems.map(item => `
            <div class="popup-item">
                <div class="popup-item-info">
                    <div class="popup-item-name">
                        <i class="fas fa-film"></i>
                        <span>${this.escapeHtml(item.title)}</span>
                    </div>
                    <div class="popup-item-stats">
                        <span class="popup-item-badge" style="background: ${this.getCategoryColor(item.type, userId)}">${item.type}</span>
                        <span class="popup-item-badge" style="background: ${this.getStatusColor(item.status)}">${item.status}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        const activityPopup = document.getElementById('activityPopupModal');
        if (activityPopup) {
            activityPopup.style.zIndex = '2000';
            activityPopup.classList.add('active');
        }
    }

    static getStatusColor(status) {
        const colors = {
            'watching': '#3498db',
            'completed': '#2ecc71',
            'on-hold': '#f39c12',
            'dropped': '#e74c3c',
            'plan-to-watch': '#9b59b6'
        };
        return colors[status] || '#95a5a6';
    }

    // ============================================
    // ALL CATEGORIES SECTION
    // ============================================
    static loadAllCategoriesSection() {
        const container = document.getElementById('allCategoriesContainer');
        if (!container) return;
        
        const searchTerm = document.getElementById('searchAllCategories')?.value.toLowerCase() || '';
        let allCategoriesData = [];
        
        this.users.forEach(user => {
            const categories = Object.keys(user.categories || {});
            categories.forEach(cat => {
                allCategoriesData.push({
                    name: cat,
                    color: user.categories[cat] || StorageManager.getCategoryColor(cat, user.id),
                    userName: user.name,
                    userId: user.id
                });
            });
        });
        
        if (searchTerm) {
            allCategoriesData = allCategoriesData.filter(cat => 
                cat.name.toLowerCase().includes(searchTerm) || 
                cat.userName.toLowerCase().includes(searchTerm)
            );
        }
        
        container.innerHTML = allCategoriesData.map(cat => `
            <div class="all-category-capsule" style="background: ${cat.color}" data-category="${cat.name}" data-user-id="${cat.userId}" data-user-name="${cat.userName}">
                <span>${this.escapeHtml(cat.name)}</span>
                <span style="font-size: 0.7rem; opacity: 0.8;">(${this.escapeHtml(cat.userName)})</span>
                <button class="delete-category-icon" data-category="${cat.name}" data-user-id="${cat.userId}" title="Delete this category">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        document.querySelectorAll('.delete-category-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const category = btn.dataset.category;
                const userId = btn.dataset.userId;
                this.confirmDeleteCategoryFromAll(category, userId);
            });
        });
    }

    static confirmDeleteCategoryFromAll(category, userId) {
        const user = this.users.find(u => u.id === userId);
        this.pendingAction = { type: 'deleteCategoryFromAll', category, userId };
        document.getElementById('confirmMessage').innerHTML = `
            Are you sure you want to delete category "<strong>${this.escapeHtml(category)}</strong>"?<br><br>
            This will affect user: <strong>${user?.name}</strong><br>
            Items with this category will become uncategorized.<br><br>
            This action cannot be undone!
        `;
        document.getElementById('confirmModal').classList.add('active');
    }

    // ============================================
    // STORAGE CALCULATIONS
    // ============================================
    static calculateUserStorage(userId) {
        let totalBytes = 0;
        
        const profile = StorageManager.getProfile();
        if (profile.id === userId) {
            totalBytes += JSON.stringify(profile).length * 2;
        }
        
        const activities = StorageManager.getActivitiesForUser(userId);
        totalBytes += JSON.stringify(activities).length * 2;
        
        const categoryColors = StorageManager.getCategoryColors(userId);
        totalBytes += JSON.stringify(categoryColors).length * 2;
        
        const avatar = StorageManager.getUserAvatar(userId);
        if (avatar) {
            totalBytes += avatar.length * 2;
        }
        
        return totalBytes;
    }

    static calculateTotalStorage() {
        let totalBytes = 0;
        
        this.users.forEach(user => {
            totalBytes += this.calculateUserStorage(user.id);
        });
        
        const settings = localStorage.getItem('anime_tracker_settings');
        if (settings) totalBytes += settings.length * 2;
        
        const registry = localStorage.getItem(StorageManager.USERS_REGISTRY_KEY);
        if (registry) totalBytes += registry.length * 2;
        
        return totalBytes;
    }

    static formatBytes(bytes) {
        if (bytes === 0) return '0 KB';
        const mb = bytes / (1024 * 1024);
        if (mb >= 0.01) {
            return `${mb.toFixed(2)} MB`;
        } else {
            const kb = bytes / 1024;
            return `${kb.toFixed(2)} KB`;
        }
    }

    static getStoragePercentage() {
        const totalBytes = this.calculateTotalStorage();
        const limitBytes = this.STORAGE_LIMIT_MB * 1024 * 1024;
        return Math.min((totalBytes / limitBytes) * 100, 100);
    }

    static updateStorageDisplay() {
        const totalBytes = this.calculateTotalStorage();
        const percentage = this.getStoragePercentage();
        const formattedSize = this.formatBytes(totalBytes);
        
        const storageBarFill = document.getElementById('storageBarFill');
        const storagePercentage = document.getElementById('storagePercentage');
        const storageTotal = document.getElementById('storageTotal');
        
        if (storageBarFill) storageBarFill.style.width = `${percentage}%`;
        if (storagePercentage) storagePercentage.textContent = `${Math.round(percentage)}%`;
        if (storageTotal) storageTotal.textContent = formattedSize;
        
        const storageUsedInfo = document.getElementById('storageUsedInfo');
        if (storageUsedInfo) storageUsedInfo.textContent = formattedSize;
        
        console.log(`📊 [STORAGE] Total: ${formattedSize} (${Math.round(percentage)}% of limit)`);
    }

    static showStorageDetails() {
        const storageModal = document.getElementById('storageModal');
        const modalTotalStorage = document.getElementById('modalTotalStorage');
        const modalTotalUsers = document.getElementById('modalTotalUsers');
        const userStorageList = document.getElementById('userStorageList');
        
        const totalBytes = this.calculateTotalStorage();
        const userStorageData = this.users.map(user => ({
            ...user,
            storageBytes: this.calculateUserStorage(user.id),
            storageFormatted: this.formatBytes(this.calculateUserStorage(user.id))
        }));
        
        userStorageData.sort((a, b) => b.storageBytes - a.storageBytes);
        const maxStorage = Math.max(...userStorageData.map(u => u.storageBytes), 1);
        
        if (modalTotalStorage) modalTotalStorage.textContent = this.formatBytes(totalBytes);
        if (modalTotalUsers) modalTotalUsers.textContent = this.users.length;
        
        if (userStorageList) {
            userStorageList.innerHTML = userStorageData.map(user => {
                const percentage = (user.storageBytes / maxStorage) * 100;
                return `
                    <div class="storage-user-item">
                        <div class="storage-user-name">
                            <div class="storage-user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                            <span>${this.escapeHtml(user.name)}</span>
                        </div>
                        <div class="user-storage-mini">
                            <div class="storage-user-bar">
                                <div class="storage-user-bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="storage-user-size">${user.storageFormatted}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        storageModal.classList.add('active');
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================
    static loadAllUsers() {
        console.log('👥 [ADMIN] Loading all users...');
        const registry = StorageManager.getUsersRegistry();
        
        this.users = registry.map(user => {
            const activities = StorageManager.getActivitiesForUser(user.id);
            const categoryColors = StorageManager.getCategoryColors(user.id);
            
            return {
                ...user,
                itemCount: activities.length,
                categoryCount: Object.keys(categoryColors).length,
                activities: activities,
                categories: categoryColors
            };
        });
        
        console.log(`👥 [ADMIN] Loaded ${this.users.length} users`);
        this.renderUsers();
        this.loadAllCategoriesSection();
    }

    static renderUsers() {
        const container = document.getElementById('usersContainer');
        const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
        
        if (!container) return;
        
        let filteredUsers = this.users;
        if (searchTerm) {
            filteredUsers = this.users.filter(user => 
                user.name.toLowerCase().includes(searchTerm) ||
                (user.identifier && user.identifier.toLowerCase().includes(searchTerm)) ||
                user.id.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filteredUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>No users found</h3>
                    <p>Try a different search term</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredUsers.map(user => `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-info">
                    <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <div class="user-name">${this.escapeHtml(user.name)}</div>
                        <div class="user-email">${this.escapeHtml(user.identifier || 'No email')}</div>
                        <div class="user-id">ID: ${user.id.substring(0, 20)}...</div>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="user-stat"><span class="stat-value">${user.itemCount || 0}</span><span class="stat-label">Items</span></div>
                    <div class="user-stat"><span class="stat-value">${user.categoryCount || 0}</span><span class="stat-label">Categories</span></div>
                </div>
                <div class="user-actions">
                    <button class="view-btn" data-user-id="${user.id}"><i class="fas fa-eye"></i> View</button>
                    <button class="delete-btn" data-user-id="${user.id}"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.viewUserDetails(btn.dataset.userId));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.confirmDeleteUser(btn.dataset.userId));
        });
    }

    static viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        this.selectedUser = user;
        this.selectedUserItems.clear();
        
        const stats = {
            total: user.activities.length,
            favorites: user.activities.filter(a => a.isFavorite === true).length,
            wishlist: user.activities.filter(a => a.status === 'plan-to-watch').length,
            watching: user.activities.filter(a => a.status === 'watching').length,
            completed: user.activities.filter(a => a.status === 'completed').length,
            onHold: user.activities.filter(a => a.status === 'on-hold').length,
            dropped: user.activities.filter(a => a.status === 'dropped').length
        };
        
        document.getElementById('userInfoGrid').innerHTML = `
            <div class="info-item"><span class="label">Username</span><span class="value">${this.escapeHtml(user.name)}</span></div>
            <div class="info-item"><span class="label">Email/Phone</span><span class="value">${this.escapeHtml(user.identifier || 'Not set')}</span></div>
            <div class="info-item"><span class="label">User ID</span><span class="value">${user.id}</span></div>
            <div class="info-item"><span class="label">Account Created</span><span class="value">${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}</span></div>
            <div class="info-item"><span class="label">Last Login</span><span class="value">${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Unknown'}</span></div>
            <div class="info-item"><span class="label">Storage Used</span><span class="value">${this.formatBytes(this.calculateUserStorage(user.id))}</span></div>
        `;
        
        document.getElementById('userStatsGrid').innerHTML = `
            <div class="stat-item-card" data-stat="total"><span class="number">${stats.total}</span><span class="label">Total Items</span></div>
            <div class="stat-item-card" data-stat="favorites"><span class="number">${stats.favorites}</span><span class="label">Favorites</span></div>
            <div class="stat-item-card" data-stat="wishlist"><span class="number">${stats.wishlist}</span><span class="label">Wishlist</span></div>
            <div class="stat-item-card" data-stat="watching"><span class="number">${stats.watching}</span><span class="label">Watching</span></div>
            <div class="stat-item-card" data-stat="completed"><span class="number">${stats.completed}</span><span class="label">Completed</span></div>
            <div class="stat-item-card" data-stat="onHold"><span class="number">${stats.onHold}</span><span class="label">On Hold</span></div>
            <div class="stat-item-card" data-stat="dropped"><span class="number">${stats.dropped}</span><span class="label">Dropped</span></div>
        `;
        
        document.querySelectorAll('.stat-item-card').forEach(card => {
            const statType = card.dataset.stat;
            const label = card.querySelector('.label')?.textContent || statType;
            card.addEventListener('click', () => this.showActivityPopup(user.id, statType, label));
        });
        
        this.renderUserItems();
        
        const categories = Object.keys(user.categories || {});
        document.getElementById('userCategoriesList').innerHTML = categories.length > 0 ?
            categories.map(cat => `
                <div class="category-card" data-category="${cat}">
                    <div class="category-color" style="background: ${user.categories[cat]}"></div>
                    <span>${cat}</span>
                    <button class="delete-category-btn" data-category="${cat}"><i class="fas fa-trash"></i></button>
                </div>
            `).join('') :
            '<p style="text-align: center; padding: 20px;">No categories found</p>';
        
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteUserCategory(user.id, btn.dataset.category);
            });
        });
        
        document.getElementById('userDetailsModal').classList.add('active');
    }

    static renderUserItems() {
        const container = document.getElementById('userItemsList');
        if (!container || !this.selectedUser) return;
        
        container.innerHTML = this.selectedUser.activities.map(item => `
            <div class="user-item-card ${this.selectedUserItems.has(item.id) ? 'selected' : ''}" data-item-id="${item.id}">
                <input type="checkbox" class="item-checkbox" data-item-id="${item.id}" ${this.selectedUserItems.has(item.id) ? 'checked' : ''}>
                <div class="item-info">
                    <span class="item-title">${this.escapeHtml(item.title)}</span>
                    <span class="item-category" style="background: ${this.getCategoryColor(item.type, this.selectedUser.id)}">${item.type}</span>
                    <span class="item-status" style="background: ${this.getStatusColor(item.status)}20; color: ${this.getStatusColor(item.status)}">${item.status}</span>
                </div>
                <div class="item-actions">
                    <button class="delete-single-item-btn" data-item-id="${item.id}"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.item-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const itemId = cb.dataset.itemId;
                if (cb.checked) this.selectedUserItems.add(itemId);
                else this.selectedUserItems.delete(itemId);
                this.updateUserItemsSelectionUI();
            });
        });
        
        document.querySelectorAll('.delete-single-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteUserItem(this.selectedUser.id, btn.dataset.itemId);
            });
        });
        
        this.updateUserItemsSelectionUI();
    }

    static updateUserItemsSelectionUI() {
        const count = this.selectedUserItems.size;
        const total = this.selectedUser?.activities.length || 0;
        const countEl = document.getElementById('userItemsSelectionCount');
        if (countEl) countEl.textContent = `${count} selected out of ${total} items`;
        
        document.querySelectorAll('.user-item-card').forEach(card => {
            const itemId = card.dataset.itemId;
            if (this.selectedUserItems.has(itemId)) {
                card.classList.add('selected');
                const cb = card.querySelector('.item-checkbox');
                if (cb) cb.checked = true;
            } else {
                card.classList.remove('selected');
                const cb = card.querySelector('.item-checkbox');
                if (cb) cb.checked = false;
            }
        });
    }

    static selectAllUserItems() {
        this.selectedUser?.activities.forEach(item => this.selectedUserItems.add(item.id));
        this.updateUserItemsSelectionUI();
    }

    static deselectAllUserItems() {
        this.selectedUserItems.clear();
        this.updateUserItemsSelectionUI();
    }

    static clearUserItemsSelection() {
        this.selectedUserItems.clear();
        this.updateUserItemsSelectionUI();
    }

    static deleteSelectedUserItems(userId, itemIds) {
    let activities = StorageManager.getActivitiesForUser(userId);
    activities = activities.filter(a => !itemIds.includes(a.id));
    const storageKey = StorageManager.getUserStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(activities));
    
    this.selectedUserItems.clear();
    this.loadAllUsers();
    
    // Refresh the current user details if this is the selected user
    if (this.selectedUser && this.selectedUser.id === userId) {
        this.refreshCurrentUserDetails();
    }
    
    this.updateGlobalStats();
    this.updateStorageDisplay();
    this.showNotification(`${itemIds.length} items deleted successfully`, 'success');
}

    static deleteSelectedUserItems(userId, itemIds) {
        let activities = StorageManager.getActivitiesForUser(userId);
        activities = activities.filter(a => !itemIds.includes(a.id));
        const storageKey = StorageManager.getUserStorageKey(userId);
        localStorage.setItem(storageKey, JSON.stringify(activities));
        
        this.selectedUserItems.clear();
        this.loadAllUsers();
        if (this.selectedUser && this.selectedUser.id === userId) {
            this.selectedUser.activities = activities;
            this.renderUserItems();
        }
        this.updateGlobalStats();
        this.updateStorageDisplay();
        this.showNotification(`${itemIds.length} items deleted successfully`, 'success');
    }

    static confirmDeleteUserItem(userId, itemId) {
        this.pendingAction = { type: 'deleteItem', userId, itemId };
        document.getElementById('confirmMessage').innerHTML = 'Are you sure you want to delete this item? This action cannot be undone.';
        document.getElementById('confirmModal').classList.add('active');
    }

    static deleteUserItem(userId, itemId) {
    const activities = StorageManager.getActivitiesForUser(userId);
    const updatedActivities = activities.filter(a => a.id !== itemId);
    const storageKey = StorageManager.getUserStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
    
    this.loadAllUsers();
    
    // Refresh the current user details if this is the selected user
    if (this.selectedUser && this.selectedUser.id === userId) {
        this.refreshCurrentUserDetails();
    }
    
    this.updateGlobalStats();
    this.updateStorageDisplay();
    this.showNotification('Item deleted successfully', 'success');
}

    static deleteUserCategory(userId, category) {
    const activities = StorageManager.getActivitiesForUser(userId);
    const updatedActivities = activities.map(activity => {
        if (activity.type === category) {
            return { ...activity, type: 'uncategorized' };
        }
        return activity;
    });
    const storageKey = StorageManager.getUserStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
    
    const colors = StorageManager.getCategoryColors(userId);
    delete colors[category];
    const colorsKey = StorageManager.getUserCategoryColorsKey(userId);
    localStorage.setItem(colorsKey, JSON.stringify(colors));
    
    this.loadAllUsers();
    
    // Refresh the current user details if this is the selected user
    if (this.selectedUser && this.selectedUser.id === userId) {
        this.refreshCurrentUserDetails();
    }
    
    this.updateGlobalStats();
    this.updateStorageDisplay();
    this.loadAllCategoriesSection();
    this.showNotification(`Category "${category}" deleted`, 'success');
}

    static deleteUserCategory(userId, category) {
        const activities = StorageManager.getActivitiesForUser(userId);
        const updatedActivities = activities.map(activity => {
            if (activity.type === category) {
                return { ...activity, type: 'uncategorized' };
            }
            return activity;
        });
        const storageKey = StorageManager.getUserStorageKey(userId);
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        
        const colors = StorageManager.getCategoryColors(userId);
        delete colors[category];
        const colorsKey = StorageManager.getUserCategoryColorsKey(userId);
        localStorage.setItem(colorsKey, JSON.stringify(colors));
        
        this.loadAllUsers();
        if (this.selectedUser && this.selectedUser.id === userId) {
            this.selectedUser.activities = updatedActivities;
            this.selectedUser.categories = colors;
            this.viewUserDetails(userId);
        }
        this.updateGlobalStats();
        this.updateStorageDisplay();
        this.loadAllCategoriesSection();
        this.showNotification(`Category "${category}" deleted`, 'success');
    }

    static confirmDeleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        this.pendingAction = { type: 'deleteUser', userId };
        document.getElementById('confirmMessage').innerHTML = `Are you sure you want to delete user "<strong>${user?.name}</strong>"?<br><br>This will permanently delete:<br>• All user data<br>• All saved items (${user?.itemCount} items)<br>• All categories (${user?.categoryCount} categories)<br><br>This action cannot be undone!`;
        document.getElementById('confirmModal').classList.add('active');
    }

    static deleteUser(userId) {
        StorageManager.deleteUserAccount(userId);
        this.loadAllUsers();
        this.updateGlobalStats();
        this.updateStorageDisplay();
        this.loadAllCategoriesSection();
        
        if (this.selectedUser && this.selectedUser.id === userId) {
            document.getElementById('userDetailsModal').classList.remove('active');
            this.selectedUser = null;
        }
        
        this.showNotification('User deleted successfully', 'success');
    }

    static updateGlobalStats() {
        const totalUsers = this.users.length;
        const totalItems = this.users.reduce((sum, user) => sum + (user.itemCount || 0), 0);
        const totalCategories = this.users.reduce((sum, user) => sum + (user.categoryCount || 0), 0);
        
        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('totalCategories').textContent = totalCategories;
    }

    static updateSystemInfo() {
        const lastExport = localStorage.getItem('last_export_date');
        if (lastExport) {
            document.getElementById('lastExportInfo').textContent = new Date(lastExport).toLocaleString();
        }
        
        const storageLimitInfo = document.getElementById('storageLimitInfo');
        if (storageLimitInfo) storageLimitInfo.textContent = `${this.STORAGE_LIMIT_MB} MB`;
    }

    static setupEventListeners() {
        // Settings drawer
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsDrawer = document.getElementById('settingsDrawer');
        const closeDrawer = document.getElementById('closeDrawer');
        const drawerOverlay = document.getElementById('drawerOverlay');
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => settingsDrawer.classList.add('active'));
        }
        
        const closeDrawerHandler = () => settingsDrawer.classList.remove('active');
        if (closeDrawer) closeDrawer.addEventListener('click', closeDrawerHandler);
        if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawerHandler);
        
        // Storage bar click
        const storageBarContainer = document.getElementById('storageBarContainer');
        if (storageBarContainer) {
            storageBarContainer.addEventListener('click', () => this.showStorageDetails());
        }
        
        // Storage modal close
        const closeStorageModal = document.getElementById('closeStorageModal');
        const closeStorageModalBtn = document.getElementById('closeStorageModalBtn');
        if (closeStorageModal) closeStorageModal.addEventListener('click', () => this.closeStorageModal());
        if (closeStorageModalBtn) closeStorageModalBtn.addEventListener('click', () => this.closeStorageModal());
        
        // Theme selector
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            const savedTheme = localStorage.getItem('preferredTheme') || 'system';
            themeSelect.value = savedTheme;
            themeSelect.addEventListener('change', (e) => this.setTheme(e.target.value));
        }
        
        // Export all data
        const exportBtn = document.getElementById('exportAllDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAllData());
        }
        
        // Import data
        const importBtn = document.getElementById('importDataBtn');
        const importFileInput = document.getElementById('importFileInput');
        if (importBtn) {
            importBtn.addEventListener('click', () => importFileInput.click());
        }
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => this.importData(e.target.files[0]));
        }
        
        // Reset all data
        const resetBtn = document.getElementById('resetAllDataBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.confirmResetAllData());
        }
        
        // Admin logout
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.adminLogout());
        }
        
        // User modal close
        const closeUserModal = document.getElementById('closeUserModal');
        const closeUserModalBtn = document.getElementById('closeUserModalBtn');
        if (closeUserModal) closeUserModal.addEventListener('click', () => this.closeUserModal());
        if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', () => this.closeUserModal());
        
        // Delete user button in modal
        const deleteUserBtn = document.getElementById('deleteUserBtn');
        if (deleteUserBtn) {
            deleteUserBtn.addEventListener('click', () => {
                if (this.selectedUser) {
                    this.closeUserModal();
                    this.confirmDeleteUser(this.selectedUser.id);
                }
            });
        }
        
        // Selection controls in user details modal
        const selectAllBtn = document.getElementById('selectAllUserItems');
        const deselectAllBtn = document.getElementById('deselectAllUserItems');
        const clearSelectionBtn = document.getElementById('clearUserItemsSelection');
        const deleteSelectedBtn = document.getElementById('deleteSelectedUserItems');
        
        if (selectAllBtn) selectAllBtn.onclick = () => this.selectAllUserItems();
        if (deselectAllBtn) deselectAllBtn.onclick = () => this.deselectAllUserItems();
        if (clearSelectionBtn) clearSelectionBtn.onclick = () => this.clearUserItemsSelection();
        if (deleteSelectedBtn) deleteSelectedBtn.onclick = () => this.confirmDeleteSelectedUserItems();
        
        // Popup close buttons
        const closeUsersPopup = document.getElementById('closeUsersPopup');
        const closeItemsPopup = document.getElementById('closeItemsPopup');
        const closeCategoriesPopup = document.getElementById('closeCategoriesPopup');
        const closeActivityPopup = document.getElementById('closeActivityPopup');
        
        if (closeUsersPopup) closeUsersPopup.addEventListener('click', () => document.getElementById('usersPopupModal').classList.remove('active'));
        if (closeItemsPopup) closeItemsPopup.addEventListener('click', () => document.getElementById('itemsPopupModal').classList.remove('active'));
        if (closeCategoriesPopup) closeCategoriesPopup.addEventListener('click', () => document.getElementById('categoriesPopupModal').classList.remove('active'));
        if (closeActivityPopup) closeActivityPopup.addEventListener('click', () => document.getElementById('activityPopupModal').classList.remove('active'));
        
        // Clear filters buttons
        const clearItemsFilters = document.getElementById('clearItemsPopupFilters');
        const clearCategoriesFilters = document.getElementById('clearCategoriesPopupFilters');
        
        if (clearItemsFilters) clearItemsFilters.addEventListener('click', () => this.clearItemsPopupFilters());
        if (clearCategoriesFilters) clearCategoriesFilters.addEventListener('click', () => this.clearCategoriesPopupFilters());
        
        // Search all categories
        const searchAllCategories = document.getElementById('searchAllCategories');
        if (searchAllCategories) {
            searchAllCategories.addEventListener('input', () => this.loadAllCategoriesSection());
        }
        
        // Confirmation modal
        const closeConfirmModal = document.getElementById('closeConfirmModal');
        const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
        const confirmActionBtn = document.getElementById('confirmActionBtn');
        
        if (closeConfirmModal) closeConfirmModal.addEventListener('click', () => this.closeConfirmModal());
        if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', () => this.closeConfirmModal());
        if (confirmActionBtn) {
            confirmActionBtn.addEventListener('click', () => {
                if (this.pendingAction) {
                    switch (this.pendingAction.type) {
                        case 'deleteUser':
                            this.deleteUser(this.pendingAction.userId);
                            break;
                        case 'deleteItem':
                            this.deleteUserItem(this.pendingAction.userId, this.pendingAction.itemId);
                            break;
                        case 'deleteCategory':
                            this.deleteUserCategory(this.pendingAction.userId, this.pendingAction.category);
                            break;
                        case 'deleteSelectedItems':
                            this.deleteSelectedUserItems(this.pendingAction.userId, this.pendingAction.itemIds);
                            break;
                        case 'deleteCategoryFromAll':
                            this.deleteUserCategory(this.pendingAction.userId, this.pendingAction.category);
                            break;
                        case 'resetAll':
                            this.resetAllData();
                            break;
                    }
                    this.closeConfirmModal();
                    this.pendingAction = null;
                }
            });
        }
        
        // Search users
        const searchInput = document.getElementById('searchUsers');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.renderUsers());
        }
        
        // Close modals on overlay click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
                document.getElementById('settingsDrawer')?.classList.remove('active');
            }
        });
    }

    static closeStorageModal() {
        document.getElementById('storageModal').classList.remove('active');
    }

    static confirmResetAllData() {
        this.pendingAction = { type: 'resetAll' };
        document.getElementById('confirmMessage').innerHTML = `
            <strong style="color: #e74c3c;">⚠️ DANGER: This action cannot be undone!</strong><br><br>
            Are you sure you want to delete ALL users and ALL data?<br>
            This will permanently delete:<br>
            • All user accounts<br>
            • All saved items<br>
            • All categories<br>
            • All settings<br><br>
            <strong>Type "DELETE ALL" to confirm:</strong>
            <input type="text" id="deleteConfirmInput" style="margin-top: 10px; padding: 8px; width: 100%; border: 1px solid #e74c3c; border-radius: 5px;">
        `;
        document.getElementById('confirmModal').classList.add('active');
        
        const confirmInput = document.getElementById('deleteConfirmInput');
        const confirmBtn = document.getElementById('confirmActionBtn');
        if (confirmInput && confirmBtn) {
            confirmInput.addEventListener('input', () => {
                confirmBtn.disabled = confirmInput.value !== 'DELETE ALL';
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            });
        }
    }

    static resetAllData() {
        const registry = StorageManager.getUsersRegistry();
        registry.forEach(user => {
            StorageManager.deleteUserAccount(user.id);
        });
        
        localStorage.removeItem('anime_tracker_settings');
        localStorage.removeItem('anime_tracker_profile');
        localStorage.removeItem('user_logged_in');
        
        this.showNotification('All data has been reset. Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }

    static exportAllData() {
        const exportData = {
            users: this.users,
            exportDate: new Date().toISOString(),
            version: '1.0',
            totalUsers: this.users.length,
            totalItems: this.users.reduce((sum, u) => sum + u.itemCount, 0),
            totalStorage: this.formatBytes(this.calculateTotalStorage())
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-all-users-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        localStorage.setItem('last_export_date', new Date().toISOString());
        this.updateSystemInfo();
        this.showNotification('All users data exported successfully!', 'success');
    }

    static importData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.users && Array.isArray(data.users)) {
                    if (confirm(`Import data for ${data.users.length} users? This will merge with existing data.`)) {
                        for (const userData of data.users) {
                            const existingUser = StorageManager.getUserByIdentifier(userData.identifier);
                            if (!existingUser) {
                                const newUser = StorageManager.registerUser(
                                    userData.identifier,
                                    userData.identifierType || 'email',
                                    userData.name
                                );
                                
                                if (userData.activities && userData.activities.length > 0) {
                                    const storageKey = StorageManager.getUserStorageKey(newUser.id);
                                    localStorage.setItem(storageKey, JSON.stringify(userData.activities));
                                }
                                
                                if (userData.categories && Object.keys(userData.categories).length > 0) {
                                    const colorsKey = StorageManager.getUserCategoryColorsKey(newUser.id);
                                    localStorage.setItem(colorsKey, JSON.stringify(userData.categories));
                                }
                            }
                        }
                        
                        this.loadAllUsers();
                        this.updateGlobalStats();
                        this.updateStorageDisplay();
                        this.showNotification('Data imported successfully!', 'success');
                    }
                } else {
                    throw new Error('Invalid backup file format');
                }
            } catch (error) {
                this.showNotification('Error importing file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    static adminLogout() {
        if (confirm('Are you sure you want to logout from Admin Panel?')) {
            StorageManager.clearCurrentUser();
            localStorage.removeItem('user_logged_in');
            this.showNotification('Logged out successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }
    }

    static closeUserModal() {
        document.getElementById('userDetailsModal').classList.remove('active');
        this.selectedUser = null;
    }

    static closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
        this.pendingAction = null;
    }

    static setTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('preferredTheme', theme);
        
        if (typeof ThemeManager !== 'undefined' && ThemeManager.setTheme) {
            ThemeManager.setTheme(theme);
        }
    }

    static getCategoryColor(category, userId) {
        if (typeof StorageManager !== 'undefined' && StorageManager.getCategoryColor) {
            return StorageManager.getCategoryColor(category, userId);
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

    static loadUserSettings() {
        const settings = JSON.parse(localStorage.getItem('anime_tracker_settings') || '{}');
        const savedTheme = ThemeManager?.getSavedTheme?.() || 'system';

        const themeSelectors = [
            document.getElementById('themeSelector'),
            document.getElementById('themeSelect')
        ].filter(Boolean);

        themeSelectors.forEach(themeSelector => {
            themeSelector.value = savedTheme;
            themeSelector.addEventListener('change', (e) => {
                const newTheme = e.target.value;
                console.log(`🎨 [THEME] User changed theme to: ${newTheme}`);

                ThemeManager.setTheme(newTheme);
                this.setTheme(newTheme);

                this.showNotification(`Theme changed to ${newTheme}`, 'success', 1500);
            });
        });

        if (settings.theme && themeSelectors.length === 0) {
            ThemeManager.setTheme(settings.theme);
            this.setTheme(settings.theme);
        }
    }

    static loadAllUsersSettings() {
        console.log('⚙️ [ADMIN] Loading all user settings');
    }
    // Add this method to refresh user details without closing the modal
static refreshCurrentUserDetails() {
    if (!this.selectedUser) return;
    
    console.log('🔄 [ADMIN] Refreshing user details for:', this.selectedUser.name);
    
    // Reload all users data first
    this.loadAllUsers();
    
    // Find the updated user data
    const updatedUser = this.users.find(u => u.id === this.selectedUser.id);
    if (!updatedUser) {
        // User might have been deleted
        this.closeUserModal();
        return;
    }
    
    // Update the selected user reference
    this.selectedUser = updatedUser;
    
    // Recalculate stats
    const stats = {
        total: updatedUser.activities.length,
        favorites: updatedUser.activities.filter(a => a.isFavorite === true).length,
        wishlist: updatedUser.activities.filter(a => a.status === 'plan-to-watch').length,
        watching: updatedUser.activities.filter(a => a.status === 'watching').length,
        completed: updatedUser.activities.filter(a => a.status === 'completed').length,
        onHold: updatedUser.activities.filter(a => a.status === 'on-hold').length,
        dropped: updatedUser.activities.filter(a => a.status === 'dropped').length
    };
    
    // Update User Info Grid
    document.getElementById('userInfoGrid').innerHTML = `
        <div class="info-item"><span class="label">Username</span><span class="value">${this.escapeHtml(updatedUser.name)}</span></div>
        <div class="info-item"><span class="label">Email/Phone</span><span class="value">${this.escapeHtml(updatedUser.identifier || 'Not set')}</span></div>
        <div class="info-item"><span class="label">User ID</span><span class="value">${updatedUser.id}</span></div>
        <div class="info-item"><span class="label">Account Created</span><span class="value">${updatedUser.createdAt ? new Date(updatedUser.createdAt).toLocaleString() : 'Unknown'}</span></div>
        <div class="info-item"><span class="label">Last Login</span><span class="value">${updatedUser.lastLogin ? new Date(updatedUser.lastLogin).toLocaleString() : 'Unknown'}</span></div>
        <div class="info-item"><span class="label">Storage Used</span><span class="value">${this.formatBytes(this.calculateUserStorage(updatedUser.id))}</span></div>
    `;
    
    // Update Activity Stats Grid (preserving click handlers)
    const statsGrid = document.getElementById('userStatsGrid');
    statsGrid.innerHTML = `
        <div class="stat-item-card" data-stat="total"><span class="number">${stats.total}</span><span class="label">Total Items</span></div>
        <div class="stat-item-card" data-stat="favorites"><span class="number">${stats.favorites}</span><span class="label">Favorites</span></div>
        <div class="stat-item-card" data-stat="wishlist"><span class="number">${stats.wishlist}</span><span class="label">Wishlist</span></div>
        <div class="stat-item-card" data-stat="watching"><span class="number">${stats.watching}</span><span class="label">Watching</span></div>
        <div class="stat-item-card" data-stat="completed"><span class="number">${stats.completed}</span><span class="label">Completed</span></div>
        <div class="stat-item-card" data-stat="onHold"><span class="number">${stats.onHold}</span><span class="label">On Hold</span></div>
        <div class="stat-item-card" data-stat="dropped"><span class="number">${stats.dropped}</span><span class="label">Dropped</span></div>
    `;
    
    // Reattach click handlers to stat cards
    statsGrid.querySelectorAll('.stat-item-card').forEach(card => {
        const statType = card.dataset.stat;
        const label = card.querySelector('.label')?.textContent || statType;
        card.addEventListener('click', () => this.showActivityPopup(updatedUser.id, statType, label));
    });
    
    // Update Items List
    this.selectedUserItems.clear(); // Clear selections since items may have changed
    this.renderUserItems();
    
    // Update Categories List
    const categories = Object.keys(updatedUser.categories || {});
    document.getElementById('userCategoriesList').innerHTML = categories.length > 0 ?
        categories.map(cat => `
            <div class="category-card" data-category="${cat}">
                <div class="category-color" style="background: ${updatedUser.categories[cat]}"></div>
                <span>${cat}</span>
                <button class="delete-category-btn" data-category="${cat}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('') :
        '<p style="text-align: center; padding: 20px;">No categories found</p>';
    
    // Reattach category delete handlers
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeleteUserCategory(updatedUser.id, btn.dataset.category);
        });
    });
    
    console.log('✅ [ADMIN] User details refreshed');
}
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    AdminManager.init();
});