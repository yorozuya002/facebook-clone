console.log('Dashboard script loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard DOM loaded');
    setupDashboard();
});

function setupDashboard() {
    loadUserInfo();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button event listener added');
    } else {
        console.error('Logout button not found');
    }
}

function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userInfo = document.getElementById('userInfo');
        
        if (user.email) {
            userInfo.innerHTML = `
                <h3>Your Profile</h3>
                <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Gender:</strong> ${user.gender}</p>
            `;
        } else {
            userInfo.innerHTML = `
                <h3>Your Profile</h3>
                <p>User information not available</p>
            `;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

function handleLogout() {
    console.log('Logout button clicked');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    alert('Logged out successfully!');
    window.location.href = '/';
}
