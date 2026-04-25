class StreakManager {
    static currentUser = null;
    static habits = [];
    static currentDate = new Date().toDateString();
    static currentSort = 'favorites';
    static TRACKING_START_DATE = new Date(2026, 3, 24); // April 24, 2026

    // ============================================
    // INITIALIZATION
    // ============================================
    
    static init() {
    console.log('🚀 [STREAK] ========== INITIALIZATION STARTED ==========');
    
    if (!this.checkUserLoggedIn()) {
        console.log('❌ [STREAK] User not logged in, initialization aborted');
        return;
    }
    
    console.log('📌 [STREAK] Step 1: Loading user data...');
    this.loadUserData();
    
    // Add this line to check streaks on load
    console.log('📌 [STREAK] Step 1.5: Checking streaks for reset...');
    this.checkAllStreaks();
    
    console.log('📌 [STREAK] Step 2: Setting up event listeners...');
    this.setupEventListeners();
    
    console.log('📌 [STREAK] Step 3: Setting up time and greeting...');
    this.setupTimeAndGreeting();
    
    console.log('📌 [STREAK] Step 4: Loading user settings...');
    this.loadUserSettings();
    
    console.log('📌 [STREAK] Step 5: Rendering habits...');
    this.renderHabits();
    
    console.log('📌 [STREAK] Step 6: Updating stats...');
    this.updateStats();
    
    console.log(`✅ [STREAK] ========== INITIALIZATION COMPLETE ==========`);
    console.log(`📊 [STREAK] Total habits loaded: ${this.habits.length}`);
}

    // ============================================
    // USER AUTHENTICATION
    // ============================================
    
    static checkUserLoggedIn() {
        console.log('🔐 [STREAK] Checking user login status...');
        
        let currentUser = null;
        if (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) {
            currentUser = StorageManager.getCurrentUser();
            console.log('📌 [STREAK] StorageManager.getCurrentUser():', currentUser);
        } else {
            console.warn('⚠️ [STREAK] StorageManager not available');
        }
        
        const profile = JSON.parse(localStorage.getItem('anime_tracker_profile') || '{}');
        const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
        
        console.log('📌 [STREAK] Profile from localStorage:', profile);
        console.log('📌 [STREAK] isLoggedIn flag:', isLoggedIn);
        
        if ((!currentUser && !profile.id) || !isLoggedIn) {
            console.log('❌ [STREAK] No logged-in user detected');
            this.showNotification('Please login to continue', 'info', 2000);
            setTimeout(() => window.location.href = 'login.html', 1500);
            return false;
        }
        
        this.currentUser = currentUser || {
            id: profile.id,
            identifier: profile.identifier,
            name: profile.name
        };
        
        console.log('✅ [STREAK] User logged in:', this.currentUser.name, `(${this.currentUser.identifier})`);
        return true;
    }

    // ============================================
    // DATA LOADING & SAVING
    // ============================================
    
    static loadUserData() {
        const storageKey = `habits_${this.currentUser?.id}`;
        console.log(`📂 [STREAK] Loading habits from localStorage key: "${storageKey}"`);
        
        const savedHabits = localStorage.getItem(storageKey);
        console.log('📌 [STREAK] Raw saved data:', savedHabits);
        
        if (savedHabits) {
            this.habits = JSON.parse(savedHabits);
            console.log(`✅ [STREAK] Loaded ${this.habits.length} habits from storage`);
            console.log('📌 [STREAK] Habits:', this.habits.map(h => ({ name: h.name, streak: h.streak, isFavorite: h.isFavorite })));
        } else {
            console.log('⚠️ [STREAK] No saved habits found, creating defaults');
            // Initialize with default habits
            this.habits = [
                {
                    id: Date.now().toString(),
                    name: 'Read a Book',
                    icon: 'fa-book',
                    color: '#3498db',
                    streak: 0,
                    bestStreak: 0,
                    lastCompleted: null,
                    isFavorite: false,
                    createdAt: new Date().toISOString(),
                    history: []
                },
                {
                    id: (Date.now() + 1).toString(),
                    name: 'Exercise',
                    icon: 'fa-dumbbell',
                    color: '#2ecc71',
                    streak: 0,
                    bestStreak: 0,
                    lastCompleted: null,
                    isFavorite: false,
                    createdAt: new Date().toISOString(),
                    history: []
                }
            ];
            this.saveHabits();
            console.log('✅ [STREAK] Default habits created');
        }
    }

    static saveHabits() {
        const storageKey = `habits_${this.currentUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(this.habits));
        console.log(`💾 [STREAK] Saved ${this.habits.length} habits to localStorage key: "${storageKey}"`);
    }

    // ============================================
    // UI SETUP
    // ============================================
    
    static setupTimeAndGreeting() {
        console.log('⏰ [STREAK] Setting up time and greeting...');
        
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
        this.loadAvatar();
        console.log('✅ [STREAK] Time and greeting setup complete');
    }

    static loadAvatar() {
        const avatarKey = `user_avatar_${this.currentUser?.id}`;
        const savedAvatar = localStorage.getItem(avatarKey);
        const avatarImg = document.getElementById('avatarImage');
        
        console.log(`🖼️ [STREAK] Loading avatar from key: "${avatarKey}"`);
        
        if (avatarImg) {
            if (savedAvatar && savedAvatar !== 'null') {
                avatarImg.src = savedAvatar;
                console.log('✅ [STREAK] Avatar loaded from storage');
            } else {
                const name = this.currentUser?.name || 'User';
                avatarImg.src = `https://ui-avatars.com/api/?name=${name.charAt(0).toUpperCase()}&background=3498db&color=fff&size=60`;
                console.log('✅ [STREAK] Default avatar generated');
            }
        } else {
            console.warn('⚠️ [STREAK] Avatar image element not found');
        }
    }

    // ============================================
    // STATISTICS
    // ============================================
    
    static updateStats() {
        console.log('📊 [STREAK] Updating statistics...');
        
        const totalStreakDays = this.habits.reduce((sum, habit) => sum + (habit.streak || 0), 0);
        const bestStreak = Math.max(...this.habits.map(h => h.bestStreak || 0), 0);
        const activeHabits = this.habits.length;
        
        console.log('📌 [STREAK] Stats calculated:', { totalStreakDays, bestStreak, activeHabits });
        
        const totalEl = document.getElementById('totalStreakDays');
        const bestEl = document.getElementById('bestStreak');
        const activeEl = document.getElementById('activeHabits');
        
        if (totalEl) totalEl.textContent = totalStreakDays;
        if (bestEl) bestEl.textContent = bestStreak;
        if (activeEl) activeEl.textContent = activeHabits;
        
        console.log('✅ [STREAK] Statistics updated');
    }

    // ============================================
    // HABIT ACTIONS
    // ============================================
    
    static toggleFavorite(habitId) {
        console.log(`⭐ [STREAK] Toggling favorite for habit ID: ${habitId}`);
        
        const habit = this.habits.find(h => h.id === habitId);
        if (habit) {
            habit.isFavorite = !habit.isFavorite;
            this.saveHabits();
            this.renderHabits();
            console.log(`✅ [STREAK] Habit "${habit.name}" favorite status: ${habit.isFavorite}`);
            this.showNotification(
                habit.isFavorite ? `Added "${habit.name}" to favorites!` : `Removed "${habit.name}" from favorites`,
                'info'
            );
        } else {
            console.warn(`⚠️ [STREAK] Habit not found with ID: ${habitId}`);
        }
    }

    static getSortedHabits() {
        console.log(`🔄 [STREAK] Sorting habits by: ${this.currentSort}`);
        
        const habitsCopy = [...this.habits];
        
        let sorted;
        switch (this.currentSort) {
            case 'favorites':
                sorted = habitsCopy.sort((a, b) => {
                    if (a.isFavorite === b.isFavorite) return 0;
                    return a.isFavorite ? -1 : 1;
                });
                break;
            case 'name':
                sorted = habitsCopy.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'streak':
                sorted = habitsCopy.sort((a, b) => b.streak - a.streak);
                break;
            case 'recent':
                sorted = habitsCopy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            default:
                sorted = habitsCopy;
        }
        
        console.log(`✅ [STREAK] Sorted ${sorted.length} habits`);
        return sorted;
    }

    // ============================================
