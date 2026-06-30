const adminUsername = document.getElementById('adminUsername');
const logoutBtn = document.getElementById('logoutBtn');
const navLinks = document.querySelectorAll('.admin-sidebar a');
const adminSections = document.querySelectorAll('.admin-section');

const resourceSearchInput = document.getElementById('resourceSearchInput');
const counselorSearchInput = document.getElementById('counselorSearchInput');
const appointmentSearchInput = document.getElementById('appointmentSearchInput');
const forumSearchInput = document.getElementById('forumSearchInput');

const refreshResourcesBtn = document.getElementById('refreshResourcesBtn');
const refreshCounselorsBtn = document.getElementById('refreshCounselorsBtn');
const refreshAppointmentsBtn = document.getElementById('refreshAppointmentsBtn');
const refreshForumBtn = document.getElementById('refreshForumBtn');

const usersTableBody = document.getElementById('usersTableBody');
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
const userSearchInput = document.getElementById('userSearchInput');
const userEditModal = document.getElementById('userEditModal');
const closeUserModalBtn = document.getElementById('closeUserModalBtn');
const userEditForm = document.getElementById('userEditForm');
const editUserId = document.getElementById('editUserId');
const editUsername = document.getElementById('editUsername');
const editEmail = document.getElementById('editEmail');
const editIsAdmin = document.getElementById('editIsAdmin');

const chatsTableBody = document.getElementById('chatsTableBody');
const refreshChatsBtn = document.getElementById('refreshChatsBtn');
const chatSearchInput = document.getElementById('chatSearchInput');
const chatDetailModal = document.getElementById('chatDetailModal');
const closeChatModalBtn = document.getElementById('closeChatModalBtn');
const saveChatDetailsBtn = document.getElementById('saveChatDetailsBtn');

const resourcesTableBody = document.getElementById('resourcesTableBody');
const createNewResourceBtn = document.getElementById('createNewResourceBtn');
const resourceEditModal = document.getElementById('resourceEditModal');
const closeResourceModalBtn = document.getElementById('closeResourceModalBtn');
const resourceEditForm = document.getElementById('resourceEditForm');
const resourceModalTitle = document.getElementById('resourceModalTitle');

const counselorsTableBody = document.getElementById('counselorsTableBody');
const createNewCounselorBtn = document.getElementById('createNewCounselorBtn');
const counselorEditModal = document.getElementById('counselorEditModal');
const closeCounselorModalBtn = document.getElementById('closeCounselorModalBtn');
const counselorEditForm = document.getElementById('counselorEditForm');

const appointmentsTableBody = document.getElementById('appointmentsTableBody');
const forumPostsTableBody = document.getElementById('forumPostsTableBody');

let currentSection = 'dashboard';
let currentChatId = null;
let currentAdminUser = null;
let globalMoodChart = null;
let globalSentimentChart = null;

let state = {
    users: { currentPage: 1, totalPages: 1, search: '' },
    chats: { currentPage: 1, totalPages: 1, search: '' },
    resources: { currentPage: 1, totalPages: 1, search: '' },
    counselors: { currentPage: 1, totalPages: 1, search: '' },
    appointments: { currentPage: 1, totalPages: 1, search: '' },
    forum: { currentPage: 1, totalPages: 1, search: '' }
};

