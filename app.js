// Configuration
const CONFIG = {
    PRODUCTS_PER_PAGE: 6,
    API_BASE_URL: 'https://dern-market-backend.up.railway.app/api',
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 4000,
    SEARCH_DEBOUNCE: 300
};

// Global State
let state = {
    currentPage: 1,
    products: [],
    filteredProducts: [],
    searchQuery: '',
    sortBy: 'default',
    maxPrice: 1000000,
    isLoading: false,
    theme: localStorage.getItem('theme') || 'light'
};

// Utility Functions
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
};

const createElement = (tag, className, innerHTML) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
};

// Theme Management
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = state.theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.innerHTML = state.theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    showToast(`Switched to ${state.theme} mode`, 'info');
}

// Loading Screen
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }, 1000);
    }
}

// Toast Notifications
function showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = createElement('div', `toast ${type}`);
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toastContainer.removeChild(toast);
            }
        }, CONFIG.ANIMATION_DURATION);
    }, duration);
}

// User Management
function checkAdminRedirect() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.isAdmin) {
        window.location.href = 'admin/index.html';
    }
}

function renderUserInfo() {
    const userInfoDiv = document.getElementById('userInfo');
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        userInfoDiv.innerHTML = `
            <span><i class="fas fa-user"></i> ${user.name}</span>
            <button onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
        `;
    } else {
        userInfoDiv.innerHTML = `
            <a href="login/index.html"><i class="fas fa-sign-in-alt"></i> Login</a>
            <span style="margin: 0 0.5rem; color: var(--text-muted);">|</span>
            <a href="register/index.html"><i class="fas fa-user-plus"></i> Register</a>
        `;
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    renderUserInfo();
    updateCartBadge();
    showToast('Successfully logged out', 'success');
    setTimeout(() => window.location.reload(), 1000);
}

// Cart Management
function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

function addToCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.productId === productId);
    const product = state.products.find(p => p.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId,
            quantity: 1
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartItems();
    
    // Add visual feedback
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Added!';
    button.style.background = 'var(--success-gradient)';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = 'var(--primary-gradient)';
    }, 2000);
    
    showToast(`${product.name} added to cart!`, 'success');
}

// Search Functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const searchSuggestions = document.getElementById('searchSuggestions');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, CONFIG.SEARCH_DEBOUNCE));
        searchInput.addEventListener('focus', showSearchSuggestions);
        searchInput.addEventListener('blur', hideSearchSuggestions);
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
    }
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchSuggestions();
        }
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    state.searchQuery = query;
    
    const searchClear = document.getElementById('searchClear');
    if (searchClear) {
        searchClear.style.display = query ? 'block' : 'none';
    }
    
    filterProducts();
    updateSearchSuggestions(query);
}

function updateSearchSuggestions(query) {
    const searchSuggestions = document.getElementById('searchSuggestions');
    if (!searchSuggestions || !query) {
        hideSearchSuggestions();
        return;
    }
    
    const suggestions = state.products
        .filter(product => product.name.toLowerCase().includes(query))
        .slice(0, 5)
        .map(product => `
            <div class="suggestion-item" onclick="selectSuggestion('${product.name}')">
                <i class="fas fa-search"></i>
                ${product.name}
            </div>
        `).join('');
    
    if (suggestions) {
        searchSuggestions.innerHTML = suggestions;
        searchSuggestions.style.display = 'block';
    } else {
        hideSearchSuggestions();
    }
}

function selectSuggestion(productName) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = productName;
        state.searchQuery = productName.toLowerCase();
        filterProducts();
        hideSearchSuggestions();
    }
}

function showSearchSuggestions() {
    const searchSuggestions = document.getElementById('searchSuggestions');
    const query = document.getElementById('searchInput').value.trim();
    if (searchSuggestions && query) {
        updateSearchSuggestions(query);
    }
}

