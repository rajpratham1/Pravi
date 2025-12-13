// ============================================================
// Pravi Marketplace - Rewritten Application Logic (v2.1)
// ============================================================



// ============================================================
// FIREBASE INITIALIZATION & GLOBAL VARIABLES
// ============================================================
let app, auth, database;
let firebaseInitialized = false;
let currentUser = {
    isLoggedIn: false,
    uid: null,
    role: null,
    email: null,
    name: null
};

try {
    if (!firebaseConfig.apiKey) {
        throw new Error('Invalid Firebase configuration. Please paste your project config into app.js.');
    }
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    document.body.innerHTML = `<div class="container" style="padding: 2rem;"><div class="error-message" style="display:block;"><h3>Firebase Config Error</h3><p>${error.message}</p><p>Please follow the setup instructions in <strong>README.md</strong> to configure your Firebase project and paste the config object into <strong>app.js</strong>.</p></div></div>`;
}

// ============================================================
// DOM EVENT LISTENERS & INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (firebaseInitialized) {
        initTheme();
        initMobileMenu();
        initFaqAccordion();
        initScrollAnimations();
        initAuthListener();
        listingsApi.fetch(); // Fetch listings on load
        cart.init(); // Initialize cart

        showPage('home'); // Show the home page by default
    }
});

// ============================================================
// AUTHENTICATION LISTENER & UI UPDATES
// ============================================================
function initAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userSnapshot = await database.ref('users/' + user.uid).once('value');
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    currentUser = {
                        isLoggedIn: true,
                        uid: user.uid,
                        email: user.email,
                        role: userData.role,
                        name: userData.name
                    };
                    console.log('User role fetched:', currentUser.role);
                    updateUIAfterLogin();
                    
                    // Redirect to the correct dashboard if user just logged in
                    if (['login', 'signup'].includes(currentPage)) {
                        switch (currentUser.role) {
                            case 'admin':
                                showPage('developer-dashboard');
                                break;
                            case 'seller':
                                showPage('seller-dashboard');
                                break;
                            default:
                                showPage('user-dashboard');
                        }
                    }
                } else {
                    // This might happen if DB entry fails after signup. Treat as logged out.
                    console.error("User exists in Auth, but not in Database. Logging out.");
                    logout();
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                logout(); // Log out on error to prevent inconsistent state
            }
        } else {
            currentUser = { isLoggedIn: false, uid: null, role: null, email: null, name: null };
            updateUIAfterLogin();
        }
    });
}

function updateUIAfterLogin() {
    const authLinks = document.getElementById('auth-links');
    const userMenu = document.getElementById('user-menu');
    const usernameDisplay = document.getElementById('username-display');
    const dashboardLink = userMenu.querySelector('a[onclick="showPage(\'dashboard\')"]');
    const becomeSellerBtn = document.querySelector('.cta-buttons a[onclick*="seller-apply"]');

    if (currentUser.isLoggedIn) {
        authLinks.style.display = 'none';
        userMenu.style.display = 'flex';
        usernameDisplay.textContent = currentUser.name || currentUser.email.split('@')[0];

        // Customize dashboard link based on role
        if (dashboardLink) {
            let dashboardPage = 'user-dashboard';
            if (currentUser.role === 'admin') dashboardPage = 'developer-dashboard';
            if (currentUser.role === 'seller') dashboardPage = 'seller-dashboard';
            dashboardLink.setAttribute('onclick', `showPage('${dashboardPage}')`);
        }
        
        // Hide "Become a Seller" button if user is already a seller or admin
        if (becomeSellerBtn) {
            if (currentUser.role === 'seller' || currentUser.role === 'admin') {
                becomeSellerBtn.style.display = 'none';
            } else {
                becomeSellerBtn.style.display = 'inline-block';
            }
        }

    } else {
        authLinks.style.display = 'flex';
        userMenu.style.display = 'none';
        usernameDisplay.textContent = '';
        if (dashboardLink) {
             dashboardLink.setAttribute('onclick', `showPage('dashboard')`); // Reset to generic
        }
        if (becomeSellerBtn) {
            becomeSellerBtn.style.display = 'inline-block'; // Show for logged-out users
        }
    }
}


function initTheme() {
    const themeCheckbox = document.getElementById('theme-checkbox');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', currentTheme);
    themeCheckbox.checked = currentTheme === 'dark';

    themeCheckbox.addEventListener('change', () => {
        const newTheme = themeCheckbox.checked ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const nav = document.getElementById('main-nav');
    menuBtn.addEventListener('click', () => {
        nav.classList.toggle('mobile-active');
        menuBtn.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });
}

function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            faqItems.forEach(i => i.classList.remove('active'));
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });

    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach(el => observer.observe(el));
}