function updateURLFromState() {
    const sectionState = state[currentSection];
    const params = new URLSearchParams();
    
    params.set('section', currentSection);
    
    if (sectionState && sectionState.currentPage > 1) {
        params.set('page', sectionState.currentPage);
    }
    if (sectionState && sectionState.search) {
        params.set('search', sectionState.search);
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
}

function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section') || 'dashboard';
    const page = parseInt(params.get('page'), 10) || 1;
    const search = params.get('search') || '';
    
    currentSection = section;
    
    if (state[section]) {
        state[section].currentPage = page;
        state[section].search = search;
    }
    
    try {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
    } catch (e) {
        document.getElementById('dashboard').classList.add('active');
        document.querySelector('.admin-sidebar a[data-section="dashboard"]').classList.add('active');
        return 'dashboard';
    }
    
    return section;
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

async function checkAuthStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }
        
        const response = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Authentication failed');
        
        const data = await response.json();
        
        if (!data.success || !data.data.isAdmin) throw new Error('Admin access required');
        
        currentAdminUser = data.data;
        adminUsername.textContent = data.data.username;
        
        const initialSection = loadStateFromURL();
        
        switch (initialSection) {
            case 'dashboard': loadDashboardStats(); break;
            case 'users': loadUsers(state.users.currentPage); break;
            case 'chats': loadChats(state.chats.currentPage); break;
            case 'resources': loadResources(state.resources.currentPage); break;
            case 'counselors': loadCounselors(state.counselors.currentPage); break;
            case 'appointments': loadAppointments(state.appointments.currentPage); break;
            case 'forum': loadForumPostsAdmin(state.forum.currentPage); break;
            default:
                document.getElementById('dashboard').classList.add('active');
                document.querySelector('.admin-sidebar a[data-section="dashboard"]').classList.add('active');
                loadDashboardStats();
        }
    } catch (error) {
        showNotification(error.message, 'error');
        localStorage.removeItem('token');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
}

async function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

function switchSection(e) {
    e.preventDefault();
    const targetSection = e.target.getAttribute('data-section');
    if (targetSection === currentSection) return;
    
    navLinks.forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');
    
    adminSections.forEach(section => section.classList.remove('active'));
    document.getElementById(targetSection).classList.add('active');
    
    currentSection = targetSection;
    updateURLFromState();
    
    switch (targetSection) {
        case 'dashboard': loadDashboardStats(); break;
        case 'users': loadUsers(state.users.currentPage); break;
        case 'chats': loadChats(state.chats.currentPage); break;
        case 'resources': loadResources(state.resources.currentPage); break;
        case 'counselors': loadCounselors(state.counselors.currentPage); break;
        case 'appointments': loadAppointments(state.appointments.currentPage); break;
        case 'forum': loadForumPostsAdmin(state.forum.currentPage); break;
    }
}

async function loadDashboardStats() {
    const token = localStorage.getItem('token');
    try {
        const statsResponse = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!statsResponse.ok) throw new Error('Failed to load dashboard stats');
        const statsData = await statsResponse.json();
        if (!statsData.success) throw new Error(statsData.error);
        
        document.getElementById('totalUsers').textContent = statsData.data.totalUsers;
        document.getElementById('totalChats').textContent = statsData.data.totalChats;
        document.getElementById('newUsers').textContent = statsData.data.newUsers;
        document.getElementById('newChats').textContent = statsData.data.newChats;

        const analyticsResponse = await fetch('/api/admin/analytics', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            if (analyticsData.success) renderGlobalAnalytics(analyticsData.data);
        }
    } catch (error) {
        showNotification(error.message, 'error');
        document.getElementById('dashboard').innerHTML = '<p class="error-text">Failed to load dashboard data.</p>';
    }
}

