// Storage utilities with 25MB limit
const STORAGE_LIMIT = 25 * 1024 * 1024; // 25MB in bytes

class StorageManager {
    // User Registry Keys
    static USERS_REGISTRY_KEY = 'anime_tracker_users_registry';
    static CURRENT_USER_KEY = 'anime_tracker_current_user';
    static USER_PREFIX = 'user_';
    
    // ============================================
    // USER MANAGEMENT METHODS
    // ============================================
    
    static getUsersRegistry() {
        const registry = localStorage.getItem(this.USERS_REGISTRY_KEY);
        return registry ? JSON.parse(registry) : [];
    }
    
    static saveUsersRegistry(registry) {
        localStorage.setItem(this.USERS_REGISTRY_KEY, JSON.stringify(registry));
        console.log('💾 [REGISTRY] Users registry saved:', registry.length, 'users');
    }
    
    static getUserByIdentifier(identifier) {
        const registry = this.getUsersRegistry();
        return registry.find(user => user.identifier === identifier);
    }
    
    static getUserByUserId(userId) {
        const registry = this.getUsersRegistry();
        return registry.find(user => user.id === userId);
    }
    
    static registerUser(identifier, identifierType, username) {
        const registry = this.getUsersRegistry();
        
        let existingUser = registry.find(u => u.identifier === identifier);
        
        if (existingUser) {
            console.log('📁 [REGISTRY] User already exists:', existingUser);
            return existingUser;
        }
        
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10);
        const userId = `${this.USER_PREFIX}${timestamp}_${random}`;
        
        const newUser = {
            id: userId,
            identifier: identifier,
            identifierType: identifierType,
            name: username,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        registry.push(newUser);
        this.saveUsersRegistry(registry);
        
        console.log('🆕 [REGISTRY] New user registered:', newUser);
        return newUser;
    }
    
    static updateUserLastLogin(identifier) {
        const registry = this.getUsersRegistry();
        const userIndex = registry.findIndex(u => u.identifier === identifier);
        
        if (userIndex !== -1) {
            registry[userIndex].lastLogin = new Date().toISOString();
            this.saveUsersRegistry(registry);
        }
    }
    