// ============================================================
// LISTING MANAGEMENT
// ============================================================
let allListings = [];

const listingsApi = {
    fetch: async function() {
        try {
            const snapshot = await database.ref('listings').once('value');
            const listingsData = snapshot.val();
            if (listingsData) {
                allListings = Object.keys(listingsData).map(key => ({
                    id: key,
                    ...listingsData[key],
                    imageBase64: listingsData[key].imageBase64
                })).sort((a, b) => b.createdAt - a.createdAt); // Sort newest first by default
                
                this.render();
            } else {
                allListings = [];
                this.render();
            }
        } catch (error) {
            console.error("Error fetching listings:", error);
            document.getElementById('all-listings').innerHTML = '<p class="error-message" style="display:block;">Could not load listings.</p>';
        }
    },
    
    render: function() {
        // Render latest 3 on home page
        this.renderListings('home-listings', allListings.slice(0, 3));
        // Render all on the listings page, respecting filters
        this.filterAndRender();
    },

    filterAndRender: function() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const sortOrder = document.getElementById('sort-select').value;

        let filtered = allListings.filter(listing => 
            listing.title.toLowerCase().includes(searchTerm) ||
            listing.description.toLowerCase().includes(searchTerm)
        );

        switch (sortOrder) {
            case 'price-low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => b.createdAt - a.createdAt);
                break;
        }
        
        this.renderListings('all-listings', filtered);
    },

    renderListings: function(containerId, listings) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (listings.length === 0) {
            container.innerHTML = '<p class="empty-state">No listings found.</p>';
            return;
        }

        container.innerHTML = listings.map(listing => `
            <div class="listing-card" onclick="showListingDetail('${listing.id}')">
                <div class="listing-image-wrapper">
                    <img src="${listing.imageBase64 || 'logo.svg'}" alt="${listing.title}" class="listing-image">
                </div>
                <div class="listing-content">
                    <h3 class="listing-title">${listing.title}</h3>
                    <p class="listing-description-short">${listing.description}</p>
                    <div class="listing-footer">
                        <span class="listing-price">₹${parseInt(listing.price).toLocaleString('en-IN')}</span>
                        <button class="btn-view">View Details</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
};





// ============================================================
// FORM HANDLING & AUTHENTICATION
// ============================================================
let currentUserType = 'user'; // 'user', 'seller', or 'developer'

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.style.display = message ? 'block' : 'none';
}

function switchLoginTab(tabName) {
    currentUserType = tabName;
    const tabs = document.querySelectorAll('#page-login .form-tabs .tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector(`#page-login .form-tabs .tab[onclick*="'${tabName}'"]`).classList.add('active');
    
    // Adapt form for developer login
    const emailLabel = document.getElementById('login-email-label');
    if (tabName === 'developer') {
        emailLabel.textContent = 'Developer ID';
    } else {
        emailLabel.textContent = 'Email';
    }
    showError('login-error', '');
}

