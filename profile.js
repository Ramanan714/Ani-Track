class ProfileManager {
    static userProfile = null;
    static activities = [];
    static avatarUrl = null;
    static categoryChart = null;
    static statusChart = null;
    static selectedImage = null;
    static imageToCrop = null;
    static currentUser = null;

    static init() {
        console.log('🚀 [PROFILE] Initializing Profile Page...');
        
        // Check if user is logged in
        if (!this.checkUserLoggedIn()) {
            return;
        }
        
        this.loadCurrentUser();
        this.loadUserProfile();
        this.loadActivities();
        this.setupEventListeners();
        this.updateAllStats();
        this.loadUserSettings();
        this.loadAvatar();
        this.setupMobileOptimizations();
        this.initDonutCharts();
        
        console.log('✅ [PROFILE] Profile Page initialized for user:', this.currentUser?.identifier);
    }

    static checkUserLoggedIn() {
    const currentUser = StorageManager.getCurrentUser();
    
    if (!currentUser) {
        console.log('⚠️ No logged-in user detected, redirecting to login...');
        this.showNotification('Please login to continue', 'info', 2000);
        setTimeout(() => window.location.href = 'login.html', 1500);
        return false;
    }
    
    this.currentUser = currentUser;
    console.log('✅ User logged in:', this.currentUser.identifier);
    return true;
}

    static loadCurrentUser() {
        const profile = StorageManager.getProfile();
        const user = StorageManager.getCurrentUser();
        
        this.currentUser = {
            id: user.id,
            identifier: user.identifier,
            name: profile.name || user.name || 'User'
        };
        
        console.log('👤 [PROFILE] Current user loaded:', this.currentUser);
        
        // Update username in UI
        const usernameEl = document.getElementById('profileUsername');
        if (usernameEl) usernameEl.textContent = this.currentUser.name;
    }

    static loadUserProfile() {
        console.log('📁 [PROFILE] Loading user profile...');
        const storedProfile = StorageManager.getProfile();
        
        if (storedProfile && storedProfile.id === this.currentUser?.id) {
            this.userProfile = storedProfile;
            console.log('✅ [PROFILE] Profile loaded:', this.userProfile);
        } else {
            // Create profile if it doesn't exist for this user
            this.userProfile = {
                id: this.currentUser.id,
                name: this.currentUser.name,
                identifier: this.currentUser.identifier,
                identifierType: 'email',
                loginDate: new Date().toISOString(),
                updatesAccepted: false,
                termsAccepted: false,
                privacyAccepted: false
            };
            localStorage.setItem('anime_tracker_profile', JSON.stringify(this.userProfile));
            console.log('🆕 [PROFILE] New profile created:', this.userProfile);
        }
        
        this.updateProfileDisplay();
    }

    static loadActivities() {
        console.log('📊 [PROFILE] Loading activities for user:', this.currentUser?.identifier);
        
        // Get activities from StorageManager (already user-specific)
        const activities = StorageManager.getActivities();
        
        // Additional filter to ensure only current user's data
        this.activities = activities.filter(activity => 
            activity.userId === this.currentUser?.id || 
            activity.userIdentifier === this.currentUser?.identifier
        );
        
        console.log(`✅ [PROFILE] Loaded ${this.activities.length} activities for user`);
        
        // Log category data for debugging
        const categories = this.getCategoryData();
        console.log('📊 [CATEGORY DATA]:', categories);
        
        // Log status data
        const statusData = this.getStatusData();
        console.log('📊 [STATUS DATA]:', statusData);
    }

    static getCategoryData() {
        const categoryCounts = {};
        this.activities.forEach(activity => {
            const type = activity.type || 'unknown';
            categoryCounts[type] = (categoryCounts[type] || 0) + 1;
        });
        return categoryCounts;
    }

    static getStatusData() {
        const statusCounts = {
            favorites: this.activities.filter(a => a.isFavorite === true).length,
            wishlist: this.activities.filter(a => a.status === 'plan-to-watch').length,
            watching: this.activities.filter(a => a.status === 'watching').length,
            completed: this.activities.filter(a => a.status === 'completed').length,
            onHold: this.activities.filter(a => a.status === 'on-hold').length,
            dropped: this.activities.filter(a => a.status === 'dropped').length
        };
        return statusCounts;
    }

    static updateProfileDisplay() {
        // Update username
        const usernameEl = document.getElementById('profileUsername');
        const detailUsernameEl = document.getElementById('detailUsername');
        if (usernameEl) usernameEl.textContent = this.userProfile.name;
        if (detailUsernameEl) detailUsernameEl.textContent = this.userProfile.name;

        // Update identifier (email/phone)
        const detailIdentifierEl = document.getElementById('detailIdentifier');
        if (detailIdentifierEl) {
            detailIdentifierEl.textContent = this.userProfile.identifier || 'Not set';
        }

        // Update user ID
        const detailUserIdEl = document.getElementById('detailUserId');
        if (detailUserIdEl) {
            detailUserIdEl.textContent = this.userProfile.id || this.currentUser?.id || 'Not available';
        }

        // Update login date
        const detailLoginDateEl = document.getElementById('detailLoginDate');
        if (detailLoginDateEl && this.userProfile.loginDate) {
            detailLoginDateEl.textContent = new Date(this.userProfile.loginDate).toLocaleString();
        }

        // Update account created
        const detailCreatedEl = document.getElementById('detailCreated');
        if (detailCreatedEl && this.userProfile.loginDate) {
            detailCreatedEl.textContent = new Date(this.userProfile.loginDate).toLocaleDateString();
        }
    }

    static loadAvatar() {
        console.log('🖼️ [AVATAR] Loading avatar for user:', this.currentUser?.identifier);
        
        // Use user-specific avatar key
        const avatarKey = `user_avatar_${this.currentUser?.id}`;
        const savedAvatar = localStorage.getItem(avatarKey);
        const avatarImg = document.getElementById('avatarImage');
        
        if (!avatarImg) {
            console.error('❌ [AVATAR] Avatar image element not found!');
            return;
        }
        
        if (savedAvatar && savedAvatar !== 'null' && savedAvatar !== 'undefined') {
            avatarImg.src = savedAvatar;
            this.avatarUrl = savedAvatar;
            console.log('✅ [AVATAR] Avatar loaded from user-specific storage');
        } else {
            const name = this.userProfile?.name || this.currentUser?.name || 'User';
            const initials = name.charAt(0).toUpperCase();
            avatarImg.src = `https://ui-avatars.com/api/?name=${initials}&background=3498db&color=fff&size=150`;
            console.log('✅ [AVATAR] Default avatar generated');
        }
    }

    static updateAllStats() {
        console.log('📊 [STATS] Updating all stats for user:', this.currentUser?.identifier);
        
        const favorites = this.activities.filter(a => a.isFavorite === true).length;
        const wishlist = this.activities.filter(a => a.status === 'plan-to-watch').length;
        const watching = this.activities.filter(a => a.status === 'watching').length;
        const completed = this.activities.filter(a => a.status === 'completed').length;
        const onHold = this.activities.filter(a => a.status === 'on-hold').length;
        const dropped = this.activities.filter(a => a.status === 'dropped').length;
        const total = this.activities.length;

        console.log('📊 [STATS] Status counts:', { favorites, wishlist, watching, completed, onHold, dropped, total });

        // Update status stat cards
        const favoritesEl = document.getElementById('favoritesCount');
        const wishlistEl = document.getElementById('wishlistCount');
        const watchingEl = document.getElementById('watchingCount');
        const completedEl = document.getElementById('completedCount');
        const onHoldEl = document.getElementById('onHoldCount');
        const droppedEl = document.getElementById('droppedCount');
        const totalEl = document.getElementById('detailTotalActivities');
        
        if (favoritesEl) favoritesEl.textContent = favorites;
        if (wishlistEl) wishlistEl.textContent = wishlist;
        if (watchingEl) watchingEl.textContent = watching;
        if (completedEl) completedEl.textContent = completed;
        if (onHoldEl) onHoldEl.textContent = onHold;
        if (droppedEl) droppedEl.textContent = dropped;
        if (totalEl) totalEl.textContent = total;

        // Update category stats cards
        this.updateCategoryStatsCards();
        
        // Update donut charts
        this.updateDonutCharts();
    }

    static updateCategoryStatsCards() {
        console.log('📊 [CATEGORY] Updating category stats cards...');
        const categoryCounts = this.getCategoryData();
        const container = document.getElementById('categoryStatsGrid');
        
        if (!container) {
            console.error('❌ [CATEGORY] Category stats grid not found!');
            return;
        }
        
        if (Object.keys(categoryCounts).length === 0) {
            container.innerHTML = '<div class="empty-state">No categories yet. Add some items!</div>';
            return;
        }
        
        const colorMap = {
            anime: '#3498db',
            series: '#9b59b6',
            manga: '#e74c3c',
            manwha: '#f39c12',
            manhua: '#1abc9c'
        };
        
        container.innerHTML = Object.entries(categoryCounts).map(([category, count]) => {
            const color = colorMap[category] || StorageManager.getCategoryColor(category);
            return `
                <div class="category-stat-card">
                    <div class="category-stat-icon" style="background: ${color}20; color: ${color}">
                        <i class="fas ${this.getCategoryIcon(category)}"></i>
                    </div>
                    <span class="category-stat-number">${count}</span>
                    <span class="category-stat-label">${category.toUpperCase()}</span>
                </div>
            `;
        }).join('');
        
        console.log('✅ [CATEGORY] Category cards updated:', Object.keys(categoryCounts).length, 'categories');
    }

    static getCategoryIcon(category) {
        const icons = {
            anime: 'fa-tv',
            series: 'fa-clapperboard',
            manga: 'fa-book',
            manwha: 'fa-book-open',
            manhua: 'fa-book-open'
        };
        return icons[category] || 'fa-tag';
    }

    static initDonutCharts() {
        console.log('🥧 [CHART] Initializing donut charts for user:', this.currentUser?.identifier);
        
        const categoryCanvas = document.getElementById('categoryChart');
        const statusCanvas = document.getElementById('statusChart');
        
        if (!categoryCanvas) {
            console.error('❌ [CHART] Category chart canvas not found!');
            return;
        }
        
        if (!statusCanvas) {
            console.error('❌ [CHART] Status chart canvas not found!');
            return;
        }
        
        // Category Donut Chart
        this.categoryChart = new Chart(categoryCanvas, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        // Status Donut Chart
        this.statusChart = new Chart(statusCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Favorites', 'Wishlist', 'Watching', 'Completed', 'On Hold', 'Dropped'],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: ['#f39c12', '#9b59b6', '#3498db', '#2ecc71', '#7c7875', '#e74c3c'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ [CHART] Donut charts initialized');
        this.updateDonutCharts();
    }

    static updateDonutCharts() {
        console.log('🔄 [CHART] Updating donut charts for user:', this.currentUser?.identifier);
        
        // Update Category Chart
        const categoryCounts = this.getCategoryData();
        const categories = Object.keys(categoryCounts);
        const categoryValues = Object.values(categoryCounts);
        
        const colorMap = {
            anime: '#3498db',
            series: '#9b59b6',
            manga: '#e74c3c',
            manwha: '#f39c12',
            manhua: '#1abc9c'
        };
        
        const categoryColors = categories.map(cat => colorMap[cat] || StorageManager.getCategoryColor(cat));
        
        console.log('📊 [CATEGORY CHART] Data:', { categories, categoryValues, categoryColors });
        
        if (this.categoryChart) {
            this.categoryChart.data.labels = categories;
            this.categoryChart.data.datasets[0].data = categoryValues;
            this.categoryChart.data.datasets[0].backgroundColor = categoryColors;
            this.categoryChart.update();
            console.log('✅ [CATEGORY CHART] Updated');
        }
        
        this.updateChartLegend('categoryChartLegend', categories, categoryValues, categoryColors);
        
        // Update Status Chart
        const statusData = this.getStatusData();
        const statusLabels = ['Favorites', 'Wishlist', 'Watching', 'Completed', 'On Hold', 'Dropped'];
        const statusValues = [
            statusData.favorites,
            statusData.wishlist,
            statusData.watching,
            statusData.completed,
            statusData.onHold,
            statusData.dropped
        ];
        const statusColors = ['#f39c12', '#9b59b6', '#3498db', '#2ecc71', '#7c7875', '#e74c3c'];
        
        console.log('📊 [STATUS CHART] Data:', statusValues);
        
        if (this.statusChart) {
            this.statusChart.data.datasets[0].data = statusValues;
            this.statusChart.update();
            console.log('✅ [STATUS CHART] Updated');
        }
        
        this.updateChartLegend('statusChartLegend', statusLabels, statusValues, statusColors);
        
        console.log('✅ [CHART] All charts updated');
    }

    static updateChartLegend(legendId, labels, values, colors) {
        const legendContainer = document.getElementById(legendId);
        if (!legendContainer) return;
        
        const total = values.reduce((a, b) => a + b, 0);
        
        legendContainer.innerHTML = labels.map((label, index) => {
            const value = values[index];
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${colors[index]}"></div>
                    <span>${label}: ${value} (${percentage}%)</span>
                </div>
            `;
        }).join('');
    }

    static setupEventListeners() {
        console.log('🎯 [EVENTS] Setting up event listeners...');
        
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

        // Camera button for image upload
        const cameraBtn = document.getElementById('cameraBtn');
        const imageUpload = document.getElementById('imageUpload');
        
        if (cameraBtn) {
            cameraBtn.addEventListener('click', () => {
                console.log('🔘 [CLICK] Camera button clicked');
                imageUpload.click();
            });
        }
        
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                console.log('📁 [UPLOAD] Image selected:', e.target.files[0]?.name);
                this.handleSimpleImageUpload(e);
            });
        }

        // Edit username
        const editUsernameBtn = document.getElementById('editUsernameBtn');
        if (editUsernameBtn) editUsernameBtn.addEventListener('click', () => this.editUsername());

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        // Crop modal controls
        const closeCropModal = document.getElementById('closeCropModal');
        const cropSaveBtn = document.getElementById('cropSaveBtn');
        const cropReselectBtn = document.getElementById('cropReselectBtn');
        const cropCancelBtn = document.getElementById('cropCancelBtn');
        
        if (closeCropModal) closeCropModal.addEventListener('click', () => this.closeCropModal());
        if (cropSaveBtn) cropSaveBtn.addEventListener('click', () => this.saveCroppedImage());
        if (cropReselectBtn) cropReselectBtn.addEventListener('click', () => this.reselectImage());
        if (cropCancelBtn) cropCancelBtn.addEventListener('click', () => this.closeCropModal());

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
            if (e.key === 'Escape') {
                this.closeCropModal();
                this.closeAllPanels();
            }
        });
        
        console.log('✅ [EVENTS] All event listeners setup complete');
    }

    static handleSimpleImageUpload(event) {
        const file = event.target.files[0];
        console.log('📁 [UPLOAD] File selected:', file?.name, 'Size:', file?.size, 'Type:', file?.type);
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('📸 [UPLOAD] Image loaded');
                const img = new Image();
                img.onload = () => {
                    console.log('🖼️ [IMAGE] Original dimensions:', img.width, 'x', img.height);
                    this.selectedImage = img;
                    this.openCropModal();
                    this.displayImageInCropModal(img);
                };
                img.src = e.target.result;
                this.imageToCrop = e.target.result;
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    }

    static displayImageInCropModal(img) {
        const container = document.querySelector('.image-preview-container');
        if (container) {
            container.innerHTML = '';
            const displayImg = document.createElement('img');
            displayImg.id = 'cropDisplayImage';
            displayImg.src = img.src;
            displayImg.style.maxWidth = '100%';
            displayImg.style.maxHeight = '300px';
            displayImg.style.display = 'block';
            displayImg.style.margin = '0 auto';
            container.appendChild(displayImg);
        }
    }

    static openCropModal() {
        console.log('🔓 [MODAL] Opening crop modal');
        const modal = document.getElementById('cropModal');
        const overlay = document.getElementById('overlay');
        if (modal) modal.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static closeCropModal() {
        console.log('🔒 [MODAL] Closing crop modal');
        const modal = document.getElementById('cropModal');
        const overlay = document.getElementById('overlay');
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        this.selectedImage = null;
        this.imageToCrop = null;
        
        const container = document.querySelector('.image-preview-container');
        if (container) {
            container.innerHTML = '<img id="cropImage" src="" alt="Crop Preview">';
        }
    }

    static saveCroppedImage() {
        console.log('💾 [SAVE] Saving cropped image for user:', this.currentUser?.identifier);
        
        if (!this.selectedImage && !this.imageToCrop) {
            console.error('❌ [SAVE] No image selected!');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const size = Math.min(this.selectedImage.width, this.selectedImage.height);
        const ctx = canvas.getContext('2d');
        
        canvas.width = 150;
        canvas.height = 150;
        
        const sx = (this.selectedImage.width - size) / 2;
        const sy = (this.selectedImage.height - size) / 2;
        
        ctx.drawImage(this.selectedImage, sx, sy, size, size, 0, 0, 150, 150);
        
        const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.9);
        const avatarImg = document.getElementById('avatarImage');
        
        if (avatarImg) {
            avatarImg.src = croppedImageUrl;
            console.log('✅ [SAVE] Avatar image updated in UI');
        }
        
        // Save to user-specific storage
        const avatarKey = `user_avatar_${this.currentUser?.id}`;
        localStorage.setItem(avatarKey, croppedImageUrl);
        this.avatarUrl = croppedImageUrl;
        console.log('✅ [SAVE] Avatar saved to user-specific storage');
        
        this.closeCropModal();
        this.showNotification('Profile picture updated!', 'success');
    }

    static reselectImage() {
        console.log('🔄 [RESELECT] Reselecting image...');
        this.closeCropModal();
        setTimeout(() => {
            document.getElementById('imageUpload').click();
        }, 100);
    }

    static editUsername() {
        console.log('✏️ [EDIT] Editing username...');
        const usernameContainer = document.querySelector('.username-container');
        const currentUsername = this.userProfile.name;
        
        const editHtml = `
            <div class="username-edit-input">
                <input type="text" id="editUsernameInput" value="${currentUsername}" maxlength="30">
                <button id="saveUsernameBtn"><i class="fas fa-check"></i></button>
                <button id="cancelUsernameBtn"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        usernameContainer.innerHTML = editHtml;
        
        const input = document.getElementById('editUsernameInput');
        const saveBtn = document.getElementById('saveUsernameBtn');
        const cancelBtn = document.getElementById('cancelUsernameBtn');
        
        input.focus();
        input.select();
        
        saveBtn.addEventListener('click', () => this.saveUsername(input.value));
        cancelBtn.addEventListener('click', () => this.cancelUsernameEdit());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveUsername(input.value);
            if (e.key === 'Escape') this.cancelUsernameEdit();
        });
    }

    static saveUsername(newUsername) {
        console.log('💾 [SAVE] Saving username:', newUsername);
        if (newUsername && newUsername.trim()) {
            this.userProfile.name = newUsername.trim();
            this.currentUser.name = newUsername.trim();
            localStorage.setItem('anime_tracker_profile', JSON.stringify(this.userProfile));
            this.updateProfileDisplay();
            this.loadAvatar();
            this.showNotification('Username updated!', 'success');
            console.log('✅ [SAVE] Username saved successfully');
        }
        this.refreshUsernameDisplay();
    }

    static cancelUsernameEdit() {
        console.log('❌ [CANCEL] Username edit cancelled');
        this.refreshUsernameDisplay();
    }

    static refreshUsernameDisplay() {
        const usernameContainer = document.querySelector('.username-container');
        usernameContainer.innerHTML = `
            <h1 id="profileUsername">${this.userProfile.name}</h1>
            <button class="edit-username-btn" id="editUsernameBtn">
                <i class="fas fa-pencil-alt"></i>
            </button>
        `;
        
        const editBtn = document.getElementById('editUsernameBtn');
        if (editBtn) editBtn.addEventListener('click', () => this.editUsername());
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

    static setupMobileOptimizations() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            document.body.classList.add('touch-device');
        }
    }

    static loadUserSettings() {
        const settings = JSON.parse(localStorage.getItem('anime_tracker_settings') || '{}');
        const themeSelector = document.getElementById('themeSelector');
        if (themeSelector) {
            const savedTheme = settings.theme || 'system';
            themeSelector.value = savedTheme;
            this.setTheme(savedTheme);
        }
        const notificationsToggle = document.getElementById('notificationsToggle');
        if (notificationsToggle) {
            notificationsToggle.checked = settings.notifications !== false;
        }
    }

    static setTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        if (ThemeManager && ThemeManager.setTheme) {
            ThemeManager.setTheme(theme);
        }
        localStorage.setItem('preferredTheme', theme);
    }

    static logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear session data only - keep user's stored data
            localStorage.removeItem('user_logged_in');
            localStorage.removeItem('anime_tracker_profile');
            // Don't remove user-specific data - it stays with user ID
            
            this.showNotification('Logged out successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
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

    static showNotification(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            left: 20px;
            padding: 15px;
            background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            border-radius: 12px;
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 600;
            font-size: 0.9rem;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, duration);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
});