function hideSearchSuggestions() {
    const searchSuggestions = document.getElementById('searchSuggestions');
    if (searchSuggestions) {
        setTimeout(() => {
            searchSuggestions.style.display = 'none';
        }, 200);
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    
    if (searchClear) {
        searchClear.style.display = 'none';
    }
    
    state.searchQuery = '';
    filterProducts();
    hideSearchSuggestions();
}

// Filter and Sort Functions
function initializeFilters() {
    const sortSelect = document.getElementById('sortSelect');
    const priceRange = document.getElementById('priceRange');
    const filterReset = document.getElementById('filterReset');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSortChange);
    }
    
    if (priceRange) {
        priceRange.addEventListener('input', handlePriceRangeChange);
        // Set initial max value based on products
        updatePriceRangeMax();
    }
    
    if (filterReset) {
        filterReset.addEventListener('click', resetFilters);
    }
}

function handleSortChange(e) {
    state.sortBy = e.target.value;
    filterProducts();
}

function handlePriceRangeChange(e) {
    state.maxPrice = parseInt(e.target.value);
    const priceDisplay = document.getElementById('priceDisplay');
    if (priceDisplay) {
        priceDisplay.textContent = `Up to ${formatPrice(state.maxPrice)} UZS`;
    }
    filterProducts();
}

function updatePriceRangeMax() {
    if (state.products.length === 0) return;
    
    const maxProductPrice = Math.max(...state.products.map(p => p.price));
    const priceRange = document.getElementById('priceRange');
    const priceDisplay = document.getElementById('priceDisplay');
    
    if (priceRange) {
        priceRange.max = maxProductPrice;
        priceRange.value = maxProductPrice;
        state.maxPrice = maxProductPrice;
    }
    
    if (priceDisplay) {
        priceDisplay.textContent = `Up to ${formatPrice(maxProductPrice)} UZS`;
    }
}

function resetFilters() {
    const sortSelect = document.getElementById('sortSelect');
    const priceRange = document.getElementById('priceRange');
    const searchInput = document.getElementById('searchInput');
    
    if (sortSelect) sortSelect.value = 'default';
    if (searchInput) searchInput.value = '';
    
    state.sortBy = 'default';
    state.searchQuery = '';
    
    updatePriceRangeMax();
    clearSearch();
    filterProducts();
    
    showToast('Filters reset', 'info');
}

function filterProducts() {
    let filtered = [...state.products];
    
    // Apply search filter
    if (state.searchQuery) {
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(state.searchQuery) ||
            product.description.toLowerCase().includes(state.searchQuery)
        );
    }
    
    // Apply price filter
    filtered = filtered.filter(product => product.price <= state.maxPrice);
    
    // Apply sorting
    switch (state.sortBy) {
        case 'price-low':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        default:
            // Keep original order
            break;
    }
    
    state.filteredProducts = filtered;
    state.currentPage = 1;
    renderProducts();
    renderPagination();
}