    static setCurrentUser(user) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
        console.log('🔐 [SESSION] Current user set:', user.identifier);
    }
    
    static getCurrentUser() {
        const currentUser = localStorage.getItem(this.CURRENT_USER_KEY);
        return currentUser ? JSON.parse(currentUser) : null;
    }
    
    static clearCurrentUser() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        console.log('🚪 [SESSION] Current user cleared');
    }
    
    static isUserLoggedIn() {
        const currentUser = this.getCurrentUser();
        return currentUser !== null;
    }
    
    // ============================================
    // PROFILE METHODS - FIXED
    // ============================================
    
    static getProfile() {
        const profile = localStorage.getItem('anime_tracker_profile');
        return profile ? JSON.parse(profile) : {};
    }
    
    static saveProfile(profile) {
        localStorage.setItem('anime_tracker_profile', JSON.stringify(profile));
        console.log('💾 [PROFILE] Profile saved:', profile);
    }
    
    // ============================================
    // DATA STORAGE METHODS
    // ============================================
    
    static getUserStorageKey(userId) {
        return `${this.USER_PREFIX}data_${userId}`;
    }
    
    static getUserCategoryColorsKey(userId) {
        return `${this.USER_PREFIX}category_colors_${userId}`;
    }
    
    static getUserAvatarKey(userId) {
        return `${this.USER_PREFIX}avatar_${userId}`;
    }
    
    static saveActivity(activity) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            console.error('❌ [STORAGE] No user logged in');
            return false;
        }
        
        const storageKey = this.getUserStorageKey(currentUser.id);
        const activities = this.getActivitiesForUser(currentUser.id);
        
        const cleanActivity = {
            ...activity,
            userId: currentUser.id,
            userIdentifier: currentUser.identifier,
            season: activity.season ? parseInt(activity.season) : null,
            episode: activity.episode ? parseInt(activity.episode) : null,
            progress: activity.progress || '',
            isFavorite: activity.isFavorite || false,
            rating: activity.rating || 0,
            notes: activity.notes || '',
            addedDate: activity.addedDate || new Date().toISOString(),
            lastUpdated: activity.lastUpdated || new Date().toISOString()
        };
        
        activities.push(cleanActivity);
        localStorage.setItem(storageKey, JSON.stringify(activities));
        
        console.log('✅ [STORAGE] Activity saved for user:', currentUser.identifier);
        return true;
    }
    
    static getActivities() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            console.log('📖 [STORAGE] No user logged in');
            return [];
        }
        
        return this.getActivitiesForUser(currentUser.id);
    }
    
    static getActivitiesForUser(userId) {
        const storageKey = this.getUserStorageKey(userId);
        const activities = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        return activities.map(activity => ({
            ...activity,
            season: activity.season || null,
            episode: activity.episode || null,
            progress: activity.progress || '',
            isFavorite: activity.isFavorite || false,
            rating: activity.rating || 0,
            notes: activity.notes || ''
        }));
    }
    
    static getFavorites() {
        const activities = this.getActivities();
        return activities.filter(activity => activity.isFavorite);
    }
    
    static getWishlist() {
        const activities = this.getActivities();
        return activities.filter(activity => activity.status === 'plan-to-watch');
    }
    
    static getCategories() {
        const activities = this.getActivities();
        const categories = new Set();
        
        const defaultCategories = ['anime', 'series', 'manga', 'manwha', 'manhua'];
        defaultCategories.forEach(cat => categories.add(cat));
        
        activities.forEach(activity => {
            if (activity.type) {
                categories.add(activity.type);
            }
        });
        
        return Array.from(categories);
    }
    
    // ============================================
    // CATEGORY COLOR METHODS
    // ============================================
    
    static getCategoryColors(userId = null) {
        const targetUserId = userId || this.getCurrentUser()?.id;
        if (!targetUserId) return {};
        
        const colorsKey = this.getUserCategoryColorsKey(targetUserId);
        return JSON.parse(localStorage.getItem(colorsKey) || '{}');
    }
    
    static getCategoryColor(category, userId = null) {
        const colors = this.getCategoryColors(userId);
        
        if (colors[category]) {
            return colors[category];
        }
        
        const colorSet = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
            '#1abc9c', '#e67e22', '#34495e', '#16a085', '#27ae60'
        ];
        
        const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % colorSet.length;
        const newColor = colorSet[index];
        
        const targetUserId = userId || this.getCurrentUser()?.id;
        if (targetUserId) {
            const updatedColors = { ...colors, [category]: newColor };
            const colorsKey = this.getUserCategoryColorsKey(targetUserId);
            localStorage.setItem(colorsKey, JSON.stringify(updatedColors));
        }
        
        return newColor;
    }
    
    static getAllCategoryColors(userId = null) {
        return this.getCategoryColors(userId);
    }
    
    // ============================================
    // AVATAR METHODS
    // ============================================
    
    static getUserAvatar(userId) {
        const avatarKey = this.getUserAvatarKey(userId);
        return localStorage.getItem(avatarKey);
    }
    
    static saveUserAvatar(userId, avatarData) {
        const avatarKey = this.getUserAvatarKey(userId);
        localStorage.setItem(avatarKey, avatarData);
        console.log('🖼️ [AVATAR] Avatar saved for user:', userId);
    }
    
    // ============================================
    // ADMIN METHODS
    // ============================================
    
    static getAllUsers() {
        return this.getUsersRegistry();
    }
    
    static deleteUserAccount(userId) {
        console.log('🗑️ [ADMIN] Deleting user account:', userId);
        
        const activityKey = this.getUserStorageKey(userId);
        localStorage.removeItem(activityKey);
        
        const colorsKey = this.getUserCategoryColorsKey(userId);
        localStorage.removeItem(colorsKey);
        
        const avatarKey = this.getUserAvatarKey(userId);
        localStorage.removeItem(avatarKey);
        
        const registry = this.getUsersRegistry();
        const updatedRegistry = registry.filter(user => user.id !== userId);
        this.saveUsersRegistry(updatedRegistry);
        
        console.log('✅ [ADMIN] User account deleted:', userId);
        return true;
    }
    
    // ============================================
    // UTILITY METHODS
    // ============================================
    
    static checkStorageLimit() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (localStorage[key].length * 2) / 1024 / 1024;
            }
        }
        return total < STORAGE_LIMIT;
    }
    
    static updateActivity(activityId, updates) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        const activities = this.getActivities();
        const updatedActivities = activities.map(activity => {
            if (activity.id === activityId) {
                return {
                    ...activity,
                    ...updates,
                    lastUpdated: new Date().toISOString()
                };
            }
            return activity;
        });
        
        const storageKey = this.getUserStorageKey(currentUser.id);
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        return true;
    }
    
    static deleteActivity(activityId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        const activities = this.getActivities();
        const updatedActivities = activities.filter(activity => activity.id !== activityId);
        const storageKey = this.getUserStorageKey(currentUser.id);
        localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
        return true;
    }
}

// Initialize
console.log('🔧 [STORAGE] Storage Manager initialized');

// Verify all methods are available
const requiredMethods = ['getProfile', 'saveProfile', 'getCurrentUser', 'setCurrentUser', 'getActivities', 'saveActivity', 'getCategories', 'getCategoryColor'];
console.log('📋 StorageManager methods check:');
requiredMethods.forEach(method => {
    console.log(`   ${method}: ${typeof StorageManager[method] === 'function' ? '✅' : '❌'}`);
});