function renderGlobalAnalytics(stats) {
    if (globalMoodChart) globalMoodChart.destroy();
    if (globalSentimentChart) globalSentimentChart.destroy();
    
    const moodCtx = document.getElementById('adminMoodChart').getContext('2d');
    globalMoodChart = new Chart(moodCtx, {
        type: 'doughnut',
        data: {
            labels: stats.moodDistribution.map(d => d.mood),
            datasets: [{
                label: 'Moods',
                data: stats.moodDistribution.map(d => d.count),
                backgroundColor: ['#EF4444', '#F59E0B', '#6B7280', '#10B981', '#6366F1'],
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
    
    const sentimentCtx = document.getElementById('adminSentimentChart').getContext('2d');
    globalSentimentChart = new Chart(sentimentCtx, {
        type: 'pie',
        data: {
            labels: stats.sentimentDistribution.map(d => d.sentiment),
            datasets: [{
                label: 'Sentiments',
                data: stats.sentimentDistribution.map(d => d.count),
                backgroundColor: ['#FBBF24', '#F87171', '#9CA3AF', '#F97316', '#DC2626'],
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function loadUsers(page = 1) {
    try {
        showLoading('Loading users...');
        const token = localStorage.getItem('token');
        const searchTerm = state.users.search;
        const url = `/api/admin/users?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load users');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const resultData = data.data;
        renderUsersTable(Array.isArray(resultData.items) ? resultData.items : []);
        
        state.users = { ...state.users, totalPages: resultData.pages || 1, currentPage: resultData.currentPage || 1 };
        renderPagination('users', state.users);
        updateURLFromState();
    } catch (error) {
        showNotification(error.message, 'error');
        usersTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading users.</td></tr>';
    } finally {
        hideLoading();
    }
}

function renderUsersTable(users) {
    usersTableBody.innerHTML = '';
    if (!users || users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No users found</td></tr>';
        return;
    }
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>${user.isAdmin ? '<i class="fa-solid fa-check admin-tick"></i>' : ''}</td>
            <td class="cell-actions">
                <button class="btn-icon edit" onclick="editUser('${user._id}', '${user.username}', '${user.email || ''}', ${user.isAdmin})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" onclick="deleteUser('${user._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        usersTableBody.appendChild(tr);
    });
}

window.editUser = function(userId, username, email, isAdmin) {
    editUserId.value = userId;
    editUsername.value = username;
    editEmail.value = email;
    editIsAdmin.checked = isAdmin;
    
    if (currentAdminUser && currentAdminUser._id === userId) {
        editIsAdmin.disabled = true;
        editIsAdmin.parentElement.title = "You cannot remove your own admin privileges.";
    } else {
        editIsAdmin.disabled = false;
        editIsAdmin.parentElement.title = "";
    }
    
    userEditModal.classList.remove('hidden');
}

userEditForm.onsubmit = async function(e) {
    e.preventDefault();
    const userId = editUserId.value;
    const username = editUsername.value.trim();
    const email = editEmail.value.trim();
    const isAdmin = editIsAdmin.checked;
    
    if (!userId || !username || !email) return showNotification('All fields are required.', 'error');
    
    try {
        showLoading('Updating user...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, isAdmin })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showNotification('User updated successfully', 'success');
        userEditModal.classList.add('hidden');
        loadUsers(state.users.currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteUser = async function(userId) {
    if (!confirm('Are you sure? This will also delete all their chats.')) return;
    try {
        showLoading('Deleting user...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        
        if (!response.ok) throw new Error('Failed to delete user');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showNotification('User deleted successfully', 'success');
        loadUsers(state.users.currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function loadChats(page = 1) {
    try {
        showLoading('Loading chats...');
        const token = localStorage.getItem('token');
        const searchTerm = state.chats.search;
        const url = `/api/admin/chats?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if(!data.success) throw new Error(data.error);
        
        renderChatsTable(data.data.items);
        state.chats = { ...state.chats, totalPages: data.data.pages || 1, currentPage: data.data.currentPage || 1 };
        renderPagination('chats', state.chats);
        updateURLFromState();
    } catch(e) {
        showNotification(e.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderChatsTable(chats) {
    chatsTableBody.innerHTML = '';
    if (!chats || chats.length === 0) {
        chatsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No chats found</td></tr>';
        return;
    }
    
    chats.forEach(chat => {
        const tr = document.createElement('tr');
        if (chat.flag) tr.classList.add('flagged-row');
        tr.innerHTML = `
            <td>${chat.user ? chat.user.username : 'Guest'}</td>
            <td>${new Date(chat.createdAt).toLocaleDateString()}</td>
            <td class="cell-truncate">${chat.message || '[Encrypted]'}</td>
            <td class="${chat.flag ? 'cell-flagged' : ''}">${chat.flag || 'None'}</td>
            <td class="cell-actions">
                <button class="btn-icon view" onclick="viewChatDetails('${chat._id}')"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-icon delete" onclick="deleteChat('${chat._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        chatsTableBody.appendChild(tr);
    });
}

window.viewChatDetails = async function(chatId) {
    try {
        showLoading('Loading chat details...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/chats/${chatId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load chat details');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const chat = data.data;
        document.getElementById('chatDetailUsername').textContent = chat.user ? chat.user.username : 'Guest';
        document.getElementById('chatDetailDate').textContent = new Date(chat.createdAt).toLocaleString();
        document.getElementById('chatDetailUserMessage').textContent = chat.originalMessage || chat.message || '[Encrypted]';
        document.getElementById('chatDetailBotResponse').textContent = chat.response || '[Encrypted]';
        document.getElementById('chatDetailSentiment').textContent = chat.sentiment;
        document.getElementById('chatDetailConfidence').textContent = Math.round(chat.confidence * 100);
        document.getElementById('chatDetailFlag').value = chat.flag || '';
        
        saveChatDetailsBtn.onclick = () => saveChatChanges(chat._id, document.getElementById('chatDetailFlag').value);
        chatDetailModal.classList.remove('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
};

async function saveChatChanges(chatId, flag) {
    try {
        showLoading('Updating chat...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/chats/${chatId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ flag: flag === '' ? null : flag })
        });
        
        if (!response.ok) throw new Error('Failed to update chat');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showNotification('Chat updated', 'success');
        chatDetailModal.classList.add('hidden');
        loadChats(state.chats.currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteChat = async function(chatId) {
    if (!confirm('Are you sure you want to delete this chat?')) return;
    try {
        showLoading('Deleting chat...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/chats/${chatId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to delete chat');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showNotification('Chat deleted', 'success');
        loadChats(state.chats.currentPage);
    } catch (e) {
        showNotification(e.message, 'error');
    } finally {
        hideLoading();
    }
};

async function loadResources(page = 1) {
    try {
        showLoading('Loading resources...');
        const token = localStorage.getItem('token');
        const searchTerm = state.resources.search;
        const url = `/api/admin/resources?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if(!data.success) throw new Error(data.error);
        
        renderResourcesTable(data.data.items);
        state.resources = { ...state.resources, totalPages: data.data.pages || 1, currentPage: data.data.currentPage || 1 };
        renderPagination('resources', state.resources);
        updateURLFromState();
    } catch(e) {
        showNotification(e.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderResourcesTable(resources) {
    resourcesTableBody.innerHTML = '';
    if (!resources || resources.length === 0) {
        resourcesTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No resources found. Create one!</td></tr>';
        return;
    }
    
    resources.forEach(res => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${res.title}</td>
            <td><span class="type-badge type-${res.type}">${res.type}</span></td>
            <td>${res.language.toUpperCase()}</td>
            <td class="cell-truncate">${res.tags.join(', ')}</td>
            <td class="cell-actions">
                <button class="btn-icon edit" onclick="openResourceModal('${res._id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" onclick="deleteResource('${res._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        resourcesTableBody.appendChild(tr);
    });
}

window.openResourceModal = async function(resourceId = null) {
    resourceEditForm.reset();
    document.getElementById('editResourceId').value = '';
    
    if (resourceId) {
        resourceModalTitle.textContent = 'Edit Resource';
        try {
            showLoading('Loading resource data...');
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/resources/${resourceId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            const resData = result.data;
            document.getElementById('editResourceId').value = resData._id;
            document.getElementById('editResourceTitle').value = resData.title;
            document.getElementById('editResourceDescription').value = resData.description;
            document.getElementById('editResourceUrl').value = resData.url;
            document.getElementById('editResourceType').value = resData.type;
            document.getElementById('editResourceLanguage').value = resData.language;
            document.getElementById('editResourceTags').value = resData.tags.join(', ');
            
            resourceEditModal.classList.remove('hidden');
        } catch(e) {
            showNotification(e.message, 'error');
        } finally {
            hideLoading();
        }
    } else {
        resourceModalTitle.textContent = 'Create New Resource';
        resourceEditModal.classList.remove('hidden');
    }
}

async function handleResourceFormSubmit(e) {
    e.preventDefault();
    const resourceId = document.getElementById('editResourceId').value;
    const isEditing = !!resourceId;
    
    const resourceData = {
        title: document.getElementById('editResourceTitle').value,
        description: document.getElementById('editResourceDescription').value,
        url: document.getElementById('editResourceUrl').value,
        type: document.getElementById('editResourceType').value,
        language: document.getElementById('editResourceLanguage').value,
        tags: document.getElementById('editResourceTags').value,
    };
    
    const url = isEditing ? `/api/admin/resources/${resourceId}` : '/api/admin/resources';
    const method = isEditing ? 'PUT' : 'POST';
    
    try {
        showLoading(isEditing ? 'Updating resource...' : 'Creating resource...');
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(resourceData)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to save resource');
        }
        
        showNotification(`Resource ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        resourceEditModal.classList.add('hidden');
        loadResources(state.resources.currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

window.deleteResource = async function(resourceId) {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
        showLoading('Deleting resource...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/resources/${resourceId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to delete resource');
        
        showNotification('Resource deleted successfully', 'success');
        await loadResources(state.resources.currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function loadCounselors(page = 1) {
    try {
        showLoading('Loading counselors...');
        const token = localStorage.getItem('token');
        const searchTerm = state.counselors.search;
        const url = `/api/admin/counselors?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if(!data.success) throw new Error(data.error);
        
        renderCounselorsTable(data.data.items);
        state.counselors = { ...state.counselors, totalPages: data.data.pages || 1, currentPage: data.data.currentPage || 1 };
        renderPagination('counselors', state.counselors);
        updateURLFromState();
    } catch(e) {
        showNotification(e.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderCounselorsTable(counselors) {
    counselorsTableBody.innerHTML = '';
    if (!counselors || counselors.length === 0) {
        counselorsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No counselors found. Create one!</td></tr>';
        return;
    }
    
    counselors.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.user ? c.user.username : 'Unknown'}</td>
            <td>${c.user ? c.user.email : 'Unknown'}</td>
            <td>${c.specialty}</td>
            <td>${c.isActive ? '<span style="color:var(--success)">Active</span>' : '<span style="color:var(--error)">Inactive</span>'}</td>
            <td class="cell-actions">
                <button class="btn-icon edit" onclick="openCounselorModal('${c._id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" onclick="deleteCounselor('${c._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        counselorsTableBody.appendChild(tr);
    });
}

window.openCounselorModal = async function(counselorId = null) {
    counselorEditForm.reset();
    document.getElementById('editCounselorId').value = '';
    const userSelect = document.getElementById('editCounselorUser');
    userSelect.innerHTML = '';
    userSelect.disabled = false;
    
    try {
        showLoading('Loading data...');
        const token = localStorage.getItem('token');
        const authHeader = { 'Authorization': `Bearer ${token}` };
        
        if (counselorId) {
            const response = await fetch(`/api/admin/counselors/${counselorId}`, { headers: authHeader });
            const result = await response.json();
            if(!result.success) throw new Error(result.error);
            const c = result.data;
            
            document.getElementById('editCounselorId').value = c._id;
            const opt = document.createElement('option');
            opt.value = c.user._id;
            opt.textContent = `${c.user.username} (${c.user.email})`;
            userSelect.appendChild(opt);
            userSelect.disabled = true;
            
            document.getElementById('editCounselorSpecialty').value = c.specialty;
            document.getElementById('editCounselorBio').value = c.bio;
            document.getElementById('editCounselorSlotDuration').value = c.slotDuration;
            document.getElementById('editCounselorIsActive').checked = c.isActive;
            document.getElementById('counselorModalTitle').textContent = 'Edit Counselor';
        } else {
            const response = await fetch('/api/admin/available-users', { headers: authHeader });
            const result = await response.json();
            if(!result.success) throw new Error(result.error);
            
            if(result.data.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = "No available users";
                userSelect.appendChild(opt);
                userSelect.disabled = true;
            } else {
                result.data.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u._id;
                    opt.textContent = `${u.username} (${u.email})`;
                    userSelect.appendChild(opt);
                });
            }
            document.getElementById('counselorModalTitle').textContent = 'Create Counselor';
        }
        counselorEditModal.classList.remove('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleCounselorFormSubmit(e) {
    e.preventDefault();
    const counselorId = document.getElementById('editCounselorId').value;
    const isEditing = !!counselorId;
    
    const counselorData = {
        userId: document.getElementById('editCounselorUser').value,
        specialty: document.getElementById('editCounselorSpecialty').value,
        bio: document.getElementById('editCounselorBio').value,
        slotDuration: document.getElementById('editCounselorSlotDuration').value,
        isActive: document.getElementById('editCounselorIsActive').checked,
    };
    
    const payload = isEditing ? { ...counselorData, user: counselorData.userId } : counselorData;
    const url = isEditing ? `/api/admin/counselors/${counselorId}` : '/api/admin/counselors';
    const method = isEditing ? 'PUT' : 'POST';
    
    try {
        showLoading('Saving counselor...');
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showNotification('Counselor saved successfully', 'success');
        counselorEditModal.classList.add('hidden');
        loadCounselors(state.counselors.currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

window.deleteCounselor = async function(counselorId) {
    if (!confirm('Are you sure you want to delete this counselor profile? This action cannot be undone.')) return;
    try {
        showLoading('Deleting...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/counselors/${counselorId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showNotification('Counselor deleted', 'success');
        loadCounselors(state.counselors.currentPage);
    } catch(e) {
        showNotification(e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function loadAppointments(page = 1) {
    try {
        showLoading('Loading appointments...');
        const token = localStorage.getItem('token');
        const searchTerm = state.appointments.search;
        const url = `/api/admin/appointments?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if(!data.success) throw new Error(data.error);
        
        renderAppointmentsTable(data.data.items);
        state.appointments = { ...state.appointments, totalPages: data.data.pages || 1, currentPage: data.data.currentPage || 1 };
        renderPagination('appointments', state.appointments);
        updateURLFromState();
    } catch(e) {
        showNotification(e.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderAppointmentsTable(appointments) {
    appointmentsTableBody.innerHTML = '';
    if (!appointments || appointments.length === 0) {
        appointmentsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No appointments found.</td></tr>';
        return;
    }
    
    appointments.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.user ? a.user.username : 'Unknown'}</td>
            <td>${a.counselor && a.counselor.user ? a.counselor.user.username : 'Unknown'}</td>
            <td>${new Date(a.startTime).toLocaleString()}</td>
            <td>${a.status}</td>
            <td class="cell-actions">
                <button class="btn-icon edit" onclick="openAppointmentStatusModal('${a._id}', '${a.status}')"><i class="fa-solid fa-pen"></i></button>
            </td>
        `;
        appointmentsTableBody.appendChild(tr);
    });
}

window.openAppointmentStatusModal = function(appointmentId, currentStatus) {
    document.getElementById('editAppointmentId').value = appointmentId;
    document.getElementById('editAppointmentStatus').value = currentStatus;
    document.getElementById('appointmentStatusModal').classList.remove('hidden');
};

async function handleAppointmentStatusUpdate(e) {
    e.preventDefault();
    const appointmentId = document.getElementById('editAppointmentId').value;
    const newStatus = document.getElementById('editAppointmentStatus').value;
    
    try {
        showLoading('Updating status...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus })
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showNotification('Appointment status updated successfully!', 'success');
        document.getElementById('appointmentStatusModal').classList.add('hidden');
        await loadAppointments(state.appointments.currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
};

async function loadForumPostsAdmin(page = 1) {
    try {
        showLoading('Loading forum posts...');
        const token = localStorage.getItem('token');
        const searchTerm = state.forum.search;
        const url = `/api/admin/forum/posts?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if(!data.success) throw new Error(data.error);
        
        renderForumPostsTable(data.data.items);
        state.forum = { ...state.forum, totalPages: data.data.pages || 1, currentPage: data.data.currentPage || 1 };
        renderPagination('forum', state.forum);
        updateURLFromState();
    } catch(e) {
        showNotification(e.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderForumPostsTable(posts) {
    forumPostsTableBody.innerHTML = '';
    if (!posts || posts.length === 0) {
        forumPostsTableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No forum posts found.</td></tr>';
        return;
    }
    
    posts.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="cell-truncate">${p.title}</td>
            <td>${p.user ? p.user.username : 'Unknown'}</td>
            <td>${new Date(p.createdAt).toLocaleDateString()}</td>
            <td>${p.isAnonymous ? 'Yes' : 'No'}</td>
            <td style="color:${p.reports.length > 0 ? 'var(--warning)' : 'inherit'}">${p.reports.length}</td>
            <td class="cell-actions">
                <button class="btn-icon delete" onclick="deletePostAdmin('${p._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        forumPostsTableBody.appendChild(tr);
    });
}

window.deletePostAdmin = async function(postId) {
    if (!confirm('Are you sure you want to delete this post and all its comments? This cannot be undone.')) return;
    try {
        showLoading('Deleting post...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/forum/posts/${postId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showNotification('Post deleted successfully.', 'success');
        await loadForumPostsAdmin(state.forum.currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderPagination(sectionName, paginationState) {
    const { currentPage, totalPages } = paginationState;
    const container = document.getElementById(`${sectionName}Pagination`);
    if (!container) return;
    
    container.innerHTML = `
        <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="changePage('${sectionName}', ${currentPage - 1})">Previous</button>
        <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
        <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="changePage('${sectionName}', ${currentPage + 1})">Next</button>
    `;
}

window.changePage = function(sectionName, page) {
    const stateObj = window.state || state;
    const secState = stateObj[sectionName];
    if (page < 1 || page > secState.totalPages) return;
    
    switch (sectionName) {
        case 'users': loadUsers(page); break;
        case 'chats': loadChats(page); break;
        case 'resources': loadResources(page); break;
        case 'counselors': loadCounselors(page); break;
        case 'appointments': loadAppointments(page); break;
        case 'forum': loadForumPostsAdmin(page); break;
    }
}

function showLoading(message = 'Loading...') {
    const existingOverlay = document.getElementById('loadingOverlay');
    if (existingOverlay) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `<div class="loading-spinner"></div><div class="loading-message">${message}</div>`;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) loadingDiv.remove();
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

if(navLinks) navLinks.forEach(link => link.addEventListener('click', switchSection));
if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if(resourceEditForm) resourceEditForm.addEventListener('submit', handleResourceFormSubmit);
if(counselorEditForm) counselorEditForm.addEventListener('submit', handleCounselorFormSubmit);
if(document.getElementById('appointmentStatusForm')) document.getElementById('appointmentStatusForm').addEventListener('submit', handleAppointmentStatusUpdate);
if(closeUserModalBtn) closeUserModalBtn.addEventListener('click', () => userEditModal.classList.add('hidden'));
if(closeChatModalBtn) closeChatModalBtn.addEventListener('click', () => chatDetailModal.classList.add('hidden'));
if(closeResourceModalBtn) closeResourceModalBtn.addEventListener('click', () => resourceEditModal.classList.add('hidden'));
if(closeCounselorModalBtn) closeCounselorModalBtn.addEventListener('click', () => counselorEditModal.classList.add('hidden'));
if(document.getElementById('closeAppointmentStatusModalBtn')) document.getElementById('closeAppointmentStatusModalBtn').addEventListener('click', () => document.getElementById('appointmentStatusModal').classList.add('hidden'));

if(userSearchInput) userSearchInput.addEventListener('input', debounce((e) => { state.users.search = e.target.value; loadUsers(1); }, 500));
if(chatSearchInput) chatSearchInput.addEventListener('input', debounce((e) => { state.chats.search = e.target.value; loadChats(1); }, 500));
if(resourceSearchInput) resourceSearchInput.addEventListener('input', debounce((e) => { state.resources.search = e.target.value; loadResources(1); }, 500));
if(counselorSearchInput) counselorSearchInput.addEventListener('input', debounce((e) => { state.counselors.search = e.target.value; loadCounselors(1); }, 500));
if(appointmentSearchInput) appointmentSearchInput.addEventListener('input', debounce((e) => { state.appointments.search = e.target.value; loadAppointments(1); }, 500));
if(forumSearchInput) forumSearchInput.addEventListener('input', debounce((e) => { state.forum.search = e.target.value; loadForumPostsAdmin(1); }, 500));

if(refreshUsersBtn) refreshUsersBtn.addEventListener('click', () => loadUsers(state.users.currentPage));
if(refreshChatsBtn) refreshChatsBtn.addEventListener('click', () => loadChats(state.chats.currentPage));
if(refreshResourcesBtn) refreshResourcesBtn.addEventListener('click', () => loadResources(state.resources.currentPage));
if(refreshCounselorsBtn) refreshCounselorsBtn.addEventListener('click', () => loadCounselors(state.counselors.currentPage));
if(refreshAppointmentsBtn) refreshAppointmentsBtn.addEventListener('click', () => loadAppointments(state.appointments.currentPage));
if(refreshForumBtn) refreshForumBtn.addEventListener('click', () => loadForumPostsAdmin(state.forum.currentPage));

if(createNewResourceBtn) createNewResourceBtn.addEventListener('click', () => openResourceModal());
if(createNewCounselorBtn) createNewCounselorBtn.addEventListener('click', () => openCounselorModal());