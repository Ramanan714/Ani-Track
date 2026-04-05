class LoginManager {
    static currentStep = 1;
    static currentMode = 'email';
    static userData = {
        identifier: '',
        username: '',
        termsAccepted: false,
        privacyAccepted: false,
        updatesAccepted: false,
        userId: null,
        countryCode: '+91'
    };
    static animationFrame = null;
    static existingUser = null;
    static ADMIN_EMAIL = 'adminarjun@gmail.com';

    static init() {
        console.log('🚀 [LOGIN] LoginManager initializing...');
        this.setupEventListeners();
        this.checkExistingSession();
        console.log('✅ [LOGIN] LoginManager initialized successfully');
    }

    static checkExistingSession() {
        const currentUser = StorageManager.getCurrentUser();
        const profile = StorageManager.getProfile();
        const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
        
        console.log('🔐 [SESSION] Checking existing session...');
        console.log('   Current user from storage:', currentUser);
        console.log('   Profile from storage:', profile);
        console.log('   Is logged in flag:', isLoggedIn);
        
        // Use currentUser if available, otherwise check profile
        const user = currentUser || (profile.id ? profile : null);
        
        if (user && user.id && isLoggedIn) {
            console.log('🔐 [SESSION] Existing session found:', user.identifier);
            if (user.identifier === this.ADMIN_EMAIL) {
                if (confirm('Welcome back, Administrator! Continue to Admin Panel?')) {
                    window.location.href = 'admin.html';
                }
            } else if (confirm(`Welcome back, ${user.name}! Continue to your dashboard?`)) {
                window.location.href = 'index.html';
            } else {
                StorageManager.clearCurrentUser();
                localStorage.removeItem('user_logged_in');
            }
        }
    }

    static setupEventListeners() {
        console.log('🎯 [EVENTS] Setting up event listeners...');
        
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = btn.dataset.mode;
                this.switchMode(mode);
            });
        });

        const countrySelect = document.getElementById('countryCode');
        if (countrySelect) {
            countrySelect.addEventListener('change', (e) => {
                this.userData.countryCode = e.target.value;
                const displaySpan = document.getElementById('countryCodeDisplay');
                if (displaySpan) {
                    displaySpan.textContent = e.target.value;
                }
            });
        }

        const emailInput = document.getElementById('emailInput');
        if (emailInput) {
            emailInput.addEventListener('input', () => this.validateEmail());
        }

        const phoneInput = document.getElementById('phoneInput');
        if (phoneInput) {
            phoneInput.addEventListener('input', () => this.validatePhone());
            phoneInput.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key)) e.preventDefault();
            });
        }

        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());

        const backBtn = document.getElementById('backBtn');
        if (backBtn) backBtn.addEventListener('click', () => this.previousStep());

        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('input', (e) => {
                this.autoCapitalizeUsername(e.target);
                this.validateUsername();
            });
        }

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            const newSubmitBtn = submitBtn.cloneNode(true);
            submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
            newSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleLogin();
            });
        }

        const termsLink = document.getElementById('termsLink');
        const privacyLink = document.getElementById('privacyLink');
        if (termsLink) termsLink.addEventListener('click', (e) => { e.preventDefault(); this.openTermsModal(); });
        if (privacyLink) privacyLink.addEventListener('click', (e) => { e.preventDefault(); this.openPrivacyModal(); });

        const closeTermsModal = document.getElementById('closeTermsModal');
        const closePrivacyModal = document.getElementById('closePrivacyModal');
        const acceptTermsBtn = document.getElementById('acceptTermsBtn');
        const acceptPrivacyBtn = document.getElementById('acceptPrivacyBtn');
        
        if (closeTermsModal) closeTermsModal.addEventListener('click', () => this.closeTermsModal());
        if (closePrivacyModal) closePrivacyModal.addEventListener('click', () => this.closePrivacyModal());
        if (acceptTermsBtn) {
            acceptTermsBtn.addEventListener('click', () => {
                this.closeTermsModal();
                const termsCheckbox = document.getElementById('termsCheckbox');
                if (termsCheckbox && !termsCheckbox.checked) {
                    termsCheckbox.checked = true;
                    this.userData.termsAccepted = true;
                }
            });
        }
        if (acceptPrivacyBtn) {
            acceptPrivacyBtn.addEventListener('click', () => {
                this.closePrivacyModal();
                const privacyCheckbox = document.getElementById('privacyCheckbox');
                if (privacyCheckbox && !privacyCheckbox.checked) {
                    privacyCheckbox.checked = true;
                    this.userData.privacyAccepted = true;
                }
            });
        }

        const termsCheckbox = document.getElementById('termsCheckbox');
        const privacyCheckbox = document.getElementById('privacyCheckbox');
        const updatesCheckbox = document.getElementById('updatesCheckbox');
        
        if (termsCheckbox) termsCheckbox.addEventListener('change', (e) => { this.userData.termsAccepted = e.target.checked; });
        if (privacyCheckbox) privacyCheckbox.addEventListener('change', (e) => { this.userData.privacyAccepted = e.target.checked; });
        if (updatesCheckbox) updatesCheckbox.addEventListener('change', (e) => { this.userData.updatesAccepted = e.target.checked; });

        emailInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.nextStep(); });
        phoneInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.nextStep(); });
        usernameInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleLogin(); });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTermsModal();
                this.closePrivacyModal();
                this.closeToast();
            }
        });
    }

    static switchMode(mode) {
        this.currentMode = mode;
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            if (btn.dataset.mode === mode) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        const emailField = document.getElementById('emailField');
        const phoneField = document.getElementById('phoneField');
        
        if (mode === 'email') {
            if (emailField) emailField.style.display = 'block';
            if (phoneField) phoneField.style.display = 'none';
        } else {
            if (emailField) emailField.style.display = 'none';
            if (phoneField) phoneField.style.display = 'block';
        }
        this.clearErrors();
    }

    static validateEmail() {
        const emailInput = document.getElementById('emailInput');
        const email = emailInput?.value.trim();
        const errorEl = document.getElementById('emailError');
        
        if (!email) {
            this.showError(errorEl, 'Please enter your email address');
            if (emailInput) emailInput.classList.add('error');
            return false;
        }
        
        if (email !== this.ADMIN_EMAIL && !email.endsWith('@gmail.com')) {
            this.showError(errorEl, 'Only @gmail.com email addresses are allowed');
            if (emailInput) emailInput.classList.add('error');
            return false;
        }
        
        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (email !== this.ADMIN_EMAIL && !emailRegex.test(email)) {
            this.showError(errorEl, 'Please enter a valid Gmail address');
            if (emailInput) emailInput.classList.add('error');
            return false;
        }
        
        this.hideError(errorEl);
        if (emailInput) emailInput.classList.remove('error');
        this.userData.identifier = email;
        return true;
    }

    static validatePhone() {
        const phoneInput = document.getElementById('phoneInput');
        const phone = phoneInput?.value.trim();
        const errorEl = document.getElementById('phoneError');
        
        if (!phone) {
            this.showError(errorEl, 'Please enter your phone number');
            if (phoneInput) phoneInput.classList.add('error');
            return false;
        }
        
        if (!/^\d{10}$/.test(phone)) {
            this.showError(errorEl, 'Phone number must be exactly 10 digits');
            if (phoneInput) phoneInput.classList.add('error');
            return false;
        }
        
        this.hideError(errorEl);
        if (phoneInput) phoneInput.classList.remove('error');
        this.userData.identifier = `${this.userData.countryCode}${phone}`;
        return true;
    }

    static showExistingUserConfirmation(existingUser) {
        console.log('👤 [EXISTING] Showing confirmation for existing user:', existingUser);
        
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                z-index: 10002;
                display: flex;
                justify-content: center;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: var(--card-background);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border-left: 4px solid #3498db;
            max-width: 400px;
            width: 100%;
            pointer-events: auto;
            animation: slideUp 0.3s ease;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <i class="fas fa-user-circle" style="color: #3498db; font-size: 1.5rem;"></i>
                <div>
                    <h4 style="margin: 0; color: var(--text-color); font-size: 1rem;">Existing Account Found</h4>
                    <p style="margin: 4px 0 0 0; color: #666; font-size: 0.85rem;">This email/phone number is already registered</p>
                </div>
            </div>
            <p style="margin: 0 0 16px 0; color: var(--text-color); font-size: 0.9rem;">
                Do you want to continue as <strong>${existingUser.name}</strong>?
            </p>
            <div style="display: flex; gap: 12px;">
                <button id="existingYesBtn" style="flex: 1; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                    Yes, Continue
                </button>
                <button id="existingCloseBtn" style="flex: 1; padding: 12px; background: var(--card-background); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 10px; cursor: pointer; font-weight: 600;">
                    Close
                </button>
            </div>
        `;
        
        toastContainer.innerHTML = '';
        toastContainer.appendChild(toast);
        
        const yesBtn = document.getElementById('existingYesBtn');
        const closeBtn = document.getElementById('existingCloseBtn');
        
        if (yesBtn) {
            yesBtn.addEventListener('click', () => {
                console.log('✅ [EXISTING] User confirmed - logging in');
                this.loginExistingUser(existingUser);
                this.closeToast();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('❌ [EXISTING] User cancelled');
                this.closeToast();
            });
        }
        
        setTimeout(() => this.closeToast(), 30000);
    }

    static loginExistingUser(existingUser) {
        console.log('🔐 [LOGIN] Logging into existing account:', existingUser.identifier);
        
        // Set current session
        StorageManager.setCurrentUser(existingUser);
        StorageManager.updateUserLastLogin(existingUser.identifier);
        
        // CRITICAL: Set session flags
        localStorage.setItem('user_logged_in', 'true');
        localStorage.setItem('user_id', existingUser.id);
        localStorage.setItem('user_name', existingUser.name);
        
        // CRITICAL: Create/Save profile
        const profile = {
            id: existingUser.id,
            name: existingUser.name,
            identifier: existingUser.identifier,
            identifierType: existingUser.identifierType || 'email',
            updatesAccepted: true,
            termsAccepted: true,
            privacyAccepted: true,
            loginDate: new Date().toISOString(),
            countryCode: this.userData.countryCode || '+91'
        };
        StorageManager.saveProfile(profile);
        
        console.log('✅ [LOGIN] Session flags set:', {
            user_logged_in: localStorage.getItem('user_logged_in'),
            user_id: localStorage.getItem('user_id'),
            user_name: localStorage.getItem('user_name')
        });
        
        this.showNotification(`Welcome back, ${existingUser.name}!`, 'success');
        
        setTimeout(() => {
            if (existingUser.identifier === this.ADMIN_EMAIL) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);
    }

    static showAdminConfirmation() {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                z-index: 10002;
                display: flex;
                justify-content: center;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: var(--card-background);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border-left: 4px solid #e74c3c;
            max-width: 400px;
            width: 100%;
            pointer-events: auto;
            animation: slideUp 0.3s ease;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <i class="fas fa-shield-alt" style="color: #e74c3c; font-size: 1.5rem;"></i>
                <div>
                    <h4 style="margin: 0; color: var(--text-color); font-size: 1rem;">Admin Access Detected</h4>
                    <p style="margin: 4px 0 0 0; color: #666; font-size: 0.85rem;">You are trying to log in as Administrator</p>
                </div>
            </div>
            <p style="margin: 0 0 16px 0; color: var(--text-color); font-size: 0.9rem;">
                Do you want to continue to <strong>Admin Panel</strong>?
            </p>
            <div style="display: flex; gap: 12px;">
                <button id="adminYesBtn" style="flex: 1; padding: 12px; background: #e74c3c; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-check"></i> Yes, Continue as Admin
                </button>
                <button id="adminCloseBtn" style="flex: 1; padding: 12px; background: var(--card-background); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 10px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;
        
        toastContainer.innerHTML = '';
        toastContainer.appendChild(toast);
        
        const yesBtn = document.getElementById('adminYesBtn');
        const closeBtn = document.getElementById('adminCloseBtn');
        
        if (yesBtn) {
            yesBtn.addEventListener('click', () => {
                this.loginAsAdmin();
                this.closeToast();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeToast());
        }
    }

    static loginAsAdmin() {
        const adminUser = {
            id: 'admin_user_' + Date.now(),
            identifier: this.ADMIN_EMAIL,
            identifierType: 'email',
            name: 'Administrator',
            isAdmin: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        StorageManager.setCurrentUser(adminUser);
        
        // CRITICAL: Set session flags
        localStorage.setItem('user_logged_in', 'true');
        localStorage.setItem('user_id', adminUser.id);
        localStorage.setItem('user_name', 'Administrator');
        localStorage.setItem('is_admin', 'true');
        
        // CRITICAL: Create/Save admin profile
        const profile = {
            id: adminUser.id,
            name: 'Administrator',
            identifier: this.ADMIN_EMAIL,
            identifierType: 'email',
            updatesAccepted: true,
            termsAccepted: true,
            privacyAccepted: true,
            loginDate: new Date().toISOString(),
            isAdmin: true
        };
        StorageManager.saveProfile(profile);
        
        console.log('✅ [ADMIN] Admin session set');
        this.showNotification('Welcome Administrator!', 'success');
        
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 500);
    }

    static validateUsername() {
        const usernameInput = document.getElementById('username');
        const username = usernameInput?.value.trim();
        const errorEl = document.getElementById('usernameError');
        
        if (!username) {
            this.showError(errorEl, 'Please enter a username');
            if (usernameInput) usernameInput.classList.add('error');
            return false;
        }
        
        if (username.length < 3) {
            this.showError(errorEl, 'Username must be at least 3 characters');
            if (usernameInput) usernameInput.classList.add('error');
            return false;
        }
        
        if (username.length > 30) {
            this.showError(errorEl, 'Username must be less than 30 characters');
            if (usernameInput) usernameInput.classList.add('error');
            return false;
        }
        
        if (!/^[a-zA-Z0-9\s._]+$/.test(username)) {
            this.showError(errorEl, 'Username can only contain letters, numbers, spaces, dots, and underscores');
            if (usernameInput) usernameInput.classList.add('error');
            return false;
        }
        
        this.hideError(errorEl);
        if (usernameInput) usernameInput.classList.remove('error');
        this.userData.username = username;
        return true;
    }

    static autoCapitalizeUsername(input) {
        if (!input) return;
        let value = input.value;
        value = value.replace(/(?:^|\.\s*|\s+)([a-z])/g, (match) => match.toUpperCase());
        input.value = value;
    }

    static validateTerms() {
        if (!this.userData.termsAccepted) {
            this.showNotification('Please agree to the Terms of Service', 'error');
            return false;
        }
        if (!this.userData.privacyAccepted) {
            this.showNotification('Please agree to the Privacy Policy', 'error');
            return false;
        }
        return true;
    }

    static nextStep() {
        let isValid = false;
        
        if (this.currentMode === 'email') {
            isValid = this.validateEmail();
        } else {
            isValid = this.validatePhone();
        }
        
        if (isValid) {
            // Check for admin email
            if (this.currentMode === 'email' && this.userData.identifier === this.ADMIN_EMAIL) {
                this.showAdminConfirmation();
                return;
            }
            
            // Check if user exists in registry
            const existingUser = StorageManager.getUserByIdentifier(this.userData.identifier);
            
            if (existingUser) {
                this.showExistingUserConfirmation(existingUser);
                return;
            }
            
            // New user - proceed to step 2
            this.currentStep = 2;
            this.updateStepVisibility();
        }
    }

    static previousStep() {
        this.currentStep = 1;
        this.updateStepVisibility();
    }

    static updateStepVisibility() {
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        
        if (step1 && step2) {
            if (this.currentStep === 1) {
                step1.style.display = 'block';
                step2.style.display = 'none';
            } else {
                step1.style.display = 'none';
                step2.style.display = 'block';
                setTimeout(() => document.getElementById('username')?.focus(), 100);
            }
        }
    }

    static handleLogin() {
        if (!this.validateUsername()) return;
        if (!this.validateTerms()) return;
        
        // Register new user
        const registeredUser = StorageManager.registerUser(
            this.userData.identifier,
            this.currentMode,
            this.userData.username
        );
        
        // Set current session
        StorageManager.setCurrentUser(registeredUser);
        
        // CRITICAL: Set session flags for new user
        localStorage.setItem('user_logged_in', 'true');
        localStorage.setItem('user_id', registeredUser.id);
        localStorage.setItem('user_name', registeredUser.name);
        
        // CRITICAL: Create profile for new user
        const profile = {
            id: registeredUser.id,
            name: registeredUser.name,
            identifier: registeredUser.identifier,
            identifierType: registeredUser.identifierType || this.currentMode,
            updatesAccepted: this.userData.updatesAccepted,
            termsAccepted: this.userData.termsAccepted,
            privacyAccepted: this.userData.privacyAccepted,
            loginDate: new Date().toISOString(),
            countryCode: this.userData.countryCode
        };
        StorageManager.saveProfile(profile);
        
        console.log('✅ [LOGIN] New user session set:', {
            user_logged_in: localStorage.getItem('user_logged_in'),
            user_id: localStorage.getItem('user_id'),
            user_name: localStorage.getItem('user_name')
        });
        
        this.showNotification(`Welcome ${this.userData.username}!`, 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    static closeToast() {
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer && toastContainer.firstChild) {
            const toast = toastContainer.firstChild;
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => {
                toastContainer.innerHTML = '';
            }, 300);
        }
    }

    static openTermsModal() {
        const modal = document.getElementById('termsModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static closeTermsModal() {
        const modal = document.getElementById('termsModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    static openPrivacyModal() {
        const modal = document.getElementById('privacyModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static closePrivacyModal() {
        const modal = document.getElementById('privacyModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    static clearErrors() {
        document.querySelectorAll('.input-error').forEach(error => error.classList.remove('show'));
        document.querySelectorAll('input').forEach(input => input.classList.remove('error'));
    }

    static showError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.add('show');
        }
    }

    static hideError(element) {
        if (element) {
            element.classList.remove('show');
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
        
        notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
        setTimeout(() => notification.remove(), duration);
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    LoginManager.init();
});