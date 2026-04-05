class WishlistManager {
    static currentUser = null;
    static wishlistItems = [];
    static currentCategoryFilter = 'all';
    static currentPriorityFilter = 'all';
    static currentPriority = 'medium';
    static pendingDeleteId = null;
    static allCategories = new Set();

    static init() {
        console.log('🚀 [WISHLIST] Initializing Wishlist Page...');
        this.createParticleBackground();
        if (!this.checkUserLoggedIn()) return;
        this.loadWishlist();
        this.loadAllCategories();
        this.setupEventListeners();
        this.setupTimeAndGreeting();
        this.loadUserSettings();
        this.updateCategoryCapsules();
        this.updatePriorityFilters();
        this.renderWishlist();
        this.updateSummaryStats();
        console.log(`✅ [WISHLIST] Initialized with ${this.wishlistItems.length} items`);
    }

    static loadAllCategories() {
        this.allCategories.clear();
        if (typeof StorageManager !== 'undefined' && StorageManager.getCategories) {
            const categories = StorageManager.getCategories();
            categories.forEach(cat => this.allCategories.add(cat));
        }
        // Also add categories from wishlist items
        this.wishlistItems.forEach(item => {
            if (item.type) this.allCategories.add(item.type);
        });
        console.log(`📁 [WISHLIST] Loaded ${this.allCategories.size} categories`);
    }

    static updateFormCategories() {
        const categories = Array.from(this.allCategories).sort();
        const categorySelects = ['itemCategory', 'moveCategory'];
        
        categorySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                select.appendChild(option);
            });
            if (currentValue && categories.includes(currentValue)) select.value = currentValue;
        });
    }

    static addNewCategory(selectId) {
        const newCategory = prompt('Enter new category name:');
        if (newCategory && newCategory.trim()) {
            const category = newCategory.trim().toLowerCase();
            this.allCategories.add(category);
            this.updateFormCategories();
            
            const select = document.getElementById(selectId);
            if (select) select.value = category;
            this.showNotification(`Category "${newCategory.trim()}" added!`, 'success');
            this.updateCategoryCapsules();
        }
    }

    static createParticleBackground() {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: fixed; width: ${Math.random() * 4 + 2}px; height: ${Math.random() * 4 + 2}px;
                top: ${Math.random() * 100}%; left: ${Math.random() * 100}%;
                animation: floatParticle ${Math.random() * 8 + 5}s ease-in-out infinite;
                animation-delay: ${Math.random() * 5}s; opacity: ${Math.random() * 0.5 + 0.2};
                background: radial-gradient(circle, rgba(243,156,18,0.4), transparent); border-radius: 50%;
                pointer-events: none; z-index: 0;
            `;
            document.body.appendChild(particle);
        }
    }

    static showHeartsAnimation() {
        const container = document.getElementById('heartsContainer');
        if (!container) return;
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.className = 'heart';
                heart.innerHTML = ['❤️', '💖', '💗', '💓', '💕'][Math.floor(Math.random() * 5)];
                heart.style.cssText = `position: absolute; left: ${Math.random() * 100}%; font-size: ${Math.random() * 1.2 + 0.8}rem; animation: floatHeart ${Math.random() * 2 + 2}s ease-out forwards;`;
                container.appendChild(heart);
                setTimeout(() => heart.remove(), 3000);
            }, i * 80);
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
            this.showNotification('Please login to continue', 'info', 2000);
            setTimeout(() => window.location.href = 'login.html', 1500);
            return false;
        }
        this.currentUser = currentUser || { id: profile.id, identifier: profile.identifier, name: profile.name };
        console.log('✅ [WISHLIST] User logged in:', this.currentUser?.name);
        return true;
    }

    static loadWishlist() {
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            const allActivities = StorageManager.getActivities();
            this.wishlistItems = allActivities.filter(activity => activity.status === 'plan-to-watch');
        } else {
            const storageKey = `user_data_${this.currentUser?.id}`;
            const allActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
            this.wishlistItems = allActivities.filter(activity => activity.status === 'plan-to-watch');
        }
        console.log(`📊 [WISHLIST] Loaded ${this.wishlistItems.length} wishlist items`);
    }

    static setupTimeAndGreeting() {
        const updateTime = () => {
            const now = new Date();
            const dateEl = document.getElementById('currentDate');
            const timeEl = document.getElementById('currentTime');
            const greetingEl = document.getElementById('greetingTime');
            const userNameEl = document.getElementById('userName');
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
            if (userNameEl && this.currentUser) userNameEl.textContent = this.currentUser.name;
        };
        updateTime();
        setInterval(updateTime, 60000);
        this.loadAvatar();
    }

    static loadAvatar() {
        const avatarKey = `user_avatar_${this.currentUser?.id}`;
        const savedAvatar = localStorage.getItem(avatarKey);
        const avatarImg = document.getElementById('avatarImage');
        if (avatarImg) {
            if (savedAvatar && savedAvatar !== 'null') avatarImg.src = savedAvatar;
            else avatarImg.src = `https://ui-avatars.com/api/?name=${(this.currentUser?.name || 'User').charAt(0).toUpperCase()}&background=3498db&color=fff&size=60`;
        }
    }

    static updateCategoryCapsules() {
        const container = document.getElementById('categoryCapsules');
        if (!container) return;
        let capsulesHtml = '<button class="capsule active" data-category="all">All</button>';
        Array.from(this.allCategories).sort().forEach(category => {
            const count = this.wishlistItems.filter(item => item.type === category).length;
            capsulesHtml += `<button class="capsule" data-category="${category}">${category.charAt(0).toUpperCase() + category.slice(1)}<span class="count-badge" style="margin-left: 6px; font-size: 0.7rem;">${count}</span></button>`;
        });
        container.innerHTML = capsulesHtml;
        document.querySelectorAll('#categoryCapsules .capsule').forEach(capsule => {
            capsule.addEventListener('click', () => this.setCategoryFilter(capsule.dataset.category));
        });
    }

    static updatePriorityFilters() {
        const container = document.getElementById('priorityCapsules');
        if (!container) return;
        document.querySelectorAll('#priorityCapsules .capsule').forEach(capsule => {
            capsule.addEventListener('click', () => this.setPriorityFilter(capsule.dataset.priority));
        });
    }

    static setCategoryFilter(category) {
        document.querySelectorAll('#categoryCapsules .capsule').forEach(c => c.classList.remove('active'));
        const activeCapsule = document.querySelector(`#categoryCapsules .capsule[data-category="${category}"]`);
        if (activeCapsule) activeCapsule.classList.add('active');
        this.currentCategoryFilter = category;
        this.renderWishlist();
    }

    static setPriorityFilter(priority) {
        document.querySelectorAll('#priorityCapsules .capsule').forEach(c => c.classList.remove('active'));
        const activeCapsule = document.querySelector(`#priorityCapsules .capsule[data-priority="${priority}"]`);
        if (activeCapsule) activeCapsule.classList.add('active');
        this.currentPriorityFilter = priority;
        this.renderWishlist();
    }

    static updateSummaryStats() {
        const totalItems = this.wishlistItems.length;
        const highPriority = this.wishlistItems.filter(item => item.priority === 'high').length;
        const today = new Date();
        const upcoming = this.wishlistItems.filter(item => {
            if (!item.releaseDate) return false;
            const daysDiff = Math.ceil((new Date(item.releaseDate) - today) / (1000 * 60 * 60 * 24));
            return daysDiff > 0 && daysDiff <= 30;
        }).length;
        const totalEl = document.getElementById('totalWishlist');
        const highEl = document.getElementById('highPriorityCount');
        const upcomingEl = document.getElementById('upcomingCount');
        if (totalEl) totalEl.textContent = totalItems;
        if (highEl) highEl.textContent = highPriority;
        if (upcomingEl) upcomingEl.textContent = upcoming;
    }

    static renderWishlist() {
        const container = document.getElementById('wishlistContainer');
        const emptyState = document.getElementById('emptyState');
        if (!container) return;
        
        let filteredItems = this.wishlistItems;
        if (this.currentCategoryFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.type === this.currentCategoryFilter);
        }
        if (this.currentPriorityFilter !== 'all') {
            filteredItems = filteredItems.filter(item => (item.priority || 'medium') === this.currentPriorityFilter);
        }
        
        if (filteredItems.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = filteredItems.map(item => this.createWishlistCard(item)).join('');
        this.attachCardEventListeners();
    }

    static createWishlistCard(item) {
        const priorityClass = item.priority || 'medium';
        const priorityIcon = { high: 'fa-arrow-up', medium: 'fa-minus', low: 'fa-arrow-down' }[priorityClass];
        const priorityText = { high: 'High', medium: 'Medium', low: 'Low' }[priorityClass];
        const releaseDate = item.releaseDate ? new Date(item.releaseDate) : null;
        const countdown = this.getCountdown(releaseDate);
        return `
            <div class="wishlist-card" data-id="${item.id}">
                <div class="wishlist-card-header">
                    <div>
                        <h3 class="wishlist-title">${this.escapeHtml(item.title)}</h3>
                        <div class="wishlist-badges">
                            <span class="wishlist-type" style="background: ${this.getCategoryColor(item.type)}">${item.type.toUpperCase()}</span>
                            <span class="priority-badge priority-${priorityClass}"><i class="fas ${priorityIcon}"></i> ${priorityText}</span>
                        </div>
                    </div>
                </div>
                <div class="wishlist-card-body">
                    ${releaseDate ? `<div class="release-info"><div class="release-date"><i class="fas fa-calendar"></i> <span>Release: ${releaseDate.toLocaleDateString()}</span></div>${countdown ? `<div class="countdown">${countdown}</div>` : ''}</div>` : ''}
                    ${item.expectedEpisodes ? `<div class="release-info"><i class="fas fa-chart-line"></i> <span>Expected: ${this.escapeHtml(item.expectedEpisodes)}</span></div>` : ''}
                    ${item.notes ? `<div class="wishlist-notes"><i class="fas fa-quote-left"></i> <p>${this.escapeHtml(item.notes)}</p></div>` : ''}
                </div>
                <div class="wishlist-card-footer">
                    <button class="wishlist-action-btn move-btn" data-id="${item.id}"><i class="fas fa-exchange-alt"></i> Move</button>
                    <button class="wishlist-action-btn favorite-btn" data-id="${item.id}"><i class="fas fa-star"></i> Fav</button>
                    <button class="wishlist-action-btn edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="wishlist-action-btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i> Del</button>
                </div>
            </div>
        `;
    }

    static attachCardEventListeners() {
        document.querySelectorAll('.move-btn').forEach(btn => btn.addEventListener('click', () => this.openMoveModal(btn.dataset.id)));
        document.querySelectorAll('.favorite-btn').forEach(btn => btn.addEventListener('click', () => this.addToFavorites(btn.dataset.id)));
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => this.openEditModal(btn.dataset.id)));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => this.showDeleteConfirmModal(btn.dataset.id)));
    }

    static showDeleteConfirmModal(itemId) {
        const item = this.wishlistItems.find(i => i.id === itemId);
        if (!item) return;
        this.pendingDeleteId = itemId;
        const msgEl = document.getElementById('deleteConfirmMessage');
        if (msgEl) msgEl.innerHTML = `Are you sure you want to delete "<strong>${this.escapeHtml(item.title)}</strong>" from your wishlist?`;
        document.getElementById('deleteConfirmModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static closeDeleteConfirmModal() {
        document.getElementById('deleteConfirmModal').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
        document.body.style.overflow = '';
        this.pendingDeleteId = null;
    }

    static deleteItem() {
        if (!this.pendingDeleteId) return;
        this.wishlistItems = this.wishlistItems.filter(item => item.id !== this.pendingDeleteId);
        let allActivities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            allActivities = StorageManager.getActivities();
        } else {
            const storageKey = `user_data_${this.currentUser?.id}`;
            allActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
        const updatedActivities = allActivities.filter(activity => activity.id !== this.pendingDeleteId);
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        this.loadAllCategories();
        this.updateCategoryCapsules();
        this.renderWishlist();
        this.updateSummaryStats();
        this.showNotification('Item removed from wishlist', 'success');
        this.closeDeleteConfirmModal();
    }

    static openMoveModal(itemId) {
        const item = this.wishlistItems.find(i => i.id === itemId);
        if (!item) return;
        document.getElementById('moveItemId').value = item.id;
        document.getElementById('moveTitle').value = item.title;
        document.getElementById('moveCategory').value = item.type || '';
        document.getElementById('moveProgress').value = '';
        this.updateFormCategories();
        this.setupStatusCapsules();
        document.getElementById('moveModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static setupStatusCapsules() {
        document.querySelectorAll('.status-capsule').forEach(cap => {
            cap.addEventListener('click', () => {
                document.querySelectorAll('.status-capsule').forEach(c => c.classList.remove('active'));
                cap.classList.add('active');
            });
        });
    }

    static getSelectedStatus() {
        const activeCap = document.querySelector('.status-capsule.active');
        return activeCap ? activeCap.dataset.status : 'watching';
    }

    static openEditModal(itemId) {
        const item = this.wishlistItems.find(i => i.id === itemId);
        if (!item) return;
        document.getElementById('editItemId').value = item.id;
        document.getElementById('itemTitle').value = item.title;
        document.getElementById('itemCategory').value = item.type || '';
        document.getElementById('releaseDate').value = item.releaseDate || '';
        document.getElementById('expectedEpisodes').value = item.expectedEpisodes || '';
        document.getElementById('wishlistNotes').value = item.notes || '';
        const priority = item.priority || 'medium';
        document.querySelectorAll('.priority-capsule').forEach(cap => {
            if (cap.dataset.priority === priority) cap.classList.add('active');
            else cap.classList.remove('active');
        });
        this.currentPriority = priority;
        this.updateFormCategories();
        document.getElementById('modalTitle').textContent = 'Edit Wishlist Item';
        document.getElementById('wishlistModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static addToFavorites(itemId) {
        const item = this.wishlistItems.find(i => i.id === itemId);
        if (!item) return;
        let allActivities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            allActivities = StorageManager.getActivities();
        } else {
            const storageKey = `user_data_${this.currentUser?.id}`;
            allActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
        const updatedActivities = allActivities.map(activity => {
            if (activity.id === itemId) return { ...activity, isFavorite: true };
            return activity;
        });
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        this.showNotification('Added to favorites!', 'success');
        this.showHeartsAnimation();
    }

    static moveToActive() {
        const itemId = document.getElementById('moveItemId').value;
        const newCategory = document.getElementById('moveCategory').value;
        const newStatus = this.getSelectedStatus();
        const newProgress = document.getElementById('moveProgress').value;
        if (!newCategory) { this.showNotification('Please select a category', 'error'); return; }
        let allActivities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            allActivities = StorageManager.getActivities();
        } else {
            const storageKey = `user_data_${this.currentUser?.id}`;
            allActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
        const updatedActivities = allActivities.map(activity => {
            if (activity.id === itemId) return { ...activity, type: newCategory, status: newStatus, progress: newProgress, lastUpdated: new Date().toISOString() };
            return activity;
        });
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        this.loadWishlist();
        this.loadAllCategories();
        this.updateCategoryCapsules();
        this.renderWishlist();
        this.updateSummaryStats();
        this.closeMoveModal();
        this.showNotification('Item moved to active list!', 'success');
        this.showHeartsAnimation();
    }

    static addToWishlist() {
        const title = document.getElementById('itemTitle').value.trim();
        const category = document.getElementById('itemCategory').value;
        const releaseDate = document.getElementById('releaseDate').value;
        const expectedEpisodes = document.getElementById('expectedEpisodes').value;
        const notes = document.getElementById('wishlistNotes').value;
        const editId = document.getElementById('editItemId').value;
        if (!title) { this.showNotification('Please enter a title', 'error'); return; }
        if (!category) { this.showNotification('Please select a category', 'error'); return; }
        
        const activity = {
            id: editId || Date.now().toString(),
            title: title, type: category, status: 'plan-to-watch', priority: this.currentPriority,
            releaseDate: releaseDate || null, expectedEpisodes: expectedEpisodes || null, notes: notes || '',
            progress: '', isFavorite: false,
            addedDate: editId ? (this.wishlistItems.find(i => i.id === editId)?.addedDate || new Date().toISOString()) : new Date().toISOString(),
            lastUpdated: new Date().toISOString(), userId: this.currentUser.id, userIdentifier: this.currentUser.identifier
        };
        
        let allActivities = [];
        if (typeof StorageManager !== 'undefined' && StorageManager.getActivities) {
            allActivities = StorageManager.getActivities();
        } else {
            const storageKey = `user_data_${this.currentUser?.id}`;
            allActivities = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
        
        if (editId) {
            const index = allActivities.findIndex(a => a.id === editId);
            if (index !== -1) allActivities[index] = activity;
            this.showNotification('Wishlist item updated!', 'success');
        } else {
            allActivities.push(activity);
            this.showNotification('Added to wishlist!', 'success');
            this.showHeartsAnimation();
        }
        
        const storageKey = `user_data_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(allActivities));
        this.closeWishlistModal();
        this.loadWishlist();
        this.loadAllCategories();
        this.updateCategoryCapsules();
        this.renderWishlist();
        this.updateSummaryStats();
    }

    static getCountdown(releaseDate) {
        if (!releaseDate) return null;
        const diffDays = Math.ceil((releaseDate - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'Released';
        if (diffDays === 0) return 'Today!';
        if (diffDays <= 7) return `${diffDays} days left`;
        return null;
    }

    static getCategoryColor(category) {
        const colors = { anime: '#3498db', series: '#9b59b6', manga: '#e74c3c', manwha: '#f39c12', manhua: '#1abc9c' };
        return colors[category] || '#3498db';
    }

    static setupEventListeners() {
        document.getElementById('menuToggle')?.addEventListener('click', () => this.toggleSidePanel('menuPanel'));
        document.getElementById('settingsToggle')?.addEventListener('click', () => this.toggleSidePanel('settingsPanel'));
        document.getElementById('closeMenu')?.addEventListener('click', () => this.closeSidePanel('menuPanel'));
        document.getElementById('closeSettings')?.addEventListener('click', () => this.closeSidePanel('settingsPanel'));
        document.getElementById('overlay')?.addEventListener('click', () => this.closeAllPanels());
        document.getElementById('addWishlistBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('emptyAddBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('closeWishlistModal')?.addEventListener('click', () => this.closeWishlistModal());
        document.getElementById('cancelWishlistBtn')?.addEventListener('click', () => this.closeWishlistModal());
        document.getElementById('wishlistForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.addToWishlist(); });
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => this.addNewCategory('itemCategory'));
        document.getElementById('moveAddCategoryBtn')?.addEventListener('click', () => this.addNewCategory('moveCategory'));
        document.getElementById('closeMoveModal')?.addEventListener('click', () => this.closeMoveModal());
        document.getElementById('cancelMoveBtn')?.addEventListener('click', () => this.closeMoveModal());
        document.getElementById('resetMoveBtn')?.addEventListener('click', () => document.getElementById('moveForm').reset());
        document.getElementById('moveForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.moveToActive(); });
        document.getElementById('closeDeleteConfirmModal')?.addEventListener('click', () => this.closeDeleteConfirmModal());
        document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => this.closeDeleteConfirmModal());
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => this.deleteItem());
        document.querySelectorAll('.priority-capsule').forEach(cap => {
            cap.addEventListener('click', () => {
                document.querySelectorAll('.priority-capsule').forEach(c => c.classList.remove('active'));
                cap.classList.add('active');
                this.currentPriority = cap.dataset.priority;
            });
        });
        document.getElementById('themeSelector')?.addEventListener('change', (e) => this.setTheme(e.target.value));
        document.getElementById('exportData')?.addEventListener('click', () => this.exportData());
        document.getElementById('importData')?.addEventListener('click', () => document.getElementById('fileImport').click());
        document.getElementById('fileImport')?.addEventListener('change', (e) => this.importData(e.target.files[0]));
        document.getElementById('resetSettings')?.addEventListener('click', () => this.resetSettings());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeWishlistModal(); this.closeMoveModal(); this.closeDeleteConfirmModal(); this.closeAllPanels();
            }
        });
    }

    static openAddModal() {
        document.getElementById('editItemId').value = '';
        document.getElementById('itemTitle').value = '';
        document.getElementById('itemCategory').value = '';
        document.getElementById('releaseDate').value = '';
        document.getElementById('expectedEpisodes').value = '';
        document.getElementById('wishlistNotes').value = '';
        document.querySelectorAll('.priority-capsule').forEach(cap => {
            if (cap.dataset.priority === 'medium') cap.classList.add('active');
            else cap.classList.remove('active');
        });
        this.currentPriority = 'medium';
        this.updateFormCategories();
        document.getElementById('modalTitle').textContent = 'Add to Wishlist';
        document.getElementById('wishlistModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static closeWishlistModal() {
        document.getElementById('wishlistModal')?.classList.remove('active');
        document.getElementById('overlay')?.classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('wishlistForm')?.reset();
    }

    static closeMoveModal() {
        document.getElementById('moveModal')?.classList.remove('active');
        document.getElementById('overlay')?.classList.remove('active');
        document.body.style.overflow = '';
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
        localStorage.setItem('anime_tracker_settings', JSON.stringify({ theme: 'system', notifications: true }));
        this.loadUserSettings();
        this.showNotification('Settings reset!', 'success');
    }

    static escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }
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

// Use this to get current theme code (theme0, theme1, theme2)
function getCurrentThemeCode() {
    const currentTheme = ThemeManager.getSavedTheme();
    return ThemeManager.getThemeCode(currentTheme);
}

// Example usage:
console.log(`Current theme code: ${getCurrentThemeCode()}`);
// Output: "theme0", "theme1", or "theme2"

// Initialize
document.addEventListener('DOMContentLoaded', () => { WishlistManager.init(); });