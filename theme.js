class ThemeManager {
    // Theme constants
    static THEMES = {
        SYSTEM: 'system',
        LIGHT: 'light',
        DARK: 'dark'
    };
    
    static THEME_NAMES = {
        system: 'theme0',
        light: 'theme2',
        dark: 'theme1'
    };
    
    static THEME_DISPLAY = {
        system: 'System Default',
        light: 'Light Mode',
        dark: 'Dark Mode'
    };
    
    static init() {
        console.log('🎨 [THEME] Initializing Theme Manager...');
        const savedTheme = this.getSavedTheme();
        this.setTheme(savedTheme);
        console.log(`✅ [THEME] Theme initialized to: ${savedTheme} (${this.THEME_NAMES[savedTheme]})`);
    }
    
    static getSavedTheme() {
        // Check if user is logged in
        const currentUser = this.getCurrentUser();
        const userId = currentUser?.id;
        
        if (userId) {
            // Get user-specific theme
            const userTheme = localStorage.getItem(`user_theme_${userId}`);
            if (userTheme && this.THEMES[userTheme.toUpperCase()]) {
                console.log(`📁 [THEME] User-specific theme found: ${userTheme}`);
                return userTheme;
            }
        }
        
        // Check global theme as fallback
        const globalTheme = localStorage.getItem('preferredTheme');
        if (globalTheme && this.THEMES[globalTheme.toUpperCase()]) {
            console.log(`🌐 [THEME] Global theme found: ${globalTheme}`);
            return globalTheme;
        }
        
        // Default to system theme
        console.log('🆕 [THEME] No theme found, using system default');
        return this.THEMES.SYSTEM;
    }
    
    static getCurrentUser() {
        try {
            const profile = JSON.parse(localStorage.getItem('anime_tracker_profile') || '{}');
            if (profile.id) return profile;
            const currentUser = localStorage.getItem('anime_tracker_current_user');
            return currentUser ? JSON.parse(currentUser) : null;
        } catch (e) {
            return null;
        }
    }
    
    static setTheme(theme) {
        // Validate theme
        if (!this.THEMES[theme.toUpperCase()]) {
            console.warn(`⚠️ [THEME] Invalid theme: ${theme}, using system`);
            theme = this.THEMES.SYSTEM;
        }
        
        // Apply theme to DOM
        let appliedTheme = theme;
        if (theme === this.THEMES.SYSTEM) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            appliedTheme = prefersDark ? this.THEMES.DARK : this.THEMES.LIGHT;
        }
        
        document.documentElement.setAttribute('data-theme', appliedTheme);
        console.log(`🎨 [THEME] Theme applied: ${appliedTheme} (${this.THEME_NAMES[appliedTheme]})`);
        
        // Save theme preference for user
        this.saveThemePreference(theme);
    }
    
    static saveThemePreference(theme) {
        const currentUser = this.getCurrentUser();
        const userId = currentUser?.id;
        
        if (userId) {
            // Save user-specific theme
            localStorage.setItem(`user_theme_${userId}`, theme);
            console.log(`💾 [THEME] User-specific theme saved: ${theme} (${this.THEME_NAMES[theme]}) for user ${userId}`);
        } else {
            // Save global theme as fallback
            localStorage.setItem('preferredTheme', theme);
            console.log(`💾 [THEME] Global theme saved: ${theme} (${this.THEME_NAMES[theme]})`);
        }
        
        // Also save for easy access
        localStorage.setItem('current_theme', theme);
        localStorage.setItem('current_theme_code', this.THEME_NAMES[theme]);
    }
    
    static getCurrentTheme() {
        const savedTheme = this.getSavedTheme();
        return {
            name: savedTheme,
            display: this.THEME_DISPLAY[savedTheme],
            code: this.THEME_NAMES[savedTheme]
        };
    }
    
    static getThemeCode(theme) {
        return this.THEME_NAMES[theme] || 'theme0';
    }
    
    static toggleTheme() {
        const current = this.getSavedTheme();
        let newTheme;
        
        if (current === this.THEMES.SYSTEM) {
            newTheme = this.THEMES.LIGHT;
        } else if (current === this.THEMES.LIGHT) {
            newTheme = this.THEMES.DARK;
        } else {
            newTheme = this.THEMES.SYSTEM;
        }
        
        this.setTheme(newTheme);
        return newTheme;
    }
    
    static updateAllPagesTheme() {
        // This ensures all pages get the same theme
        const currentTheme = this.getSavedTheme();
        this.setTheme(currentTheme);
        console.log(`🔄 [THEME] All pages updated to: ${currentTheme} (${this.THEME_NAMES[currentTheme]})`);
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = ThemeManager.getSavedTheme();
    if (currentTheme === ThemeManager.THEMES.SYSTEM) {
        console.log('🌓 [THEME] System theme changed, updating...');
        ThemeManager.setTheme(ThemeManager.THEMES.SYSTEM);
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});