// STREAK COUNT METHODS - FIXED
// ============================================

static updateStreakCount(habit) {
    console.log(`🔄 [STREAK] Updating streak count for: ${habit.name}`);
    
    if (!habit.history || habit.history.length === 0) {
        habit.streak = 0;
        console.log(`📌 [STREAK] No history, streak set to 0`);
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toDateString();
    
    // Get all completed dates
    const completedDates = new Set();
    habit.history.forEach(entry => {
        if (entry.completed) {
            completedDates.add(entry.date);
        }
    });
    
    // Check if today is completed
    const todayCompleted = completedDates.has(todayString);
    
    if (!todayCompleted) {
        // If today is not completed, check if we need to reset
        const lastCompleted = habit.lastCompleted ? new Date(habit.lastCompleted) : null;
        
        if (lastCompleted) {
            lastCompleted.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((today - lastCompleted) / (1000 * 60 * 60 * 24));
            
            console.log(`📌 [STREAK] Days since last completed: ${diffDays}`);
            
            // Rule: Only reset if difference is greater than 2 days
            if (diffDays > 2) {
                habit.streak = 0;
                console.log(`📌 [STREAK] Streak reset to 0 (missed 2+ days)`);
            } else {
                // Keep the current streak value (don't reset yet)
                console.log(`📌 [STREAK] Streak remains at ${habit.streak} (waiting for reset tomorrow if still missed)`);
            }
        }
        return;
    }
    
    // Today is completed - calculate current streak
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    while (true) {
        const dateString = checkDate.toDateString();
        const isCompleted = completedDates.has(dateString);
        
        if (isCompleted) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    habit.streak = currentStreak;
    console.log(`📌 [STREAK] Current streak calculated: ${currentStreak} days`);
}

static checkAndResetStreak(habit) {
    console.log(`🔍 [STREAK] Checking streak status for: ${habit.name}`);
    
    if (!habit.lastCompleted) {
        console.log(`📌 [STREAK] No last completed date, streak is 0`);
        habit.streak = 0;
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toDateString();
    
    const lastCompleted = new Date(habit.lastCompleted);
    lastCompleted.setHours(0, 0, 0, 0);
    
    // Check if today is already completed
    const todayCompleted = habit.history?.some(h => h.date === todayString && h.completed);
    
    if (todayCompleted) {
        // If today is completed, recalculate streak
        this.updateStreakCount(habit);
        return;
    }
    
    // Calculate days since last completed
    const diffDays = Math.floor((today - lastCompleted) / (1000 * 60 * 60 * 24));
    
    console.log(`📌 [STREAK] Days since last completed: ${diffDays}`);
    
    // Streak break detection logic
    if (diffDays === 2) {
        // Exactly one full day missed (streak broken but not reset yet)
        console.log(`⚠️ [STREAK] Streak broken! First missed day. Keeping streak value: ${habit.streak}`);
        // Do NOT reset streak - keep showing the previous streak value
        // Mark that streak is broken internally (for visual indication)
        habit.isBroken = true;
    } else if (diffDays > 2) {
        // More than one full day missed - reset streak
        console.log(`⚠️ [STREAK] Streak reset to 0 (missed ${diffDays} days)`);
        habit.streak = 0;
        habit.isBroken = false;
    } else {
        // Streak is still active (diffDays === 1 means completed yesterday)
        habit.isBroken = false;
    }
}

static markDone(habitId) {
    console.log(`✅ [STREAK] Marking habit as done - ID: ${habitId}`);
    
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) {
        console.warn(`⚠️ [STREAK] Habit not found with ID: ${habitId}`);
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toDateString();
    
    console.log(`📌 [STREAK] Today's date: ${todayString}`);
    console.log(`📌 [STREAK] Habit last completed: ${habit.lastCompleted}`);
    
    // Check if already completed today
    if (habit.lastCompleted === todayString) {
        console.log(`⚠️ [STREAK] Habit "${habit.name}" already completed today`);
        this.showNotification(`You already completed "${habit.name}" today! 🎉`, 'info');
        return;
    }
    
    // Initialize history if needed
    if (!habit.history) {
        habit.history = [];
    }
    
    // Add today's completion to history
    habit.history.push({
        date: todayString,
        completed: true
    });
    
    // Update last completed date
    habit.lastCompleted = todayString;
    
    // Clear broken flag
    habit.isBroken = false;
    
    // Calculate new streak count based on consecutive days
    const completedDates = new Set();
    habit.history.forEach(entry => {
        if (entry.completed) {
            completedDates.add(entry.date);
        }
    });
    
    // Calculate streak from today backwards
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    while (true) {
        const dateString = checkDate.toDateString();
        const isCompleted = completedDates.has(dateString);
        
        if (isCompleted) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    habit.streak = currentStreak;
    
    // Update best streak if needed
    if (habit.streak > (habit.bestStreak || 0)) {
        habit.bestStreak = habit.streak;
        console.log(`🎉 [STREAK] New best streak: ${habit.bestStreak}`);
        this.showNotification(`🎉 New record! ${habit.streak} day streak for "${habit.name}"!`, 'success');
    } else {
        console.log(`🔥 [STREAK] Current streak: ${habit.streak} days`);
        this.showNotification(`🔥 ${habit.streak} day streak for "${habit.name}"! Keep going!`, 'success');
    }
    
    // Save and update UI
    this.saveHabits();
    this.renderHabits();
    this.updateStats();
    console.log(`✅ [STREAK] Habit "${habit.name}" marked as done, streak: ${habit.streak}`);
}

static checkAllStreaks() {
    console.log(`🔍 [STREAK] Checking all streaks for reset...`);
    
    let anyChanges = false;
    
    this.habits.forEach(habit => {
        const oldStreak = habit.streak;
        this.checkAndResetStreak(habit);
        if (oldStreak !== habit.streak) {
            anyChanges = true;
            console.log(`📌 [STREAK] Habit "${habit.name}" streak changed: ${oldStreak} -> ${habit.streak}`);
        }
    });
    
    if (anyChanges) {
        this.saveHabits();
        this.renderHabits();
        this.updateStats();
        console.log(`✅ [STREAK] Streaks updated after check`);
    }
}

// Add a method to check streaks on page load
static checkAllStreaks() {
    console.log(`🔍 [STREAK] Checking all streaks for reset...`);
    
    let anyChanges = false;
    
    this.habits.forEach(habit => {
        const oldStreak = habit.streak;
        this.checkAndResetStreak(habit);
        if (oldStreak !== habit.streak) {
            anyChanges = true;
            console.log(`📌 [STREAK] Habit "${habit.name}" streak changed: ${oldStreak} -> ${habit.streak}`);
        }
    });
    
    if (anyChanges) {
        this.saveHabits();
        this.renderHabits();
        this.updateStats();
        console.log(`✅ [STREAK] Streaks updated after check`);
    }
}

    static addHabit(name, icon, color) {
        console.log(`➕ [STREAK] Adding new habit: "${name}"`);
        
        const newHabit = {
            id: Date.now().toString(),
            name: name,
            icon: icon || 'fa-smile',
            color: color || '#3498db',
            streak: 0,
            bestStreak: 0,
            lastCompleted: null,
            isFavorite: false,
            createdAt: new Date().toISOString(),
            history: []
        };
        
        this.habits.push(newHabit);
        this.saveHabits();
        this.renderHabits();
        this.updateStats();
        
        console.log(`✅ [STREAK] Habit "${name}" added successfully`);
        console.log(`📊 [STREAK] Total habits: ${this.habits.length}`);
        this.showNotification(`Habit "${name}" added!`, 'success');
    }

    static updateHabit(habitId, name, icon, color) {
        console.log(`✏️ [STREAK] Updating habit ID: ${habitId}`);
        
        const habit = this.habits.find(h => h.id === habitId);
        if (habit) {
            const oldName = habit.name;
            habit.name = name;
            habit.icon = icon || habit.icon;
            habit.color = color || habit.color;
            this.saveHabits();
            this.renderHabits();
            console.log(`✅ [STREAK] Habit updated from "${oldName}" to "${name}"`);
            this.showNotification('Habit updated!', 'success');
        } else {
            console.warn(`⚠️ [STREAK] Habit not found with ID: ${habitId}`);
        }
    }

    static deleteHabit(habitId) {
        console.log(`🗑️ [STREAK] Deleting habit ID: ${habitId}`);
        
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) {
            console.warn(`⚠️ [STREAK] Habit not found with ID: ${habitId}`);
            return;
        }
        
        if (confirm(`Are you sure you want to delete "${habit?.name}"? Your streak data will be lost.`)) {
            this.habits = this.habits.filter(h => h.id !== habitId);
            this.saveHabits();
            this.renderHabits();
            this.updateStats();
            console.log(`✅ [STREAK] Habit "${habit.name}" deleted`);
            this.showNotification('Habit deleted', 'info');
        } else {
            console.log(`❌ [STREAK] Habit deletion cancelled`);
        }
    }

    // ============================================
    // RENDERING
    // ============================================
    
    static renderHabits() {
    console.log('🎨 [STREAK] Rendering habits...');
    
    const container = document.getElementById('habitsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (!container) {
        console.error('❌ [STREAK] Habits container element not found!');
        return;
    }
    
    console.log(`📌 [STREAK] Total habits to render: ${this.habits.length}`);
    
    if (this.habits.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        console.log('⚠️ [STREAK] No habits to display');
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    const sortedHabits = this.getSortedHabits();
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    
    container.innerHTML = sortedHabits.map(habit => {
        const isDoneToday = habit.lastCompleted === today;
        
        // Check if streak is broken (missed yesterday)
        const isStreakBroken = habit.lastCompleted !== yesterdayString && 
                               habit.lastCompleted !== today && 
                               habit.streak === 0 &&
                               habit.bestStreak > 0;
        
        const missedClass = isStreakBroken ? 'missed' : '';
        const isFavorited = habit.isFavorite;
        
        return `
            <div class="habit-card ${missedClass} ${isFavorited ? 'favorited' : ''}">
                <div class="habit-card-header">
                    <div class="habit-title">
                        <div class="habit-icon" style="background: ${habit.color}20; color: ${habit.color}">
                            <i class="fas ${habit.icon}"></i>
                        </div>
                        <span class="habit-name">${this.escapeHtml(habit.name)}</span>
                    </div>
                    <div class="habit-actions">
                        <button class="habit-action-btn favorite-btn ${isFavorited ? 'active' : ''}" data-id="${habit.id}" title="Favorite">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="habit-action-btn calendar-btn" data-id="${habit.id}" title="View Calendar">
                            <i class="fas fa-calendar-alt"></i>
                        </button>
                        <button class="habit-action-btn edit-habit" data-id="${habit.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="habit-action-btn delete-habit" data-id="${habit.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="habit-card-body">
                    <div class="streak-display">
                        <div class="current-streak">
                            <span class="streak-number" style="color: ${habit.isBroken ? '#f39c12' : (habit.streak === 0 ? '#666' : '#f39c12')}">
                                ${habit.streak}
                            </span>
                            <span class="streak-label">day streak</span>
                            <span class="streak-flame">
                                <i class="fas fa-fire" style="color: ${habit.isBroken ? '#f39c12' : (habit.streak === 0 ? '#666' : '#f39c12')}"></i>
                            </span>
                        </div>
                        ${habit.isBroken ? '<div class="streak-warning"><i class="fas fa-exclamation-triangle"></i> Streak at risk - mark today to continue!</div>' : ''}
                        <div class="best-streak">
                            <i class="fas fa-trophy"></i> Best: ${habit.bestStreak} days
                        </div>
                    </div>
                    <div class="last-updated">
                        <i class="fas fa-calendar"></i>
                        <span>Last: ${habit.lastCompleted ? new Date(habit.lastCompleted).toLocaleDateString() : 'Not started yet'}</span>
                    </div>
                </div>
                <div class="habit-card-footer">
                    <button class="mark-done-btn ${isDoneToday ? 'done-today' : ''}" data-id="${habit.id}" ${isDoneToday ? 'disabled' : ''}>
                        <i class="fas ${isDoneToday ? 'fa-check-circle' : 'fa-check'}"></i>
                        ${isDoneToday ? 'Completed Today!' : 'Mark as Done'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    console.log(`✅ [STREAK] Rendered ${sortedHabits.length} habit cards`);
    
    // Add event listeners
    document.querySelectorAll('.mark-done-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                console.log(`🔘 [STREAK] Mark done button clicked for habit ID: ${btn.dataset.id}`);
                this.markDone(btn.dataset.id);
            }
        });
    });
    
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`🔘 [STREAK] Favorite button clicked for habit ID: ${btn.dataset.id}`);
            this.toggleFavorite(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.calendar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`🔘 [STREAK] Calendar button clicked for habit ID: ${btn.dataset.id}`);
            this.showCalendar(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.edit-habit').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`🔘 [STREAK] Edit button clicked for habit ID: ${btn.dataset.id}`);
            this.openEditModal(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.delete-habit').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`🔘 [STREAK] Delete button clicked for habit ID: ${btn.dataset.id}`);
            this.deleteHabit(btn.dataset.id);
        });
    });
}

    // ============================================
    // MODAL HANDLERS
    // ============================================
    
    static openEditModal(habitId) {
    console.log(`📝 [STREAK] Opening edit modal for habit ID: ${habitId}`);
    
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) {
        console.warn(`⚠️ [STREAK] Habit not found with ID: ${habitId}`);
        return;
    }
    
    const editIdInput = document.getElementById('editHabitId');
    if (editIdInput) editIdInput.value = habit.id;
    
    const habitNameInput = document.getElementById('habitName');
    if (habitNameInput) habitNameInput.value = habit.name;
    
    const habitIconInput = document.getElementById('habitIcon');
    if (habitIconInput) habitIconInput.value = habit.icon;
    
    // Update icon preview
    this.updateIconPreview();
    
    // Set selected color
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Edit Habit';
    
    // Highlight the selected color in the color grid
    const colorOptions = document.querySelectorAll('.color-option');
    if (colorOptions.length > 0) {
        colorOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.color === habit.color) {
                option.classList.add('selected');
            }
        });
    }
    
    const modal = document.getElementById('habitModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    console.log(`✅ [STREAK] Edit modal opened for habit: ${habit.name}`);
}

static openAddModal() {
    console.log(`➕ [STREAK] Opening add habit modal`);
    
    // Safely set values with null checks
    const editIdInput = document.getElementById('editHabitId');
    if (editIdInput) editIdInput.value = '';
    
    const habitNameInput = document.getElementById('habitName');
    if (habitNameInput) habitNameInput.value = '';
    
    const habitIconInput = document.getElementById('habitIcon');
    if (habitIconInput) habitIconInput.value = 'fa-smile';
    
    // Update icon preview
    this.updateIconPreview();
    
    // Reset color selection
    const colorOptions = document.querySelectorAll('.color-option');
    if (colorOptions.length > 0) {
        colorOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.color === '#3498db') {
                option.classList.add('selected');
            }
        });
    } else {
        // Fallback: create color grid if it doesn't exist
        this.createColorGrid();
    }
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Add New Habit';
    
    const modal = document.getElementById('habitModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    console.log(`✅ [STREAK] Add habit modal opened`);
}
static createColorGrid() {
    const colors = [
        '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#34495e', '#16a085', '#27ae60',
        '#2980b9', '#8e44ad', '#d35400', '#c0392b', '#7f8c8d'
    ];
    
    const colorGrid = document.getElementById('colorGrid');
    if (!colorGrid) return;
    
    colorGrid.innerHTML = colors.map(color => `
        <div class="color-option ${color === '#3498db' ? 'selected' : ''}" data-color="${color}" style="background: ${color}; opacity: 0.85;"></div>
    `).join('');
    
    // Add click listeners to color options
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
}   


    

    static closeHabitModal() {
        console.log(`🔒 [STREAK] Closing habit modal`);
        
        document.getElementById('habitModal').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('habitForm').reset();
        
        console.log(`✅ [STREAK] Habit modal closed`);
    }

    static saveHabitFromForm() {
    console.log(`💾 [STREAK] Saving habit from form`);
    
    const habitId = document.getElementById('editHabitId').value;
    const name = document.getElementById('habitName').value.trim();
    let icon = document.getElementById('habitIcon').value.trim();
    const selectedColor = document.querySelector('.color-option.selected');
    const color = selectedColor ? selectedColor.dataset.color : '#3498db';
    
    console.log(`📌 [STREAK] Form data:`, { habitId, name, icon, color });
    
    if (!name) {
        console.warn(`⚠️ [STREAK] Habit name is empty`);
        this.showNotification('Please enter a habit name', 'error');
        return;
    }
    
    // Clean up icon name
    if (icon) {
        if (!icon.startsWith('fa-')) {
            icon = 'fa-' + icon;
        }
    } else {
        icon = 'fa-smile';
    }
    
    if (habitId) {
        this.updateHabit(habitId, name, icon, color);
    } else {
        this.addHabit(name, icon, color);
    }
    
    this.closeHabitModal();
}

    // ============================================
    // CALENDAR
    // ============================================
    
    static showCalendar(habitId, year, month) {
        console.log(`📅 [STREAK] Showing calendar for habit ID: ${habitId}`);
        
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) {
            console.warn(`⚠️ [STREAK] Habit not found with ID: ${habitId}`);
            return;
        }
        const calendarStats = document.querySelector('.calendar-stats');
if (calendarStats) {
    const stats = this.getCalendarStats(habit);
    calendarStats.innerHTML = `
        <p>🔥 Current Streak: <span class="stats-streak">${stats.currentStreak}</span> days</p>
        <p>🏆 Best Streak: <span class="stats-streak">${stats.bestStreak}</span> days</p>
        <p>📅 Last Completed: ${stats.lastCompleted ? new Date(stats.lastCompleted).toLocaleDateString() : 'Never'}</p>
        ${stats.lastBreakDay ? `<p>⚠️ Streak Broken: ${stats.lastBreakDay.toLocaleDateString()}</p>` : ''}
        <p style="font-size: 0.7rem; margin-top: 8px; opacity: 0.7;">
            🟢 Green = Completed | 🔴 Red = Streak Broken | 🟠 Orange = Recovering | ⚪ Grey = No activity
        </p>
    `;
}
        
        const currentYear = year || new Date().getFullYear();
        const currentMonth = month !== undefined ? month : new Date().getMonth();
        
        console.log(`📌 [STREAK] Calendar date: ${currentYear}-${currentMonth + 1}`);
        
        const calendarDays = this.getHabitCalendarData(habit, currentYear, currentMonth);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        // Create calendar modal if not exists
        let modal = document.getElementById('calendarModal');
        if (!modal) {
            console.log(`📌 [STREAK] Creating calendar modal`);
            modal = document.createElement('div');
            modal.id = 'calendarModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content calendar-modal">
                    <div class="calendar-header">
                        <h3 id="calendarTitle">Calendar</h3>
                        <div class="calendar-nav">
                            <button id="prevMonthBtn"><i class="fas fa-chevron-left"></i></button>
                            <select id="yearSelect" class="calendar-year-select"></select>
                            <button id="nextMonthBtn"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <button class="close-modal" id="closeCalendarModal"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="calendar-weekdays">
                        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                    </div>
                    <div class="calendar-days" id="calendarDays"></div>
                    <div class="calendar-legend">
                        <div class="legend-item"><div class="legend-color completed"></div><span>Completed</span></div>
                        <div class="legend-item"><div class="legend-color broken"></div><span>Streak Broken</span></div>
                        <div class="legend-item"><div class="legend-color recovering"></div><span>Recovering</span></div>
                        <div class="legend-item"><div class="legend-color future"></div><span>Future</span></div>
                        <div class="legend-item"><div class="legend-color disabled"></div><span>Before Apr 24, 2026</span></div>
                    </div>
                    <div class="calendar-stats">
                        <p>Current Streak: <span class="stats-streak">${habit.streak}</span> days</p>
                        <p>Best Streak: <span class="stats-streak">${habit.bestStreak}</span> days</p>
                        <p>Last Completed: ${habit.lastCompleted ? new Date(habit.lastCompleted).toLocaleDateString() : 'Never'}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Populate year select (2026 to 2036)
        const yearSelect = document.getElementById('yearSelect');
        if (yearSelect) {
            yearSelect.innerHTML = '';
            for (let y = 2026; y <= 2036; y++) {
                const option = document.createElement('option');
                option.value = y;
                option.textContent = y;
                if (y === currentYear) option.selected = true;
                yearSelect.appendChild(option);
            }
        }
        
        // Update calendar title
        const titleEl = document.getElementById('calendarTitle');
        if (titleEl) titleEl.textContent = `${habit.name} - ${monthNames[currentMonth]} ${currentYear}`;
        
        // Render calendar days
        const daysContainer = document.getElementById('calendarDays');
        if (daysContainer) {
            daysContainer.innerHTML = calendarDays.map(day => {
                if (day.date === null) {
                    return '<div class="calendar-day empty"></div>';
                }
                
                let statusClass = '';
                switch (day.status) {
                    case 'completed': statusClass = 'completed'; break;
                    case 'broken': statusClass = 'broken'; break;
                    case 'recovering': statusClass = 'recovering'; break;
                    case 'future': statusClass = 'future'; break;
                    case 'disabled': statusClass = 'disabled'; break;
                    default: statusClass = '';
                }
                
                const todayClass = day.isToday ? 'today' : '';
                
                return `
                    <div class="calendar-day ${statusClass} ${todayClass}" data-date="${day.date}">
                        ${day.date}
                    </div>
                `;
            }).join('');
        }
        
        // Setup navigation
        const setupNavigation = () => {
            const prevBtn = document.getElementById('prevMonthBtn');
            const nextBtn = document.getElementById('nextMonthBtn');
            const yearSelectEl = document.getElementById('yearSelect');
            const closeBtn = document.getElementById('closeCalendarModal');
            
            if (prevBtn) {
                const newPrev = prevBtn.cloneNode(true);
                prevBtn.parentNode.replaceChild(newPrev, prevBtn);
                newPrev.addEventListener('click', () => {
                    console.log(`📅 [STREAK] Previous month clicked`);
                    let newMonth = currentMonth - 1;
                    let newYear = currentYear;
                    if (newMonth < 0) {
                        newMonth = 11;
                        newYear--;
                    }
                    if (newYear >= 2026) {
                        this.showCalendar(habitId, newYear, newMonth);
                    }
                });
            }
            
            if (nextBtn) {
                const newNext = nextBtn.cloneNode(true);
                nextBtn.parentNode.replaceChild(newNext, nextBtn);
                newNext.addEventListener('click', () => {
                    console.log(`📅 [STREAK] Next month clicked`);
                    let newMonth = currentMonth + 1;
                    let newYear = currentYear;
                    if (newMonth > 11) {
                        newMonth = 0;
                        newYear++;
                    }
                    if (newYear <= 2036) {
                        this.showCalendar(habitId, newYear, newMonth);
                    }
                });
            }
            
            if (yearSelectEl) {
                const newYearSelect = yearSelectEl.cloneNode(true);
                yearSelectEl.parentNode.replaceChild(newYearSelect, yearSelectEl);
                newYearSelect.addEventListener('change', () => {
                    const newYear = parseInt(newYearSelect.value);
                    console.log(`📅 [STREAK] Year changed to: ${newYear}`);
                    this.showCalendar(habitId, newYear, currentMonth);
                });
            }
            
            if (closeBtn) {
                const newClose = closeBtn.cloneNode(true);
                closeBtn.parentNode.replaceChild(newClose, closeBtn);
                newClose.addEventListener('click', () => {
                    console.log(`📅 [STREAK] Closing calendar modal`);
                    modal.classList.remove('active');
                    document.getElementById('overlay')?.classList.remove('active');
                    document.body.style.overflow = '';
                });
            }
        };
        
        setupNavigation();
        
        modal.classList.add('active');
        document.getElementById('overlay')?.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        console.log(`✅ [STREAK] Calendar opened for habit: ${habit.name}`);
        
        // Close on overlay click
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.onclick = () => {
                console.log(`📅 [STREAK] Calendar closed via overlay`);
                modal.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            };
        }
    }

    // ============================================
// CALENDAR LOGIC - FIXED
// ============================================

static getHabitCalendarData(habit, year, month) {
    console.log(`📊 [STREAK] Generating calendar data for ${year}-${month + 1}`);
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all completed dates from history
    const completedDates = new Set();
    if (habit.history) {
        habit.history.forEach(entry => {
            if (entry.completed) {
                completedDates.add(entry.date);
            }
        });
    }
    
    // Analyze streak data to find break day
    const streakAnalysis = this.analyzeStreakBreaks(habit, completedDates);
    const breakDay = streakAnalysis.breakDay; // Date object of the break day
    const lastCompletedDate = habit.lastCompleted ? new Date(habit.lastCompleted) : null;
    
    const calendarDays = [];
    const firstDayOfMonth = startDate.getDay();
    const daysInMonth = endDate.getDate();
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push({ date: null, status: 'empty' });
    }
    
    // Add days of the month
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(year, month, d);
        currentDate.setHours(0, 0, 0, 0);
        const dateString = currentDate.toDateString();
        const isCompleted = completedDates.has(dateString);
        
        let status = 'future';
        
        // Rule 1: Dates before tracking start (April 24, 2026) -> Grey
        if (currentDate < this.TRACKING_START_DATE) {
            status = 'disabled';
        }
        // Rule 2: Future dates -> Grey
        else if (currentDate > today) {
            status = 'future';
        }
        // Rule 3: Completed days -> Green
        else if (isCompleted) {
            status = 'completed';
        }
        // Rule 4: The exact streak break day -> Red
        else if (breakDay && currentDate.toDateString() === breakDay.toDateString()) {
            status = 'broken';
        }
        // Rule 5: Days after break day but before today -> Golden/Orange
        else if (breakDay && currentDate > breakDay && currentDate <= today) {
            status = 'recovering';
        }
        // Rule 6: Days before any streak started but after tracking start -> Grey
        else {
            status = 'future';
        }
        
        // Override: If today is completed, mark it as green instead of orange/red
        if (currentDate.toDateString() === today.toDateString() && isCompleted) {
            status = 'completed';
        }
        
        const isToday = currentDate.toDateString() === today.toDateString();
        
        calendarDays.push({
            date: d,
            fullDate: currentDate,
            status: status,
            isToday: isToday,
            isCompleted: isCompleted
        });
    }
    
    console.log(`✅ [STREAK] Calendar data generated: ${calendarDays.length} days`);
    console.log(`📌 [STREAK] Break day: ${breakDay ? breakDay.toDateString() : 'None'}`);
    console.log(`📌 [STREAK] Last completed: ${lastCompletedDate ? lastCompletedDate.toDateString() : 'None'}`);
    
    return calendarDays;
}
static analyzeStreakBreaks(habit, completedDates) {
    console.log(`🔍 [STREAK] Analyzing streak breaks for habit: ${habit.name}`);
    
    const trackingStart = new Date(this.TRACKING_START_DATE);
    trackingStart.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let breakDay = null;
    let wasOnStreak = false;
    let consecutiveCompletions = 0;
    
    // Create a sorted list of all dates from tracking start to today
    const allDates = [];
    let currentDate = new Date(trackingStart);
    while (currentDate <= today) {
        allDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Iterate through dates to find the first break
    for (let i = 0; i < allDates.length; i++) {
        const date = allDates[i];
        const dateString = date.toDateString();
        const isCompleted = completedDates.has(dateString);
        
        if (isCompleted) {
            consecutiveCompletions++;
            wasOnStreak = true;
        } else {
            // If we had a streak going and this day is missed, this is the break day
            if (wasOnStreak && consecutiveCompletions > 0) {
                breakDay = new Date(date);
                console.log(`📍 [STREAK] Break day detected: ${breakDay.toDateString()}`);
                break;
            }
            // Reset consecutive completions if no streak was active
            consecutiveCompletions = 0;
            wasOnStreak = false;
        }
    }
    
    // Special case: If there's a last completed date, check if we missed days after it
    if (!breakDay && habit.lastCompleted) {
        const lastCompleted = new Date(habit.lastCompleted);
        lastCompleted.setHours(0, 0, 0, 0);
        
        // Check if there are any missed days between last completed and today
        let checkDate = new Date(lastCompleted);
        checkDate.setDate(checkDate.getDate() + 1);
        
        while (checkDate <= today) {
            const dateString = checkDate.toDateString();
            if (!completedDates.has(dateString)) {
                breakDay = new Date(checkDate);
                console.log(`📍 [STREAK] Break day found via gap: ${breakDay.toDateString()}`);
                break;
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
    }
    
    return {
        breakDay: breakDay,
        lastCompletedDate: habit.lastCompleted ? new Date(habit.lastCompleted) : null,
        hasBreak: breakDay !== null
    };
}
static getCalendarStats(habit) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    while (true) {
        const dateString = checkDate.toDateString();
        const isCompleted = habit.history?.some(h => h.date === dateString && h.completed) || false;
        
        if (isCompleted) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    // Calculate best streak
    let bestStreak = habit.bestStreak || 0;
    
    // Find last break day
    const analysis = this.analyzeStreakBreaks(habit, new Set(habit.history?.filter(h => h.completed).map(h => h.date)));
    
    return {
        currentStreak: currentStreak,
        bestStreak: bestStreak,
        lastBreakDay: analysis.breakDay,
        lastCompleted: habit.lastCompleted
    };
}

    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    static setupEventListeners() {
        console.log('🎯 [STREAK] Setting up event listeners...');

        // Inside setupEventListeners method, add:

// Color selection
document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
    });
});

// Icon picker button
const selectIconBtn = document.getElementById('selectIconBtn');
if (selectIconBtn) {
    selectIconBtn.addEventListener('click', () => this.openIconPicker());
}

// Icon picker close buttons
const closeIconPicker = document.getElementById('closeIconPicker');
const cancelIconPicker = document.getElementById('cancelIconPicker');
if (closeIconPicker) closeIconPicker.addEventListener('click', () => this.closeIconPicker());
if (cancelIconPicker) cancelIconPicker.addEventListener('click', () => this.closeIconPicker());

// Icon input live preview
const habitIconInput = document.getElementById('habitIcon');
if (habitIconInput) {
    habitIconInput.addEventListener('input', () => this.updateIconPreview());
}

// Initialize icon picker
this.initIconPicker();
        
        // Side panel toggles
        const menuToggle = document.getElementById('menuToggle');
        const settingsToggle = document.getElementById('settingsToggle');
        const closeMenu = document.getElementById('closeMenu');
        const closeSettings = document.getElementById('closeSettings');
        const overlay = document.getElementById('overlay');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                console.log('🔘 [STREAK] Menu button clicked');
                this.toggleSidePanel('menuPanel');
            });
        }
        if (settingsToggle) {
            settingsToggle.addEventListener('click', () => {
                console.log('🔘 [STREAK] Settings button clicked');
                this.toggleSidePanel('settingsPanel');
            });
        }
        if (closeMenu) closeMenu.addEventListener('click', () => this.closeSidePanel('menuPanel'));
        if (closeSettings) closeSettings.addEventListener('click', () => this.closeSidePanel('settingsPanel'));
        if (overlay) overlay.addEventListener('click', () => this.closeAllPanels());

        // Sorting buttons
        const sortCapsules = document.querySelectorAll('.sort-capsule');
        console.log(`📌 [STREAK] Found ${sortCapsules.length} sort capsules`);
        
        sortCapsules.forEach(btn => {
            btn.addEventListener('click', () => {
                const sortType = btn.dataset.sort;
                console.log(`🔘 [STREAK] Sort button clicked: ${sortType}`);
                this.currentSort = sortType;
                
                document.querySelectorAll('.sort-capsule').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                
                this.renderHabits();
            });
        });

        // Add habit buttons
        const addBtn = document.getElementById('addHabitBtn');
        const emptyAddBtn = document.getElementById('emptyAddBtn');
        
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                console.log('🔘 [STREAK] Add habit button clicked');
                this.openAddModal();
            });
        }
        if (emptyAddBtn) {
            emptyAddBtn.addEventListener('click', () => {
                console.log('🔘 [STREAK] Empty state add button clicked');
                this.openAddModal();
            });
        }

        // Habit modal
        const closeModal = document.getElementById('closeHabitModal');
        const cancelBtn = document.getElementById('cancelHabitBtn');
        const habitForm = document.getElementById('habitForm');
        
        if (closeModal) closeModal.addEventListener('click', () => this.closeHabitModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeHabitModal());
        if (habitForm) {
            habitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('🔘 [STREAK] Habit form submitted');
                this.saveHabitFromForm();
            });
        }

        // Icon preview
        const iconInput = document.getElementById('habitIcon');
        if (iconInput) {
            iconInput.addEventListener('input', (e) => {
                const iconPreview = document.getElementById('iconPreview');
                if (iconPreview) {
                    iconPreview.className = `fas ${e.target.value.trim() || 'fa-smile'}`;
                }
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
            if (e.key === 'Escape') {
                console.log('🔘 [STREAK] Escape key pressed');
                this.closeHabitModal();
                this.closeAllPanels();
                const calendarModal = document.getElementById('calendarModal');
                if (calendarModal && calendarModal.classList.contains('active')) {
                    calendarModal.classList.remove('active');
                    document.getElementById('overlay')?.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        });
        
        console.log('✅ [STREAK] All event listeners setup complete');
    }

    // ============================================
    // SIDE PANEL METHODS
    // ============================================
    
    static toggleSidePanel(panelId) {
        const panel = document.getElementById(panelId);
        const overlay = document.getElementById('overlay');
        if (panel) {
            panel.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            document.body.style.overflow = panel.classList.contains('active') ? 'hidden' : '';
            console.log(`📌 [STREAK] Panel ${panelId} toggled: ${panel.classList.contains('active') ? 'open' : 'closed'}`);
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
        console.log('📌 [STREAK] All panels closed');
    }

    // ============================================
    // SETTINGS & THEME
    // ============================================
    
    static setTheme(theme) {
        console.log(`🎨 [STREAK] Setting theme to: ${theme}`);
        
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        if (typeof ThemeManager !== 'undefined' && ThemeManager.setTheme) ThemeManager.setTheme(theme);
        localStorage.setItem('preferredTheme', theme);
    }

    static loadUserSettings() {
        console.log('⚙️ [STREAK] Loading user settings...');
        
        const settings = JSON.parse(localStorage.getItem('anime_tracker_settings') || '{}');
        const themeSelector = document.getElementById('themeSelector');
        
        if (themeSelector) {
            const savedTheme = settings.theme || 'system';
            themeSelector.value = savedTheme;
            this.setTheme(savedTheme);
            console.log(`✅ [STREAK] Theme set to: ${savedTheme}`);
        }
        
        const notificationsToggle = document.getElementById('notificationsToggle');
        if (notificationsToggle) {
            notificationsToggle.checked = settings.notifications !== false;
        }
    }

    // ============================================
    // EXPORT/IMPORT
    // ============================================
    
    static exportData() {
        console.log('📤 [STREAK] Exporting habits data...');
        
        const data = {
            habits: this.habits,
            user: this.currentUser,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `habits-backup-${this.currentUser?.identifier || this.currentUser?.id}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`✅ [STREAK] Exported ${this.habits.length} habits`);
        this.showNotification('Habits exported!', 'success');
    }

    static importData(file) {
        console.log('📥 [STREAK] Importing habits data...');
        
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.habits && Array.isArray(data.habits)) {
                    if (confirm(`Import ${data.habits.length} habits? This will replace your current habits.`)) {
                        this.habits = data.habits;
                        this.saveHabits();
                        this.renderHabits();
                        this.updateStats();
                        console.log(`✅ [STREAK] Imported ${data.habits.length} habits`);
                        this.showNotification(`Imported ${data.habits.length} habits!`, 'success');
                    }
                } else {
                    throw new Error('Invalid backup file');
                }
            } catch (error) {
                console.error('❌ [STREAK] Import error:', error);
                this.showNotification('Error importing file', 'error');
            }
        };
        reader.readAsText(file);
    }

    static resetSettings() {
        console.log('🔄 [STREAK] Resetting settings...');
        
        localStorage.setItem('anime_tracker_settings', JSON.stringify({ theme: 'system', notifications: true }));
        this.loadUserSettings();
        this.showNotification('Settings reset!', 'success');
    }

    // ============================================
    // UTILITY METHODS
    // ============================================
    
    static escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    static showNotification(message, type = 'info', duration = 3000) {
        console.log(`📢 [STREAK] Notification: [${type}] ${message}`);
        
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `<span>${message}</span><button class="notification-close">&times;</button>`;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
        setTimeout(() => notification.remove(), duration);
    }
    // ============================================
// ICON PICKER METHODS
// ============================================

static availableIcons = [
    // Activities
    'fa-book', 'fa-book-open', 'fa-graduation-cap', 'fa-pen-fancy', 'fa-pencil-alt', 'fa-feather-alt',
    // Sports & Exercise
    'fa-dumbbell', 'fa-running', 'fa-walking', 'fa-bicycle', 'fa-swimmer', 'fa-futbol', 'fa-basketball-ball',
    'fa-volleyball-ball', 'fa-table-tennis', 'fa-person-walking', 'fa-person-running', 'fa-person-biking',
    // Health & Wellness
    'fa-heart', 'fa-heartbeat', 'fa-apple-alt', 'fa-carrot', 'fa-leaf', 'fa-spa', 'fa-meditate', 'fa-brain',
    'fa-lungs', 'fa-tooth', 'fa-eye', 'fa-hand-holding-heart', 'fa-hand-peace',
    // Food & Drink
    'fa-mug-hot', 'fa-coffee', 'fa-utensils', 'fa-hamburger', 'fa-pizza-slice', 'fa-ice-cream', 'fa-cocktail',
    'fa-wine-glass', 'fa-mug-saucer', 'fa-bottle-water',
    // Work & Productivity
    'fa-briefcase', 'fa-laptop-code', 'fa-code', 'fa-terminal', 'fa-database', 'fa-cloud', 'fa-server',
    'fa-tasks', 'fa-check-double', 'fa-clipboard-list', 'fa-calendar-check', 'fa-clock',
    // Music & Arts
    'fa-music', 'fa-guitar', 'fa-microphone', 'fa-headphones', 'fa-palette', 'fa-paintbrush', 'fa-camera',
    'fa-video', 'fa-film',
    // Home & Family
    'fa-home', 'fa-broom', 'fa-soap', 'fa-hand-sparkles', 'fa-pump-soap', 'fa-house-chimney', 'fa-kitchen-set',
    'fa-bed', 'fa-shower', 'fa-toilet',
    // Nature & Outdoors
    'fa-tree', 'fa-seedling', 'fa-water', 'fa-sun', 'fa-moon', 'fa-cloud-sun', 'fa-cloud-moon', 'fa-snowflake',
    'fa-campground', 'fa-hiking', 'fa-mountain', 'fa-fish',
    // Technology
    'fa-mobile-alt', 'fa-tablet-alt', 'fa-laptop', 'fa-tv', 'fa-gamepad', 'fa-robot', 'fa-microchip',
    // Transportation
    'fa-car', 'fa-bus', 'fa-train', 'fa-plane', 'fa-ship', 'fa-rocket', 'fa-motorcycle',
    // Communication
    'fa-phone', 'fa-envelope', 'fa-comment', 'fa-comments', 'fa-message', 'fa-mail-bulk',
    // Shopping
    'fa-shopping-cart', 'fa-tag', 'fa-wallet', 'fa-credit-card', 'fa-money-bill',
    // Miscellaneous
    'fa-star', 'fa-heart', 'fa-fire', 'fa-thumbs-up', 'fa-smile', 'fa-frown', 'fa-meh', 'fa-angry',
    'fa-grin', 'fa-grin-tongue', 'fa-grin-squint', 'fa-grin-wink', 'fa-kiss', 'fa-kiss-wink-heart',
    'fa-smile-wink', 'fa-flushed', 'fa-dizzy', 'fa-grin-beam', 'fa-grin-beam-sweat', 'fa-grin-hearts',
    'fa-grin-stars', 'fa-grin-alt', 'fa-grin-tongue-squint', 'fa-grin-tongue-wink', 'fa-grin-wink',
    // Animals
    'fa-dog', 'fa-cat', 'fa-hippo', 'fa-kiwi-bird', 'fa-dove', 'fa-frog', 'fa-horse', 'fa-otter',
    'fa-paw', 'fa-spider', 'fa-fish', 'fa-dragon', 'fa-unicorn', 'fa-bug',
    // Flags
    'fa-flag-checkered', 'fa-flag', 'fa-flag-usa'
];

static initIconPicker() {
    console.log('🎨 [STREAK] Initializing icon picker...');
    
    const iconGrid = document.getElementById('iconGrid');
    if (!iconGrid) return;
    
    // Store all icons for filtering
    this.allIcons = [...this.availableIcons];
    
    // Render all icons initially
    this.renderIconGrid(this.allIcons);
    
    // Setup search functionality
    const searchInput = document.getElementById('iconSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredIcons = this.allIcons.filter(icon => 
                icon.toLowerCase().includes(searchTerm)
            );
            this.renderIconGrid(filteredIcons);
        });
    }
}

