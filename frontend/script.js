const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const signupModal = document.getElementById('signupModal');
const errorMessage = document.getElementById('errorMessage');
const signupErrorMessage = document.getElementById('signupErrorMessage');
const successMessage = document.getElementById('successMessage');

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    populateYearDropdown();
    populateDayDropdown();
    setupEventListeners();
});

function initializePage() {
    if (isAuthenticated()) {
        redirectToDashboard();
    }
}

function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    
    // Add event listeners for modal buttons
    const createAccountBtn = document.getElementById('createAccountBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    createAccountBtn.addEventListener('click', showSignupModal);
    closeModalBtn.addEventListener('click', closeSignupModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === signupModal) {
            closeSignupModal();
        }
    });
    
    document.getElementById('month').addEventListener('change', populateDayDropdown);
    document.getElementById('year').addEventListener('change', populateDayDropdown);
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        credentials: 'include',
        ...options
    };

    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Please fill in all fields', errorMessage);
        return;
    }
    
    setLoading(true, 'login');
    hideError(errorMessage);
    
    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        showSuccess('Login successful! Redirecting...');
        setTimeout(redirectToDashboard, 1000);
    } catch (error) {
        showError(error.message || 'Login failed', errorMessage);
    } finally {
        setLoading(false, 'login');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const formData = getSignupFormData();
    
    if (!validateSignupForm(formData)) {
        return;
    }
    
    setLoading(true, 'signup');
    hideError(signupErrorMessage);
    
    try {
        const response = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        showSuccess('Account created successfully! Redirecting...');
        setTimeout(() => {
            closeSignupModal();
            redirectToDashboard();
        }, 1000);
    } catch (error) {
        showError(error.message || 'Registration failed', signupErrorMessage);
    } finally {
        setLoading(false, 'signup');
    }
}

function getSignupFormData() {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('signupEmail').value.trim(),
        password: document.getElementById('signupPassword').value,
        dateOfBirth: getSelectedDate(),
        gender: document.querySelector('input[name="gender"]:checked')?.value
    };
}

function validateSignupForm(data) {
    if (!data.firstName || !data.lastName) {
        showError('Please enter your full name', signupErrorMessage);
        return false;
    }
    
    if (!data.email) {
        showError('Please enter your email', signupErrorMessage);
        return false;
    }
    
    if (!isValidEmail(data.email)) {
        showError('Please enter a valid email address', signupErrorMessage);
        return false;
    }
    
    if (!data.password || data.password.length < 6) {
        showError('Password must be at least 6 characters', signupErrorMessage);
        return false;
    }
    
    if (!data.dateOfBirth) {
        showError('Please select your birthday', signupErrorMessage);
        return false;
    }
    
    if (!data.gender) {
        showError('Please select your gender', signupErrorMessage);
        return false;
    }
    
    return true;
}

function getSelectedDate() {
    const month = document.getElementById('month').value;
    const day = document.getElementById('day').value;
    const year = document.getElementById('year').value;
    
    if (month && day && year) {
        return new Date(year, month - 1, day).toISOString();
    }
    return null;
}

function populateYearDropdown() {
    const yearSelect = document.getElementById('year');
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 100;
    
    for (let year = currentYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

function populateDayDropdown() {
    const monthSelect = document.getElementById('month');
    const yearSelect = document.getElementById('year');
    const daySelect = document.getElementById('day');
    
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    
    daySelect.innerHTML = '<option value="">Day</option>';
    
    if (month && year) {
        const daysInMonth = new Date(year, month, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            daySelect.appendChild(option);
        }
    }
}

function showSignupModal() {
    signupModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSignupModal() {
    signupModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    signupForm.reset();
    hideError(signupErrorMessage);
}

function showError(message, element) {
    element.textContent = message;
    element.classList.add('show');
}

function hideError(element) {
    element.classList.remove('show');
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

function setLoading(isLoading, formType) {
    if (formType === 'login') {
        const button = document.querySelector('.login-btn');
        button.disabled = isLoading;
        button.textContent = isLoading ? 'Logging in...' : 'Log In';
    } else if (formType === 'signup') {
        const button = document.querySelector('.signup-btn');
        button.disabled = isLoading;
        button.textContent = isLoading ? 'Creating Account...' : 'Sign Up';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isAuthenticated() {
    return !!localStorage.getItem('token');
}

function redirectToDashboard() {
    window.location.href = '/dashboard.html';
}
