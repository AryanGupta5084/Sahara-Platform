document.addEventListener('DOMContentLoaded', () => {
    const counselorUsernameEl = document.getElementById('counselorUsername');
    const logoutBtn = document.getElementById('logoutBtn');
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    const liveChatModal = document.getElementById('liveChatModal');
    const closeLiveChatModalBtn = document.getElementById('closeLiveChatModalBtn');
    const liveChatHeader = document.getElementById('liveChatHeader');
    const liveChatMessages = document.getElementById('liveChatMessages');
    const liveChatForm = document.getElementById('liveChatForm');
    const liveChatMessageInput = document.getElementById('liveChatMessageInput');
    const counselorSpecialtyEl = document.getElementById('counselorSpecialty');
    const counselorBioEl = document.getElementById('counselorBio');
    const availabilityForm = document.getElementById('availabilityForm');
    const availabilityContainer = document.getElementById('availabilityContainer');

    let socket;
    let currentUser = null;
    let currentAppointmentId = null;

    checkAuthAndLoadDashboard();

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    closeLiveChatModalBtn.addEventListener('click', () => {
        liveChatModal.classList.add('hidden');
        if (socket) {
            socket.disconnect();
        }
    });

    liveChatForm.addEventListener('submit', handleLiveChatMessageSend);
    availabilityForm.addEventListener('submit', handleAvailabilityUpdate);

    async function checkAuthAndLoadDashboard() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }
        
        try {
            appointmentsTableBody.innerHTML = '<tr><td colspan="4">Loading your schedule...</td></tr>';
            const authHeader = { 'Authorization': `Bearer ${token}` };
            
            const profileRes = await fetch('/api/counselors/profile', { headers: authHeader });
            const profileData = await profileRes.json();
            if (!profileData.success) throw new Error(profileData.error);
            
            currentUser = profileData.data.user;
            counselorUsernameEl.textContent = currentUser.username;
            populateProfileData(profileData.data);
            buildAvailabilityForm(profileData.data.availability);
            
            const apptRes = await fetch('/api/counselors/my-appointments', { headers: authHeader });
            const apptData = await apptRes.json();
            if (!apptData.success) throw new Error(apptData.error);
            
            renderAppointments(apptData.data);
        } catch (error) {
            alert(error.message);
            window.location.href = '/';
        }
    }

    function renderAppointments(appointments) {
        if (!appointments || appointments.length === 0) {
            appointmentsTableBody.innerHTML = '<tr><td colspan="4">You have no appointments scheduled.</td></tr>';
            return;
        }
        
        const now = new Date();
        const upcomingAppointments = appointments.filter(apt => new Date(apt.endTime) > now);
        
        if (upcomingAppointments.length === 0) {
            appointmentsTableBody.innerHTML = '<tr><td colspan="4">You have no upcoming appointments.</td></tr>';
            return;
        }
        
        appointmentsTableBody.innerHTML = upcomingAppointments.map(apt => {
            const startTime = new Date(apt.startTime);
            const endTime = new Date(apt.endTime);
            const isActive = now >= startTime && now <= endTime && apt.status === 'confirmed';
            
            return `<tr>
                <td>${apt.user.username}</td>
                <td>${startTime.toLocaleString()}</td>
                <td>${apt.status}</td>
                <td>
                    <button class="btn primary-btn" data-appointment-id="${apt._id}" data-client-name="${apt.user.username}" ${!isActive ? 'disabled' : ''}>
                        Join Chat
                    </button>
                </td>
            </tr>`;
        }).join('');

        appointmentsTableBody.querySelectorAll('button[data-appointment-id]').forEach(button => {
            button.addEventListener('click', (event) => {
                const { appointmentId, clientName } = event.currentTarget.dataset;
                joinLiveChat(appointmentId, clientName);
            });
        });
    }

    function populateProfileData(profile) {
        try {
            counselorSpecialtyEl.textContent = profile.specialty;
            counselorBioEl.textContent = profile.bio || 'Not set.';
        } catch (error) {
            console.error("Could not populate counselor profile:", error);
            counselorSpecialtyEl.textContent = 'Error loading data.';
        }
    }

    function buildAvailabilityForm(existingAvailability = []) {
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        availabilityContainer.innerHTML = daysOfWeek.map((day, index) => {
            const dayData = existingAvailability.find(a => a.dayOfWeek === index);
            const isChecked = !!dayData;
            return `<div class="availability-day">
                <label>
                    <input type="checkbox" id="day-${index}" data-day="${index}" ${isChecked ? 'checked' : ''}>
                    ${day}
                </label>
                <input type="time" id="start-${index}" value="${isChecked ? dayData.startTime : ''}" ${!isChecked ? 'disabled' : ''}>
                <span>-</span>
                <input type="time" id="end-${index}" value="${isChecked ? dayData.endTime : ''}" ${!isChecked ? 'disabled' : ''}>
            </div>`;
        }).join('');

        availabilityContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const dayIndex = e.target.dataset.day;
                const startTimeInput = document.getElementById(`start-${dayIndex}`);
                const endTimeInput = document.getElementById(`end-${dayIndex}`);
                startTimeInput.disabled = !e.target.checked;
                endTimeInput.disabled = !e.target.checked;
            }
        });
    }

    async function handleAvailabilityUpdate(e) {
        e.preventDefault();
        const saveBtn = availabilityForm.querySelector('button[type="submit"]');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        try {
            const newAvailability = [];
            const dayCheckboxes = availabilityContainer.querySelectorAll('input[type="checkbox"]');
            
            dayCheckboxes.forEach(cb => {
                if (cb.checked) {
                    const dayIndex = parseInt(cb.dataset.day, 10);
                    const startTime = document.getElementById(`start-${dayIndex}`).value;
                    const endTime = document.getElementById(`end-${dayIndex}`).value;
                    if(startTime && endTime) {
                        newAvailability.push({ dayOfWeek: dayIndex, startTime, endTime });
                    }
                }
            });
            
            const token = localStorage.getItem('token');
            const response = await fetch('/api/counselors/availability', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ availability: newAvailability })
            });
            
            const data = await response.json();
            if(!data.success) throw new Error(data.error);
            alert("Availability saved successfully!");
        } catch (error) {
            alert(`Error saving changes: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }

    function joinLiveChat(appointmentId, clientName) {
        currentAppointmentId = appointmentId;
        liveChatHeader.textContent = `Live Session with ${clientName}`;
        liveChatMessages.innerHTML = '<p class="system-message">Connecting to session...</p>';
        liveChatModal.classList.remove('hidden');

        socket = io({
            auth: { token: localStorage.getItem('token') }
        });

        socket.on('connect', () => {
            liveChatMessages.innerHTML = '<p class="system-message">Connected! You have joined the session.</p>';
            socket.emit('joinSession', { appointmentId: currentAppointmentId });
        });

        socket.on('loadHistory', (history) => {
            liveChatMessages.innerHTML = '';
            if (history && history.length > 0) {
                history.forEach(msg => {
                    const isMe = msg.sender._id === currentUser._id;
                    const messageData = {
                        message: msg.message,
                        senderUsername: msg.sender.username
                    };
                    addMessageToChat(messageData, isMe);
                });
            } else {
                liveChatMessages.innerHTML = '<p class="system-message">You have joined the session. Please wait for your client.</p>';
            }
        });

        socket.on('receiveMessage', (messageData) => {
            addMessageToChat(messageData, false);
        });

        socket.on('connect_error', (err) => {
            liveChatMessages.innerHTML = `<p class="error-text">Connection failed: ${err.message}. Please try again.</p>`;
        });

        socket.on('disconnect', () => {
            liveChatMessages.innerHTML += '<p class="system-message">You have been disconnected from the session.</p>';
        });
    }

    function handleLiveChatMessageSend(event) {
        event.preventDefault();
        const messageText = liveChatMessageInput.value.trim();
        if (!messageText || !socket || !currentAppointmentId) return;

        const messageData = {
            senderId: currentUser._id,
            senderUsername: currentUser.username,
            message: messageText,
            timestamp: new Date().toISOString()
        };

        socket.emit('sendMessage', { appointmentId: currentAppointmentId, message: messageText });
        addMessageToChat(messageData, true);
        liveChatMessageInput.value = '';
    }

    function addMessageToChat(data, isFromMe) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `exercise-message ${isFromMe ? 'user-message' : 'bot-message'}`;
        messageDiv.innerHTML = `<p>${data.message}</p>`;
        
        liveChatMessages.appendChild(messageDiv);
        liveChatMessages.scrollTop = liveChatMessages.scrollHeight;
    }
});