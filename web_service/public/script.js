document.addEventListener('DOMContentLoaded', () => {

});

function createElement(tag, { className, textContent, children, dataset, onclick, style }) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    if (onclick) el.onclick = onclick;
    
    if (dataset) {
        for (const key in dataset) {
            el.dataset[key] = dataset[key];
        }
    }
    
    if (style) {
        for (const key in style) {
            el.style[key] = style[key];
        }
    }
    
    if (children && Array.isArray(children)) {
        children.forEach(child => child && el.appendChild(child));
    }
    
    return el;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function getToken() {
    return localStorage.getItem('token');
}