// Product Management
async function fetchProducts() {
    try {
        state.isLoading = true;
        showProductSkeletons();
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/products`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch products');
        
        state.products = await response.json();
        state.filteredProducts = [...state.products];
        
        updateTotalProductsCount();
        updatePriceRangeMax();
        renderProducts();
        renderPagination();
        renderCartItems();
        
        state.isLoading = false;
        hideError();
        
    } catch (error) {
        state.isLoading = false;
        showError(`Failed to load products: ${error.message}`);
        showToast('Failed to load products', 'error');
    }
}

function updateTotalProductsCount() {
    const totalProducts = document.getElementById('totalProducts');
    if (totalProducts) {
        // Animate counter
        animateCounter(totalProducts, 0, state.products.length, 1000);
    }
}

function animateCounter(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

function showProductSkeletons() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    const skeletons = Array.from({ length: CONFIG.PRODUCTS_PER_PAGE }, () => 
        '<div class="product-card skeleton product-skeleton"></div>'
    ).join('');
    
    productsGrid.innerHTML = skeletons;
}

function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    const start = (state.currentPage - 1) * CONFIG.PRODUCTS_PER_PAGE;
    const end = start + CONFIG.PRODUCTS_PER_PAGE;
    const pageProducts = state.filteredProducts.slice(start, end);
    
    if (pageProducts.length === 0) {
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
                <div style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1rem;">
                    <i class="fas fa-search"></i>
                </div>
                <h3 style="color: var(--text-secondary); margin-bottom: 1rem;">No products found</h3>
                <p style="color: var(--text-muted); margin-bottom: 2rem;">
                    ${state.searchQuery ? `No results for "${state.searchQuery}"` : 'Try adjusting your filters'}
                </p>
                <button onclick="resetFilters()" class="hero-cta">
                    <i class="fas fa-undo"></i>
                    <span>Reset Filters</span>
                </button>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = '';
    
    pageProducts.forEach((product, index) => {
        const card = createElement('div', 'product-card');
        card.style.animationDelay = `${index * 100}ms`;
        card.innerHTML = `
            <div class="product-image">
                <i class="fas fa-image"></i>
            </div>
            <h3>${product.name}</h3>
            <div class="product-price">
                <i class="fas fa-tag"></i>
                ${formatPrice(product.price)} UZS
            </div>
            <p class="product-description">${product.description}</p>
            <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                <i class="fas fa-cart-plus"></i>
                <span>Add to Cart</span>
            </button>
        `;
        
        productsGrid.appendChild(card);
        
        // Trigger animation
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function renderPagination() {
    const paginationDiv = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (!paginationDiv) return;
    
    const totalPages = Math.ceil(state.filteredProducts.length / CONFIG.PRODUCTS_PER_PAGE);
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        if (paginationInfo) paginationInfo.innerHTML = '';
        return;
    }
    
    paginationDiv.innerHTML = '';
    
    // Previous button
    const prevButton = createElement('button', '', '<i class="fas fa-chevron-left"></i> Previous');
    prevButton.disabled = state.currentPage === 1;
    prevButton.onclick = () => changePage(state.currentPage - 1);
    paginationDiv.appendChild(prevButton);
    
    // Page numbers with ellipsis
    const maxVisiblePages = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        const firstButton = createElement('button', '', '1');
        firstButton.onclick = () => changePage(1);
        paginationDiv.appendChild(firstButton);
        
        if (startPage > 2) {
            const ellipsis = createElement('span', '', '...');
            ellipsis.style.padding = '0.75rem';
            ellipsis.style.color = 'var(--text-muted)';
            paginationDiv.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createElement('button', '', i.toString());
        pageButton.disabled = i === state.currentPage;
        if (i === state.currentPage) {
            pageButton.style.background = 'var(--primary-gradient)';
            pageButton.style.color = 'white';
            pageButton.style.borderColor = 'transparent';
        }
        pageButton.onclick = () => changePage(i);
        paginationDiv.appendChild(pageButton);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = createElement('span', '', '...');
            ellipsis.style.padding = '0.75rem';
            ellipsis.style.color = 'var(--text-muted)';
            paginationDiv.appendChild(ellipsis);
        }
        
        const lastButton = createElement('button', '', totalPages.toString());
        lastButton.onclick = () => changePage(totalPages);
        paginationDiv.appendChild(lastButton);
    }
    
    // Next button
    const nextButton = createElement('button', '', 'Next <i class="fas fa-chevron-right"></i>');
    nextButton.disabled = state.currentPage === totalPages;
    nextButton.onclick = () => changePage(state.currentPage + 1);
    paginationDiv.appendChild(nextButton);
    
    // Update pagination info
    if (paginationInfo) {
        const start = (state.currentPage - 1) * CONFIG.PRODUCTS_PER_PAGE + 1;
        const end = Math.min(start + CONFIG.PRODUCTS_PER_PAGE - 1, state.filteredProducts.length);
        paginationInfo.innerHTML = `Showing ${start}-${end} of ${state.filteredProducts.length} products`;
    }
}

function changePage(page) {
    state.currentPage = page;
    renderProducts();
    renderPagination();
    scrollToProducts();
}

// Cart and Orders
async function renderCartItems() {
    const cartItemsDiv = document.getElementById('cartItems');
    if (!cartItemsDiv) return;
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Your cart is empty</p>
                <button onclick="scrollToProducts()" class="card-button cart-button" style="width: auto;">
                    <i class="fas fa-shopping-bag"></i>
                    <span>Start Shopping</span>
                </button>
            </div>
        `;
        return;
    }
    
    const latestItems = cart.slice(-3);
    cartItemsDiv.innerHTML = '';
    
    for (const item of latestItems) {
        const product = state.products.find(p => p.id === item.productId);
        if (product) {
            const itemDiv = createElement('div', 'cart-item');
            itemDiv.innerHTML = `
                <p><strong><i class="fas fa-box"></i> ${product.name}</strong></p>
                <p><i class="fas fa-hashtag"></i> Quantity: ${item.quantity}</p>
                <p style="color: #10b981; font-weight: 700;">
                    <i class="fas fa-tag"></i> ${formatPrice(product.price * item.quantity)} UZS
                </p>
            `;
            cartItemsDiv.appendChild(itemDiv);
        }
    }
    
    if (cart.length > 3) {
        const moreDiv = createElement('div', '', `
            <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-style: italic;">
                <i class="fas fa-ellipsis-h"></i> and ${cart.length - 3} more items
            </div>
        `);
        cartItemsDiv.appendChild(moreDiv);
    }
}

