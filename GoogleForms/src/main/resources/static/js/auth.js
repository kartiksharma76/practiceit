document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect') || '/';

    // Tabs
    const tabSignIn = document.getElementById('tabSignIn');
    const tabSignUp = document.getElementById('tabSignUp');
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const authSubtitle = document.getElementById('authSubtitle');
    const authStatus = document.getElementById('authStatus');

    // Inputs
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const regName = document.getElementById('regName');
    const regEmail = document.getElementById('regEmail');
    const regPassword = document.getElementById('regPassword');
    const regRole = document.getElementById('regRole');

    // Buttons
    const btnSubmitLogin = document.getElementById('btnSubmitLogin');
    const btnSubmitRegister = document.getElementById('btnSubmitRegister');
    const toggleLoginPwd = document.getElementById('toggleLoginPwd');
    const toggleRegPwd = document.getElementById('toggleRegPwd');
    const btnDemoAdmin = document.getElementById('btnDemoAdmin');
    const btnDemoCandidate = document.getElementById('btnDemoCandidate');

    function showStatus(msg, type = 'error') {
        if (!authStatus) return;
        authStatus.className = `auth-status show ${type}`;
        authStatus.innerHTML = msg;
    }

    function hideStatus() {
        if (!authStatus) return;
        authStatus.className = 'auth-status';
        authStatus.innerHTML = '';
    }

    // Tab switcher
    if (tabSignIn && tabSignUp) {
        tabSignIn.addEventListener('click', () => {
            tabSignIn.classList.add('active');
            tabSignUp.classList.remove('active');
            signInForm.style.display = 'flex';
            signUpForm.style.display = 'none';
            authSubtitle.textContent = 'Sign in to access 500+ Technical Modules, Live Exams & MySQL Diagnostics';
            hideStatus();
        });

        tabSignUp.addEventListener('click', () => {
            tabSignUp.classList.add('active');
            tabSignIn.classList.remove('active');
            signUpForm.style.display = 'flex';
            signInForm.style.display = 'none';
            authSubtitle.textContent = 'Create your account to start technical evaluations and track interview performance';
            hideStatus();
        });
    }

    // Toggle password visibility
    if (toggleLoginPwd && loginPassword) {
        toggleLoginPwd.addEventListener('click', () => {
            const isPwd = loginPassword.type === 'password';
            loginPassword.type = isPwd ? 'text' : 'password';
            toggleLoginPwd.textContent = isPwd ? '🙈' : '👁️';
        });
    }

    if (toggleRegPwd && regPassword) {
        toggleRegPwd.addEventListener('click', () => {
            const isPwd = regPassword.type === 'password';
            regPassword.type = isPwd ? 'text' : 'password';
            toggleRegPwd.textContent = isPwd ? '🙈' : '👁️';
        });
    }

    // Demo Auto-fill & Submit
    if (btnDemoAdmin) {
        btnDemoAdmin.addEventListener('click', () => {
            tabSignIn.click();
            loginEmail.value = 'kartik@example.com';
            loginPassword.value = 'Kartik@2026';
            doLogin('kartik@example.com', 'Kartik@2026');
        });
    }

    if (btnDemoCandidate) {
        btnDemoCandidate.addEventListener('click', () => {
            tabSignIn.click();
            loginEmail.value = 'candidate@example.com';
            loginPassword.value = 'Candidate@123';
            doLogin('candidate@example.com', 'Candidate@123');
        });
    }

    // Handle Login
    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            doLogin(loginEmail.value.trim(), loginPassword.value);
        });
    }

    async function doLogin(email, password) {
        hideStatus();
        btnSubmitLogin.disabled = true;
        btnSubmitLogin.textContent = 'Signing in...';

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Invalid email or password');
            }

            const data = await res.json();
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify({
                userId: data.userId,
                name: data.name,
                email: data.email,
                role: data.role
            }));

            showStatus('✓ Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 700);

        } catch (err) {
            console.error(err);
            showStatus(err.message, 'error');
            btnSubmitLogin.disabled = false;
            btnSubmitLogin.textContent = 'Sign In to Platform';
        }
    }

    // Handle Register
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideStatus();

            const name = regName.value.trim();
            const email = regEmail.value.trim();
            const password = regPassword.value;
            const role = regRole.value;

            if (password.length < 6) {
                showStatus('Password must be at least 6 characters long.', 'error');
                return;
            }

            btnSubmitRegister.disabled = true;
            btnSubmitRegister.textContent = 'Creating account...';

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Registration failed');
                }

                const data = await res.json();
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify({
                    userId: data.userId,
                    name: data.name,
                    email: data.email,
                    role: data.role
                }));

                showStatus('✓ Account created successfully! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 700);

            } catch (err) {
                console.error(err);
                showStatus(err.message, 'error');
                btnSubmitRegister.disabled = false;
                btnSubmitRegister.textContent = 'Create Account & Sign In';
            }
        });
    }
});