static renderIconGrid(icons) {
    const iconGrid = document.getElementById('iconGrid');
    if (!iconGrid) return;
    
    iconGrid.innerHTML = icons.map(icon => `
        <div class="icon-item" data-icon="${icon}">
            <i class="fas ${icon}"></i>
            <span>${icon.replace('fa-', '')}</span>
        </div>
    `).join('');
    
    // Add click handlers to icon items
    document.querySelectorAll('.icon-item').forEach(item => {
        item.addEventListener('click', () => {
            const iconName = item.dataset.icon;
            this.selectIcon(iconName);
        });
    });
}

static selectIcon(iconName) {
    console.log(`🎨 [STREAK] Icon selected: ${iconName}`);
    
    // Update the input field
    const iconInput = document.getElementById('habitIcon');
    if (iconInput) {
        iconInput.value = iconName;
        // Trigger input event to update preview
        const event = new Event('input', { bubbles: true });
        iconInput.dispatchEvent(event);
    }
    
    // Close the icon picker modal
    this.closeIconPicker();
}

static openIconPicker() {
    console.log('🎨 [STREAK] Opening icon picker...');
    
    const modal = document.getElementById('iconPickerModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) {
        // Reset search input
        const searchInput = document.getElementById('iconSearch');
        if (searchInput) searchInput.value = '';
        
        // Reset icon grid to all icons
        this.renderIconGrid(this.allIcons);
        
        modal.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

static closeIconPicker() {
    const modal = document.getElementById('iconPickerModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

static updateIconPreview() {
    const iconInput = document.getElementById('habitIcon');
    const iconPreview = document.getElementById('iconPreview');
    const iconPreviewBox = document.getElementById('iconPreviewBox');
    
    if (iconInput && iconPreview) {
        let iconValue = iconInput.value.trim();
        if (!iconValue) {
            iconValue = 'fa-smile';
        }
        // Ensure it starts with 'fa-'
        if (!iconValue.startsWith('fa-')) {
            iconValue = 'fa-' + iconValue;
        }
        iconPreview.className = `fas ${iconValue}`;
        
        // Also update the preview box styling
        if (iconPreviewBox) {
            // Preview box styling is handled by CSS
        }
    }
}
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 [STREAK] DOM fully loaded, initializing...');
    StreakManager.init();
});