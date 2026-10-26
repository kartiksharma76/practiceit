/**
 * Session & Global Auth State Manager
 * Mounts authenticated user profile, login/logout buttons, and role badges on all pages.
 */
window.Auth = {
    getToken() {
        return localStorage.getItem('authToken');
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (e) {
            return null;
        }
    },

    isAuthenticated() {
        return !!this.getToken() && !!this.getUser();
    },

    async verify() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                this.logoutSilently();
                return null;
            }
            const user = await res.json();
            localStorage.setItem('currentUser', JSON.stringify({
                userId: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }));
            return user;
        } catch (e) {
            return this.getUser();
        }
    },

    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) {
                // Ignore network error on logout
            }
        }
        this.logoutSilently();
        window.location.reload();
    },

    getCurrentUser() {
        const user = this.getUser();
        if (!user) return null;
        return {
            ...user,
            token: this.getToken()
        };
    },

    logoutSilently() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    },

    renderNavbarUser() {
        const user = this.getUser();
        const targets = document.querySelectorAll('.auth-user-container-target, .banner-nav-links, .topbar');

        targets.forEach(bar => {
            let container = bar.querySelector('.auth-user-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'auth-user-container';
                container.style.display = 'inline-flex';
                container.style.alignItems = 'center';
                container.style.gap = '0.6rem';
                bar.appendChild(container);
            }

            const isLightBg = bar.classList.contains('topbar');

            if (user) {
                const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
                const roleBadge = user.role === 'ROLE_ADMIN' ? '👑 Admin' : (user.role === 'ROLE_EVALUATOR' ? '🛡️ Evaluator' : '🎓 Candidate');

                const nameColor = isLightBg ? '#0f172a' : '#ffffff';
                const pillBg = isLightBg ? '#f1f5f9' : 'rgba(99, 102, 241, 0.15)';
                const pillBorder = isLightBg ? '#cbd5e1' : 'rgba(99, 102, 241, 0.35)';
                const badgeBg = isLightBg ? '#e0e7ff' : 'rgba(0, 0, 0, 0.3)';
                const badgeColor = isLightBg ? '#4338ca' : '#a5b4fc';

                container.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem; background: ${pillBg}; border: 1.5px solid ${pillBorder}; padding: 0.35rem 0.85rem; border-radius: 9999px; backdrop-filter: blur(8px);">
                        <span style="width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #d946ef); color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);">
                            ${initials}
                        </span>
                        <span style="font-size: 0.85rem; font-weight: 700; color: ${nameColor};">${user.name}</span>
                        <span style="font-size: 0.7rem; font-weight: 800; background: ${badgeBg}; color: ${badgeColor}; padding: 0.15rem 0.5rem; border-radius: 6px;">
                            ${roleBadge}
                        </span>
                    </div>
                    <button type="button" onclick="Auth.logout()" style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.35); color: #fb7185; font-size: 0.8rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 9999px; cursor: pointer; transition: all 0.2s;">
                        Sign Out
                    </button>
                `;
            } else {
                const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
                const btnStyle = isLightBg
                    ? 'background: #6366f1; color: #ffffff; border: none; font-weight: 700; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);'
                    : 'background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25)); border: 1px solid rgba(139, 92, 246, 0.5); color: #ffffff; font-weight: 700; box-shadow: 0 2px 10px rgba(99, 102, 241, 0.25);';

                container.innerHTML = `
                    <a href="login.html?redirect=${currentUrl}" style="${btnStyle} text-decoration: none; font-size: 0.85rem; padding: 0.45rem 1.1rem; border-radius: 9999px; display: inline-flex; align-items: center; gap: 0.4rem; transition: transform 0.2s ease;">
                        <span>👤 Candidate / Admin Sign In</span>
                    </a>
                `;
            }
        });
    }
};

window.AuthSession = window.Auth;

/**
 * Universal Theme Manager (Black Obsidian & Pearl Light Modes)
 */
window.ThemeManager = {
    STORAGE_KEY: 'kte-theme',

    getTheme() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'dark';
        } catch (e) {
            return 'dark';
        }
    },

    setTheme(theme, notify = true) {
        const root = document.documentElement;
        const body = document.body;
        const normalized = theme === 'light' ? 'light' : 'dark';

        root.setAttribute('data-theme', normalized);
        if (body) {
            if (normalized === 'light') {
                body.classList.remove('theme-dark');
                body.classList.add('theme-light');
            } else {
                body.classList.remove('theme-light');
                body.classList.add('theme-dark');
            }
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, normalized);
        } catch (e) {}

        this.updateButtons(normalized);

        if (notify) {
            // Audio feedback
            if (typeof window.playTone === 'function') {
                if (normalized === 'light') {
                    window.playTone(700, 0.05, 'triangle', 0.06);
                } else {
                    window.playTone(460, 0.06, 'sine', 0.06);
                }
            }

            // Toast notification
            if (typeof window.showToast === 'function') {
                window.showToast(
                    normalized === 'light' ? 'Switched to Stylish Light Mode ☀️' : 'Switched to Obsidian Dark Mode 🌙',
                    'info',
                    normalized === 'light' ? '☀️' : '🌙'
                );
            }
        }
    },

    toggle() {
        const next = this.getTheme() === 'light' ? 'dark' : 'light';
        this.setTheme(next, true);
    },

    updateButtons(theme) {
        const buttons = document.querySelectorAll('.btn-theme-toggle');
        buttons.forEach(btn => {
            const icon = btn.querySelector('.theme-icon-indicator') || btn.querySelector('#themeIcon');
            const label = btn.querySelector('.theme-label') || btn.querySelector('#themeLabel');
            if (theme === 'light') {
                if (icon) icon.textContent = '☀️';
                if (label) label.textContent = 'Light';
                btn.title = 'Switch to Obsidian Dark Mode (Alt+T)';
                btn.setAttribute('aria-label', 'Switch to Obsidian Dark Mode');
            } else {
                if (icon) icon.textContent = '🌙';
                if (label) label.textContent = 'Dark';
                btn.title = 'Switch to Stylish Light Mode (Alt+T)';
                btn.setAttribute('aria-label', 'Switch to Stylish Light Mode');
            }
        });
    },

    init() {
        const current = this.getTheme();
        this.setTheme(current, false);

        document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
            if (!btn.dataset.themeBound) {
                btn.dataset.themeBound = 'true';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggle();
                });
            }
        });

        // Keyboard Shortcut: Alt + T
        window.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 't' || e.key === 'T')) {
                e.preventDefault();
                this.toggle();
            }
        });

        // Cross-tab synchronization
        window.addEventListener('storage', (e) => {
            if (e.key === this.STORAGE_KEY && e.newValue) {
                this.setTheme(e.newValue, false);
            }
        });
    }
};

// Immediate pre-render application to eliminate theme flicker
(function() {
    try {
        const saved = localStorage.getItem('kte-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        if (saved === 'light') {
            document.documentElement.classList.add('theme-light');
        }
    } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    Auth.verify().then(() => {
        Auth.renderNavbarUser();
    });
});