function switchSignupTab(tabName) {
    currentUserType = tabName;
    const tabs = document.querySelectorAll('#page-signup .form-tabs .tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector(`#page-signup .form-tabs .tab[onclick*="'${tabName}'"]`).classList.add('active');
    showError('signup-error', '');
}

async function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
    const password = document.getElementById('signup-password').value;
    const role = currentUserType === 'seller' ? 'seller' : 'user';

    showError('signup-error', '');

    try {
        if (role === 'seller') {
            // Per README, sellers must be pre-approved.
            const approvedSnapshot = await database.ref(`approvedEmails/${btoa(email)}`).once('value');
            if (!approvedSnapshot.exists()) {
                throw new Error("This email is not approved for seller registration. Please apply and wait for approval first.");
            }
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const newUser = {
            name: name,
            email: email,
            phone: phone,
            role: role,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        await database.ref('users/' + user.uid).set(newUser);
        console.log('User created and data saved to database.');
        showPage('dashboard'); // Redirect to dashboard after signup

    } catch (error) {
        console.error('Signup Error:', error);
        showError('signup-error', error.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    showError('login-error', '');

    try {
        // Handle special developer login
        if (currentUserType === 'developer') {
            if (email === 'master-dev@pravi.internal' && password === 'Pravi@1222') {
                // Attempt to sign in, but also check if the account exists
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                } catch (error) {
                    if (error.code === 'auth/user-not-found') {
                        // Create the admin account on first login, as per README
                        const cred = await auth.createUserWithEmailAndPassword(email, password);
                        await database.ref('users/' + cred.user.uid).set({
                            name: 'Master Developer',
                            email: email,
                            role: 'admin',
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        });
                        console.log('Admin account created.');
                    } else {
                        throw error; // Re-throw other sign-in errors
                    }
                }
            } else {
                throw new Error('Invalid Developer ID or Password.');
            }
        } else {
            // Regular user/seller login
            await auth.signInWithEmailAndPassword(email, password);
        }

        // Auth state listener will handle UI changes and redirection
        console.log('Login successful');

    } catch (error) {
        console.error('Login Error:', error);
        showError('login-error', error.message);
    }
}


function logout() {
    auth.signOut().then(() => {
        console.log('User signed out successfully.');
        showPage('home');
    });
}

async function handleSellerApplication(event) {
    event.preventDefault();
    if (!currentUser.isLoggedIn) {
        showError('apply-error', 'You must be logged in to apply.');
        return;
    }

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    showError('apply-error', '');
    document.getElementById('apply-success').textContent = '';

    try {
        const email = document.getElementById('apply-email').value;

        // Prevent duplicate applications
        const emailCheck = await database.ref(`applicantEmails/${btoa(email)}`).once('value');
        if (emailCheck.exists()) {
            throw new Error('An application with this email already exists.');
        }

        const aadhaarFile = document.getElementById('apply-aadhaar').files[0];
        const panFile = document.getElementById('apply-pan').files[0];

        if (!aadhaarFile || !panFile) {
            throw new Error('Both Aadhaar and PAN card files are required.');
        }

        // Convert files to Base64
        const aadhaarData = await fileToBase64(aadhaarFile);
        const panData = await fileToBase64(panFile);

        const application = {
            applicantId: currentUser.uid,
            name: document.getElementById('apply-name').value,
            email: email,
            phone: document.getElementById('apply-phone').value,
            bankAccount: document.getElementById('apply-bank-account').value,
            ifscCode: document.getElementById('apply-ifsc-code').value,
            holderName: document.getElementById('apply-holder-name').value,
            aadhaarData: aadhaarData,
            panData: panData,
            status: 'pending',
            appliedAt: firebase.database.ServerValue.TIMESTAMP
        };

        const newAppRef = database.ref('applications').push();
        await newAppRef.set(application);
        await database.ref(`applicantEmails/${btoa(email)}`).set(true);

        document.getElementById('apply-success').textContent = 'Application submitted successfully! You will be notified upon approval.';
        form.reset();

    } catch (error) {
        console.error('Seller Application Error:', error);
        showError('apply-error', error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function renderAdminDashboard() {
    const appsContainer = document.getElementById('developer-applications');
    const listingsContainer = document.getElementById('developer-listings-manage');
    appsContainer.innerHTML = '<p class="loading">Loading applications...</p>';
    listingsContainer.innerHTML = '<p class="loading">Loading listings...</p>';

    // Render Listings for Admin
    if (allListings.length > 0) {
        listingsContainer.innerHTML = allListings.map(l => `
            <div class="listing-card-manage">
                <img src="${l.imageBase64 || 'logo.svg'}" alt="${l.title}" class="manage-card-image">
                <div class="manage-card-content">
                    <h4>${l.title}</h4>
                    <p>Price: ₹${parseInt(l.price).toLocaleString('en-IN')}</p>
                </div>
                <div class="manage-card-actions">
                    <button class="btn-danger" onclick="deleteListingAsAdmin('${l.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } else {
        listingsContainer.innerHTML = '<p class="empty-state">No listings on the platform yet.</p>';
    }

    // Fetch and Render Applications
    try {
        const snapshot = await database.ref('applications').orderByChild('status').equalTo('pending').once('value');
        const apps = snapshot.val();
        if (apps) {
            appsContainer.innerHTML = Object.keys(apps).map(appId => {
                const app = apps[appId];
                return `
                    <div class="application-card">
                        <div class="application-info">
                            <h4>${app.name}</h4>
                            <p>${app.email} | ${app.phone}</p>
                        </div>
                        <div class="application-docs">
                            <a href="${app.aadhaarData}" target="_blank" class="document-link">View Aadhaar</a>
                            <a href="${app.panData}" target="_blank" class="document-link">View PAN</a>
                        </div>
                        <div class="application-actions">
                            <button class="btn-primary" onclick="approveApplication('${appId}', '${app.email}')">Approve</button>
                            <button class="btn-secondary" onclick="rejectApplication('${appId}')">Reject</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            appsContainer.innerHTML = '<p class="empty-state">No pending applications.</p>';
        }
    } catch (error) {
        console.error("Error fetching applications:", error);
        appsContainer.innerHTML = '<p class="error-message" style="display:block;">Could not load applications.</p>';
    }
}



async function handleListingSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    showError('listing-error', '');

    try {
        const editId = document.getElementById('edit-listing-id').value;
        const imageFile = document.getElementById('listing-image').files[0];
        
        let imageBase64 = null;
        if (imageFile) {
            imageBase64 = await fileToBase64(imageFile);
        }

        const listingData = {
            title: document.getElementById('listing-title').value,
            description: document.getElementById('listing-description').value,
            price: parseFloat(document.getElementById('listing-price').value),
            websiteURL: document.getElementById('listing-url').value,
            contactEmail: document.getElementById('listing-email').value,
            contactPhone: document.getElementById('listing-phone').value,
            userId: currentUser.uid,
        };

        if (editId) {
            // Editing existing listing
            const ref = database.ref(`listings/${editId}`);
            if (imageBase64) {
                listingData.imageBase64 = imageBase64;
            }
            listingData.updatedAt = firebase.database.ServerValue.TIMESTAMP;
            await ref.update(listingData);
        } else {
            // Creating new listing
            listingData.createdAt = firebase.database.ServerValue.TIMESTAMP;
            if (imageBase64) {
                listingData.imageBase64 = imageBase64;
            } else {
                throw new Error("An image is required for a new listing.");
            }
            await database.ref('listings').push(listingData);
        }

        cancelListingForm();
        await listingsApi.fetch(); // Refresh all listings data
        renderSellerDashboard(); // Refresh seller dashboard view

    } catch (error) {
        console.error("Listing submission error:", error);
        showError('listing-error', error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Listing';
    }
}

function editListing(listingId) {
    const listing = allListings.find(l => l.id === listingId && l.userId === currentUser.uid);
    if (!listing) {
        console.error("Listing not found or you do not have permission to edit it.");
        return;
    }
    
    showCreateListing(); // Show the form
    document.getElementById('listing-form-title').textContent = 'Edit Listing';
    
    document.getElementById('edit-listing-id').value = listing.id;
    document.getElementById('listing-title').value = listing.title;
    document.getElementById('listing-description').value = listing.description;
    document.getElementById('listing-price').value = listing.price;
    document.getElementById('listing-url').value = listing.websiteURL;
    document.getElementById('listing-email').value = listing.contactEmail;
    document.getElementById('listing-phone').value = listing.contactPhone;
    
    // Note: Image field is not pre-filled for security reasons. User must re-upload if they want to change it.
}

async function deleteListing(listingId) {
    const listing = allListings.find(l => l.id === listingId && l.userId === currentUser.uid);
    if (!listing) {
        console.error("Listing not found or you do not have permission to delete it.");
        return;
    }

    if (confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
        try {
            await database.ref(`listings/${listingId}`).remove();
            console.log(`Listing ${listingId} deleted by owner.`);
            await listingsApi.fetch(); // Refresh all listings data
            renderSellerDashboard(); // Refresh the view
        } catch (error) {
            console.error("Error deleting listing:", error);
        }
    }
}

async function renderUserDashboard() {
    const inquiriesContainer = document.getElementById('user-inquiries');
    inquiriesContainer.innerHTML = '<p class="loading">Loading your inquiries...</p>';

    try {
        const inquiriesSnapshot = await database.ref('inquiries').orderByChild('buyerId').equalTo(currentUser.uid).once('value');
        const inquiriesData = inquiriesSnapshot.val() || {};
        const inquiries = Object.values(inquiriesData);

        if (inquiries.length > 0) {
            inquiriesContainer.innerHTML = inquiries.sort((a, b) => b.createdAt - a.createdAt).map(i => `
                <div class="inquiry-card reveal-on-scroll">
                    <div class="inquiry-header">
                        <span class="inquiry-listing-title">Inquiry for: ${i.listingTitle}</span>
                        <span class="inquiry-date">${new Date(i.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p class="inquiry-message">Your message: "${i.message}"</p>
                </div>
            `).join('');
        } else {
            inquiriesContainer.innerHTML = '<p class="empty-state">You have not sent any inquiries yet.</p>';
        }
    } catch (error) {
        console.error("Error fetching your inquiries:", error);
        inquiriesContainer.innerHTML = '<p class="error-message" style="display:block;">Could not load your inquiries.</p>';
    }
}

async function approveApplication(appId, email) {
    try {
        await database.ref(`applications/${appId}/status`).set('approved');
        await database.ref(`approvedEmails/${btoa(email)}`).set(true);
        console.log(`Application ${appId} approved.`);
        renderAdminDashboard(); // Refresh the view
    } catch (error) {
        console.error("Error approving application:", error);
    }
}

async function rejectApplication(appId) {
    try {
        await database.ref(`applications/${appId}/status`).set('rejected');
        console.log(`Application ${appId} rejected.`);
        renderAdminDashboard(); // Refresh the view
    } catch (error) {
        console.error("Error rejecting application:", error);
    }
}

async function deleteListingAsAdmin(listingId) {
    if (confirm('Are you sure you want to permanently delete this listing from the platform?')) {
        try {
            await database.ref(`listings/${listingId}`).remove();
            console.log(`Listing ${listingId} deleted by admin.`);
            await listingsApi.fetch(); // Refetch all listings data
            renderAdminDashboard(); 
        } catch (error) {
            console.error("Error deleting listing:", error);
        }
    }
}


// ============================================================
// FINAL DASHBOARD & INQUIRY LOGIC (OVERRIDE)
// ============================================================
async function renderSellerDashboard() {
    const listingsContainer = document.getElementById('seller-listings');
    const inquiriesContainer = document.getElementById('seller-inquiries');
    listingsContainer.innerHTML = '<p class="loading">Loading your listings...</p>';
    inquiriesContainer.innerHTML = '<p class="loading">Loading inquiries...</p>';

    // Fetch and render seller's listings
    try {
        const snapshot = await database.ref('listings').orderByChild('userId').equalTo(currentUser.uid).once('value');
        const listingsData = snapshot.val() || {};
        const listings = Object.keys(listingsData).map(id => ({ id, ...listingsData[id] }));
        
        if (listings.length > 0) {
            listingsContainer.innerHTML = listings.sort((a,b) => b.createdAt - a.createdAt).map(l => `
                <div class="listing-card-manage">
                    <img src="${l.imageBase64 || 'logo.svg'}" alt="${l.title}" class="manage-card-image">
                    <div class="manage-card-content">
                        <h4>${l.title}</h4>
                        <p>Price: ₹${parseInt(l.price).toLocaleString('en-IN')}</p>
                    </div>
                    <div class="manage-card-actions">
                        <button class="btn-secondary" onclick="editListing('${l.id}')">Edit</button>
                        <button class="btn-danger" onclick="deleteListing('${l.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        } else {
            listingsContainer.innerHTML = '<p class="empty-state">You have not created any listings yet.</p>';
        }
    } catch (error) {
        console.error("Error fetching seller listings:", error);
        listingsContainer.innerHTML = '<p class="error-message" style="display:block;">Could not load your listings.</p>';
    }
    
    // Fetch and render inquiries for this seller
    try {
        const inquiriesSnapshot = await database.ref('inquiries').orderByChild('sellerId').equalTo(currentUser.uid).once('value');
        const inquiriesData = inquiriesSnapshot.val() || {};
        const inquiries = Object.values(inquiriesData);

        if (inquiries.length > 0) {
            inquiriesContainer.innerHTML = inquiries.sort((a,b) => b.createdAt - a.createdAt).map(i => `
                <div class="inquiry-card">
                    <div class="inquiry-header">
                        <span class="inquiry-listing-title">Regarding: ${i.listingTitle}</span>
                        <span class="inquiry-date">${new Date(i.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="inquiry-user">
                        From: ${i.buyerName} (${i.buyerEmail})
                    </div>
                    <p class="inquiry-message">"${i.message}"</p>
                </div>
            `).join('');
        } else {
            inquiriesContainer.innerHTML = '<p class="empty-state">You have not received any inquiries yet.</p>';
        }
    } catch (error) {
        console.error("Error fetching inquiries:", error);
        inquiriesContainer.innerHTML = '<p class="error-message" style="display:block;">Could not load inquiries.</p>';
    }
}






// ============================================================
// CART & CHECKOUT LOGIC (OVERRIDE & ADDITION)
// ============================================================

const cart = {
    KEY: 'pravi_cart',
    items: [],

    init: function() {
        const storedCart = localStorage.getItem(this.KEY);
        this.items = storedCart ? JSON.parse(storedCart) : [];
        this.updateCount();
    },

    add: function(listingId) {
        if (!this.items.includes(listingId)) {
            this.items.push(listingId);
            this.save();
            alert('Item added to cart!');
        } else {
            alert('Item is already in your cart.');
        }
    },

    remove: function(listingId) {
        this.items = this.items.filter(id => id !== listingId);
        this.save();
        renderCartPage(); // Re-render the cart page
    },

    get: function() {
        return this.items;
    },

    save: function() {
        localStorage.setItem(this.KEY, JSON.stringify(this.items));
        this.updateCount();
    },

    clear: function() {
        this.items = [];
        this.save();
    },

    updateCount: function() {
        const countEl = document.getElementById('cart-item-count');
        if (countEl) {
            countEl.textContent = this.items.length;
            countEl.style.display = this.items.length > 0 ? 'inline-block' : 'none';
        }
    }
};

// Override showListingDetail to include Add to Cart button
function showListingDetail(listingId) {
    const listing = allListings.find(l => l.id === listingId);
    if (!listing) {
        console.error(`Listing with ID ${listingId} not found.`);
        showPage('listings');
        return;
    }

    const detailContent = document.getElementById('listing-detail-content');
    
    let actionButtonsHtml = '';
    if (currentUser.isLoggedIn && currentUser.uid === listing.userId) {
        actionButtonsHtml = '<p>This is your own listing. You can manage it from your dashboard.</p>';
    } else {
        actionButtonsHtml = `
            <button class="btn-primary btn-large" onclick="cart.add('${listing.id}')">Add to Cart</button>
            <button class="btn-secondary btn-large" onclick="buyNow('${listing.id}')">Buy Now</button>
        `;
    }

    const inquiryFormHtml = `
        <div class="inquiry-form">
            <h3>Contact Seller</h3>
            ${
                currentUser.isLoggedIn 
                ? (currentUser.uid === listing.userId 
                    ? '' // No inquiry form for own listing
                    : `<form onsubmit="handleInquiry(event, '${listing.id}', '${listing.userId}')">
                           <div class="form-group">
                               <label for="inquiry-message">Your Message</label>
                               <textarea id="inquiry-message" required rows="4"></textarea>
                           </div>
                           <div id="inquiry-error" class="error-message"></div>
                           <button type="submit" class="btn-primary">Send Inquiry</button>
                       </form>`)
                : '<p class="auth-prompt">Please <a href="#" onclick="showPage(\'login\')">login</a> to contact the seller.</p>'
            }
        </div>
    `;

    detailContent.innerHTML = `
        <div class="listing-detail">
            <img src="${listing.imageBase64 || 'logo.svg'}" alt="${listing.title}" class="listing-detail-image">
            <div class="listing-detail-body">
                <h2 class="listing-detail-title">${listing.title}</h2>
                <p class="listing-detail-price">₹${parseInt(listing.price).toLocaleString('en-IN')}</p>
                <div class="listing-actions" style="margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                    ${actionButtonsHtml}
                </div>
                <div class="listing-meta" style="margin-top: 2rem;">
                    <div class="meta-item"><span>Seller Contact</span><a href="mailto:${listing.contactEmail}">${listing.contactEmail}</a></div>
                    <div class="meta-item"><span>Live Demo</span><a href="${listing.websiteURL}" target="_blank" rel="noopener noreferrer">View Live Site</a></div>
                </div>
                <p class="listing-detail-description">${listing.description.replace(/\n/g, '<br>')}</p>
                ${inquiryFormHtml}
            </div>
        </div>
    `;
    
    showPage('listing-detail');
}


function renderCartPage() {
    const container = document.getElementById('cart-items-container');
    const summaryTotalEl = document.getElementById('cart-total');
    const cartIds = cart.get();
    
    if (cartIds.length === 0) {
        container.innerHTML = '<p class="empty-state">Your cart is empty.</p>';
        summaryTotalEl.textContent = '₹0';
        return;
    }

    const cartItems = allListings.filter(l => cartIds.includes(l.id));
    
    container.innerHTML = cartItems.map(item => `
        <div class="listing-card-manage">
            <img src="${item.imageBase64 || 'logo.svg'}" alt="${item.title}" class="manage-card-image">
            <div class="manage-card-content">
                <h4>${item.title}</h4>
                <p>₹${parseInt(item.price).toLocaleString('en-IN')}</p>
            </div>
            <div class="manage-card-actions">
                <button class="btn-danger" onclick="cart.remove('${item.id}')">Remove</button>
            </div>
        </div>
    `).join('');

    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    summaryTotalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
}

let checkoutState = {
    subtotal: 0,
    gst: 0,
    discount: 0,
    total: 0
};

function goToCheckout() {
    const cartIds = cart.get();
    const cartItems = allListings.filter(l => cartIds.includes(l.id));
    
    if (cartItems.length === 0) {
        alert("Your cart is empty. Add items before checking out.");
        showPage('listings');
        return;
    }

    checkoutState.subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
    checkoutState.gst = checkoutState.subtotal * 0.18;
    checkoutState.discount = 0;
    
    updateCheckoutSummary();
    
    const summaryContainer = document.getElementById('checkout-item-summary');
    summaryContainer.innerHTML = cartItems.map(item => `
        <div class="listing-card-manage">
            <img src="${item.imageBase64 || 'logo.svg'}" alt="${item.title}" class="manage-card-image">
            <div class="manage-card-content">
                <h4>${item.title}</h4>
                <p>₹${parseInt(item.price).toLocaleString('en-IN')}</p>
            </div>
        </div>
    `).join('');

    showPage('checkout');

    document.getElementById('apply-coupon-btn')?.addEventListener('click', () => {
        const couponInput = document.getElementById('coupon-code');
        const messageEl = document.getElementById('coupon-message');
        if (couponInput.value.trim().toUpperCase() === 'PRAVI10') {
            checkoutState.discount = checkoutState.subtotal * 0.10;
            messageEl.textContent = 'Coupon applied successfully! You got a 10% discount.';
            messageEl.style.color = 'var(--accent-color)';
        } else {
            checkoutState.discount = 0;
            messageEl.textContent = 'Invalid coupon code.';
            messageEl.style.color = '#ef4444';
        }
        updateCheckoutSummary();
    });
}

async function createOrder() {
    if (!currentUser.isLoggedIn) {
        alert('Please login to place an order.');
        showPage('login');
        return;
    }

    const cartIds = cart.get();
    const cartItems = allListings.filter(l => cartIds.includes(l.id));

    if (cartItems.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const order = {
        userId: currentUser.uid,
        items: cartItems.map(item => ({ id: item.id, title: item.title, price: item.price })),
        total: checkoutState.total,
        status: 'pending',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        const orderRef = await database.ref('orders').push(order);
        console.log('Order created with ID:', orderRef.key);
        cart.clear();
        
        const upiBtn = document.getElementById('pay-upi-btn');
        window.location.href = upiBtn.href;

        showPage('user-dashboard');
        renderUserOrders();

    } catch (error) {
        console.error("Error creating order:", error);
        alert("There was an error placing your order. Please try again.");
    }
}

function updateCheckoutSummary() {
    checkoutState.total = checkoutState.subtotal + checkoutState.gst - checkoutState.discount;

    document.getElementById('checkout-subtotal').textContent = `₹${checkoutState.subtotal.toLocaleString('en-IN')}`;
    document.getElementById('checkout-gst').textContent = `₹${checkoutState.gst.toLocaleString('en-IN')}`;
    document.querySelector('.coupon-row').style.display = checkoutState.discount > 0 ? 'flex' : 'none';
    document.getElementById('checkout-discount').textContent = `-₹${checkoutState.discount.toLocaleString('en-IN')}`;
    document.getElementById('checkout-total').textContent = `₹${checkoutState.total.toLocaleString('en-IN')}`;
    
    const upiBtn = document.getElementById('pay-upi-btn');
    const upiId = '6200892887@ybl'; 
    const upiName = 'Pravi Marketplace';
    upiBtn.href = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${checkoutState.total.toFixed(2)}&cu=INR&tn=Payment for Pravi Marketplace`;
    
    upiBtn.onclick = (e) => {
        e.preventDefault();
        createOrder();
    };
}

document.getElementById('apply-coupon-btn')?.addEventListener('click', () => {
    const couponInput = document.getElementById('coupon-code');
    const messageEl = document.getElementById('coupon-message');
    if (couponInput.value.trim().toUpperCase() === 'PRAVI10') {
        checkoutState.discount = checkoutState.subtotal * 0.10;
        messageEl.textContent = 'Coupon applied successfully! You got a 10% discount.';
        messageEl.style.color = 'var(--accent-color)';
    } else {
        checkoutState.discount = 0;
        messageEl.textContent = 'Invalid coupon code.';
        messageEl.style.color = '#ef4444';
    }
    updateCheckoutSummary();
});

// Update showPage to render cart
async function renderUserOrders() {
    const ordersContainer = document.getElementById('user-orders');
    ordersContainer.innerHTML = '<p class="loading">Loading your orders...</p>';

    try {
        const snapshot = await database.ref('orders').orderByChild('userId').equalTo(currentUser.uid).once('value');
        const ordersData = snapshot.val() || {};
        const orders = Object.keys(ordersData).map(id => ({ id, ...ordersData[id] }));

        if (orders.length > 0) {
            ordersContainer.innerHTML = orders.sort((a, b) => b.createdAt - a.createdAt).map(order => `
                <div class="order-card reveal-on-scroll">
                    <div class="order-header">
                        <span>Order ID: ${order.id}</span>
                        <span class="status-${order.status}">${order.status}</span>
                    </div>
                    <div class="order-body">
                        <p><strong>Total:</strong> ₹${order.total.toLocaleString('en-IN')}</p>
                        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                        <ul>
                            ${order.items.map(item => `<li>${item.title}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `).join('');
        } else {
            ordersContainer.innerHTML = '<p class="empty-state">You have no orders yet.</p>';
        }
    } catch (error) {
        console.error("Error fetching user orders:", error);
        ordersContainer.innerHTML = '<p class="error-message" style="display:block;">Could not load your orders.</p>';
    }
}

async function renderAllOrders() {
    const ordersContainer = document.getElementById('developer-orders');
    ordersContainer.innerHTML = '<p class="loading">Loading all orders...</p>';

    try {
        const snapshot = await database.ref('orders').once('value');
        const ordersData = snapshot.val() || {};
        const orders = Object.keys(ordersData).map(id => ({ id, ...ordersData[id] }));

        if (orders.length > 0) {
            ordersContainer.innerHTML = orders.sort((a, b) => b.createdAt - a.createdAt).map(order => `
                <div class="order-card reveal-on-scroll">
                    <div class="order-header">
                        <span>Order ID: ${order.id}</span>
                        <span class="status-${order.status}">${order.status}</span>
                    </div>
                    <div class="order-body">
                        <p><strong>User ID:</strong> ${order.userId}</p>
                        <p><strong>Total:</strong> ₹${order.total.toLocaleString('en-IN')}</p>
                        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                        <ul>
                            ${order.items.map(item => `<li>${item.title}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="order-actions">
                        ${order.status === 'pending' ? `<button class="btn-primary" onclick="updateOrderStatus('${order.id}', 'completed')">Mark as Completed</button>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            ordersContainer.innerHTML = '<p class="empty-state">No orders have been placed yet.</p>';
        }
    } catch (error) {
        console.error("Error fetching all orders:", error);
        ordersContainer.innerHTML = '<p class="error-message" style="display:block;">Could not load orders.</p>';
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await database.ref(`orders/${orderId}/status`).set(newStatus);
        console.log(`Order ${orderId} status updated to ${newStatus}`);
        renderAllOrders();
    } catch (error) {
        console.error("Error updating order status:", error);
        alert("There was an error updating the order status.");
    }
}

function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    const newPage = document.getElementById(`page-${pageId}`);
    if (newPage) {
        newPage.classList.add('active');
        currentPage = pageId;
        window.scrollTo(0, 0);

        if (currentUser.isLoggedIn) {
             switch (pageId) {
                case 'developer-dashboard': 
                    if (currentUser.role === 'admin') {
                        renderAdminDashboard();
                        renderAllOrders();
                    }
                    break;
                case 'seller-dashboard': 
                    if (currentUser.role === 'seller') renderSellerDashboard(); 
                    break;
                case 'user-dashboard': 
                    if (currentUser.role === 'user') {
                        renderUserDashboard();
                        renderUserOrders();
                    }
                    break;
            }
        }
        if (pageId === 'cart') {
            renderCartPage();
        }
    } else {
        console.error(`Page with ID 'page-${pageId}' not found.`);
        document.getElementById('page-home').classList.add('active');
        currentPage = 'home';
    }
    const nav = document.getElementById('main-nav');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (nav.classList.contains('mobile-active')) {
        nav.classList.remove('mobile-active');
        menuBtn.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

// Initialize cart on load






console.log('app.js loaded and initialized.');