async function renderOrderItems() {
    const orderItemsDiv = document.getElementById('orderItems');
    if (!orderItemsDiv) return;
    
    const user = JSON.parse(localStorage.getItem('user'));
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (!user) {
        orderItemsDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;">
                    <i class="fas fa-user-lock"></i>
                </div>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Please login to view orders</p>
                <a href="login/index.html" class="card-button orders-button" style="width: auto;">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Login Now</span>
                </a>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/orders?userId=${user.id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch orders');
        const orders = await response.json();
        
        if (orders.length === 0) {
            orderItemsDiv.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">No orders found</p>
                    ${cart.length > 0 ? 
                        '<a href="cart/index.html" class="card-button orders-button" style="width: auto;"><i class="fas fa-shopping-cart"></i><span>Complete Purchase</span></a>' : 
                        '<button onclick="scrollToProducts()" class="card-button orders-button" style="width: auto;"><i class="fas fa-shopping-bag"></i><span>Start Shopping</span></button>'}
                </div>
            `;
            return;
        }
        
        const latestOrders = orders.slice(-3);
        orderItemsDiv.innerHTML = '';
        
        latestOrders.forEach(order => {
            const itemDiv = createElement('div', 'order-item');
            const statusConfig = {
                completed: { icon: 'check-circle', color: '#10b981' },
                pending: { icon: 'clock', color: '#f59e0b' },
                processing: { icon: 'cog fa-spin', color: '#3b82f6' },
                shipped: { icon: 'truck', color: '#8b5cf6' }
            };
            
            const status = statusConfig[order.status] || statusConfig.pending;
            
            itemDiv.innerHTML = `
                <p><strong><i class="fas fa-receipt"></i> Order #${order.id}</strong></p>
                <p style="color: ${status.color};">
                    <i class="fas fa-${status.icon}"></i> 
                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </p>
                <p style="color: var(--text-secondary);">
                    <i class="fas fa-calendar"></i> 
                    ${new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                </p>
            `;
            orderItemsDiv.appendChild(itemDiv);
        });
        
        if (orders.length > 3) {
            const moreDiv = createElement('div', '', `
                <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-style: italic;">
                    <i class="fas fa-ellipsis-h"></i> and ${orders.length - 3} more orders
                </div>
            `);
            orderItemsDiv.appendChild(moreDiv);
        }
        
    } catch (error) {
        orderItemsDiv.innerHTML = `
            <div class="error-message" style="margin: 0;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Failed to load orders: ${error.message}</span>
            </div>
        `;
    }
}

// Utility Functions
function scrollToProducts() {
    const productsSection = document.querySelector('.products-section');
    if (productsSection) {
        productsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;
        errorDiv.style.display = 'flex';
    }
}

function hideError() {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Back to Top Button
function initializeBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Smooth Scrolling for Anchor Links
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme first
    initializeTheme();
    
    // Check admin redirect
    checkAdminRedirect();
    
    // Initialize UI components
    renderUserInfo();
    updateCartBadge();
    initializeSearch();
    initializeFilters();
    initializeBackToTop();
    initializeSmoothScrolling();
    
    // Fetch data
    await fetchProducts();
    await renderOrderItems();
    
    // Hide loading screen
    hideLoadingScreen();
    
    // Add performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Page loaded in ${loadTime}ms`);
        });
    }
});

// Handle visibility change for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause any animations or timers
        console.log('Page hidden - pausing animations');
    } else {
        // Page is visible, resume animations
        console.log('Page visible - resuming animations');
    }
});

// Error handling for unhandled promises
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('Something went wrong. Please try again.', 'error');
});

// Service Worker registration (if available)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}