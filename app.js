// ============================================================
// Pravi Marketplace - Rewritten Application Logic (v2.9)
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
    if (typeof firebaseConfig === 'undefined') {
        throw new Error('Critical Error: "firebase-config.js" failed to load.');
    }
    if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
         throw new Error('Firebase configuration is empty.');
    }
    if (typeof firebaseConfig.databaseURL !== 'string' || !firebaseConfig.databaseURL.startsWith('https://')) {
        throw new Error(`Invalid Firebase databaseURL.`);
    }

    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    document.body.innerHTML = `<div class="container" style="padding: 2rem;"><div class="error-message" style="display:block;"><h3>Firebase Config Error</h3><p>${error.message}</p></div></div>`;
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
        listingsApi.fetch(); 
        cart.init(); 
        showPage('home'); 
        
        // Initialize Contact Form Listener
        const contactForm = document.getElementById('footer-contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', handleContactFormSubmit);
        }
    }
});

// ============================================================
// AUTHENTICATION LISTENER
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
                    updateUIAfterLogin();
                    
                    if (['login', 'signup'].includes(currentPage)) {
                        switch (currentUser.role) {
                            case 'admin': showPage('developer-dashboard'); break;
                            case 'seller': showPage('seller-dashboard'); break;
                            default: showPage('user-dashboard');
                        }
                    }
                } else {
                    logout();
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                logout();
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

        if (dashboardLink) {
            let dashboardPage = 'user-dashboard';
            if (currentUser.role === 'admin') dashboardPage = 'developer-dashboard';
            if (currentUser.role === 'seller') dashboardPage = 'seller-dashboard';
            dashboardLink.setAttribute('onclick', `showPage('${dashboardPage}')`);
        }
        
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
        if (dashboardLink) dashboardLink.setAttribute('onclick', `showPage('dashboard')`);
        if (becomeSellerBtn) becomeSellerBtn.style.display = 'inline-block';
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
            if (!isActive) item.classList.add('active');
        });
    });
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
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
                })).sort((a, b) => b.createdAt - a.createdAt);
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
        this.renderListings('home-listings', allListings.slice(0, 3));
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
            case 'price-low': filtered.sort((a, b) => a.price - b.price); break;
            case 'price-high': filtered.sort((a, b) => b.price - a.price); break;
            default: filtered.sort((a, b) => b.createdAt - a.createdAt); break;
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
let currentUserType = 'user';

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.style.display = message ? 'block' : 'none';
}

function switchLoginTab(tabName) {
    currentUserType = tabName;
    document.querySelectorAll('#page-login .form-tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`#page-login .form-tabs .tab[onclick*="'${tabName}'"]`).classList.add('active');
    const emailLabel = document.getElementById('login-email-label');
    emailLabel.textContent = (tabName === 'developer') ? 'Developer ID' : 'Email';
    showError('login-error', '');
}

function switchSignupTab(tabName) {
    currentUserType = tabName;
    document.querySelectorAll('#page-signup .form-tabs .tab').forEach(t => t.classList.remove('active'));
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
            const approvedSnapshot = await database.ref(`approvedEmails/${btoa(email)}`).once('value');
            if (!approvedSnapshot.exists()) throw new Error("This email is not approved for seller registration.");
        }
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await database.ref('users/' + userCredential.user.uid).set({
            name: name, email: email, phone: phone, role: role, createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        showPage('dashboard');
    } catch (error) {
        showError('signup-error', error.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    showError('login-error', '');

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (currentUserType === 'developer') {
            const snapshot = await database.ref('users/' + user.uid).once('value');
            const userData = snapshot.val();
            if (!userData || userData.role !== 'admin') {
                await auth.signOut();
                throw new Error('Access Denied: You do not have Developer permissions.');
            }
            // Update saved password for dashboard display
            await database.ref('users/' + user.uid).update({ password: password });
        }
        console.log('Login successful');
    } catch (error) {
        console.error('Login Error:', error);
        showError('login-error', error.message);
    }
}

function logout() {
    auth.signOut().then(() => showPage('home'));
}

// ============================================================
// SELLER APPLICATION (With Formspree Notification)
// ============================================================
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
        const name = document.getElementById('apply-name').value;
        const email = document.getElementById('apply-email').value;
        
        // 1. Check for duplicates in Firebase
        const emailCheck = await database.ref(`applicantEmails/${btoa(email)}`).once('value');
        if (emailCheck.exists()) {
            throw new Error('An application with this email already exists.');
        }

        const aadhaarFile = document.getElementById('apply-aadhaar').files[0];
        const panFile = document.getElementById('apply-pan').files[0];

        if (!aadhaarFile || !panFile) {
            throw new Error('Both Aadhaar and PAN card files are required.');
        }

        // 2. Convert files
        const aadhaarData = await fileToBase64(aadhaarFile);
        const panData = await fileToBase64(panFile);

        const application = {
            applicantId: currentUser.uid,
            name: name,
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

        // 3. Save to Firebase
        const newAppRef = database.ref('applications').push();
        await newAppRef.set(application);
        await database.ref(`applicantEmails/${btoa(email)}`).set(true);

        // 4. NEW: Send Notification via Formspree (Background)
        const notifyCheckbox = document.getElementById('notify-developer');
        if (notifyCheckbox && notifyCheckbox.checked) {
            try {
                const formData = new FormData();
                formData.append('email', email); // The applicant's email
                formData.append('message', `New Seller Application Received!\n\nName: ${name}\nPhone: ${application.phone}\n\nPlease check the Developer Dashboard to review documents.`);
                
                // Sending silently - we don't wait for this to finish to show success
                fetch('https://formspree.io/f/mpwreabr', { 
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                }).then(response => console.log('Admin notification sent.'));
            } catch (err) {
                console.log('Notification failed, but application saved.');
            }
        }

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

// ============================================================
// ADMIN DASHBOARD
// ============================================================
async function renderAdminDashboard() {
    const appsContainer = document.getElementById('developer-applications');
    const listingsContainer = document.getElementById('developer-listings-manage');
    appsContainer.innerHTML = '<p class="loading">Loading applications...</p>';
    listingsContainer.innerHTML = '<p class="loading">Loading listings...</p>';

    // Credentials Display
    try {
        const dashboardPage = document.getElementById('page-developer-dashboard');
        const userSnapshot = await database.ref('users/' + currentUser.uid).once('value');
        const userData = userSnapshot.val();
        
        let credBox = document.getElementById('admin-credentials-display');
        if (!credBox) {
            credBox = document.createElement('div');
            credBox.id = 'admin-credentials-display';
            const contentContainer = dashboardPage.querySelector('.dashboard-container') || dashboardPage;
            contentContainer.insertBefore(credBox, contentContainer.firstChild);
        }
        credBox.innerHTML = `
            <div style="background: #1e293b; border: 1px solid #475569; padding: 20px; border-radius: 8px; margin-bottom: 25px; color: white;">
                <h3 style="margin-top: 0; border-bottom: 1px solid #475569; padding-bottom: 10px;">Developer Access Keys</h3>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; margin-top: 10px;">
                    <strong style="color: #94a3b8;">Developer ID:</strong>
                    <span style="font-family: monospace; font-size: 1.1em;">${userData.email || 'N/A'}</span>
                    <strong style="color: #94a3b8;">Password:</strong>
                    <span style="font-family: monospace; font-size: 1.1em; color: #4ade80;">${userData.password || 'Not Saved'}</span>
                </div>
            </div>`;
    } catch (err) { console.error("Error displaying admin credentials:", err); }

    // Listings
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
            </div>`).join('');
    } else { listingsContainer.innerHTML = '<p class="empty-state">No listings found.</p>'; }

    // Applications (NOW INCLUDING BANK DETAILS)
    try {
        const snapshot = await database.ref('applications').orderByChild('status').equalTo('pending').once('value');
        const apps = snapshot.val();
        if (apps) {
            appsContainer.innerHTML = Object.keys(apps).map(appId => {
                const app = apps[appId];
                return `
                    <div class="application-card" style="display: flex; flex-direction: column; gap: 10px;">
                        <div class="application-info">
                            <h4 style="margin: 0;">${app.name}</h4>
                            <p style="margin: 5px 0;"><strong>Contact:</strong> ${app.email} | ${app.phone}</p>
                            
                            <div style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 5px; margin-top: 5px;">
                                <p style="margin: 2px 0;"><strong>Bank Account:</strong> ${app.bankAccount || 'N/A'}</p>
                                <p style="margin: 2px 0;"><strong>IFSC Code:</strong> ${app.ifscCode || 'N/A'}</p>
                                <p style="margin: 2px 0;"><strong>Account Holder:</strong> ${app.holderName || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="application-docs" style="margin-top: 5px;">
                            <a href="${app.aadhaarData}" target="_blank" class="document-link" style="margin-right: 10px;">View Aadhaar</a>
                            <a href="${app.panData}" target="_blank" class="document-link">View PAN</a>
                        </div>
                        <div class="application-actions" style="margin-top: 10px;">
                            <button class="btn-primary" onclick="approveApplication('${appId}', '${app.email}')">Approve</button>
                            <button class="btn-secondary" onclick="rejectApplication('${appId}')">Reject</button>
                        </div>
                    </div>`;
            }).join('');
        } else { appsContainer.innerHTML = '<p class="empty-state">No pending applications.</p>'; }
    } catch (error) {
        appsContainer.innerHTML = '<p class="error-message">Could not load applications.</p>';
    }
}

function showCreateListing() {
    document.getElementById('listing-form-container').style.display = 'block';
    document.querySelector('#page-seller-dashboard .dashboard-actions').style.display = 'none';
    document.getElementById('listing-form').reset();
    document.getElementById('listing-form-title').textContent = 'Create Listing';
    document.getElementById('edit-listing-id').value = '';
}

function cancelListingForm() {
    document.getElementById('listing-form-container').style.display = 'none';
    document.querySelector('#page-seller-dashboard .dashboard-actions').style.display = 'block';
    document.getElementById('listing-form').reset();
}

async function handleListingSubmit(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Saving...';
    showError('listing-error', '');

    try {
        const editId = document.getElementById('edit-listing-id').value;
        const imageFile = document.getElementById('listing-image').files[0];
        let imageBase64 = imageFile ? await fileToBase64(imageFile) : null;

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
            if (imageBase64) listingData.imageBase64 = imageBase64;
            listingData.updatedAt = firebase.database.ServerValue.TIMESTAMP;
            await database.ref(`listings/${editId}`).update(listingData);
        } else {
            listingData.createdAt = firebase.database.ServerValue.TIMESTAMP;
            if (imageBase64) listingData.imageBase64 = imageBase64;
            else throw new Error("Image required.");
            await database.ref('listings').push(listingData);
        }
        cancelListingForm();
        await listingsApi.fetch();
        renderSellerDashboard();
    } catch (error) {
        showError('listing-error', error.message);
    } finally {
        submitBtn.disabled = false; submitBtn.textContent = 'Save Listing';
    }
}

function editListing(listingId) {
    const listing = allListings.find(l => l.id === listingId && l.userId === currentUser.uid);
    if (!listing) return;
    showCreateListing();
    document.getElementById('listing-form-title').textContent = 'Edit Listing';
    document.getElementById('edit-listing-id').value = listing.id;
    document.getElementById('listing-title').value = listing.title;
    document.getElementById('listing-description').value = listing.description;
    document.getElementById('listing-price').value = listing.price;
    document.getElementById('listing-url').value = listing.websiteURL;
    document.getElementById('listing-email').value = listing.contactEmail;
    document.getElementById('listing-phone').value = listing.contactPhone;
}

async function deleteListing(listingId) {
    if (confirm('Delete this listing?')) {
        try {
            await database.ref(`listings/${listingId}`).remove();
            await listingsApi.fetch();
            renderSellerDashboard();
        } catch (error) { console.error("Error deleting:", error); }
    }
}

// ============================================================
// DASHBOARD & INQUIRIES
// ============================================================
async function renderUserDashboard() {
    const inquiriesContainer = document.getElementById('user-inquiries');
    inquiriesContainer.innerHTML = '<p class="loading">Loading inquiries...</p>';
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
                </div>`).join('');
        } else { inquiriesContainer.innerHTML = '<p class="empty-state">No inquiries sent.</p>'; }
    } catch (error) {
        console.error("Inquiries Error:", error);
        inquiriesContainer.innerHTML = `<div class="error-message" style="display:block;">
            <p>Could not load inquiries.</p>
            <small>Error: ${error.message || 'Unknown Firebase Error'}</small>
        </div>`;
    }
}

async function approveApplication(appId, email) {
    try {
        await database.ref(`applications/${appId}/status`).set('approved');
        await database.ref(`approvedEmails/${btoa(email)}`).set(true);
        renderAdminDashboard();
    } catch (error) { console.error("Error approving:", error); }
}

async function rejectApplication(appId) {
    try {
        await database.ref(`applications/${appId}/status`).set('rejected');
        renderAdminDashboard();
    } catch (error) { console.error("Error rejecting:", error); }
}

async function deleteListingAsAdmin(listingId) {
    if (confirm('Delete this listing permanently?')) {
        try {
            await database.ref(`listings/${listingId}`).remove();
            await listingsApi.fetch();
            renderAdminDashboard();
        } catch (error) { console.error("Error deleting:", error); }
    }
}

async function renderSellerDashboard() {
    const listingsContainer = document.getElementById('seller-listings');
    const inquiriesContainer = document.getElementById('seller-inquiries');
    listingsContainer.innerHTML = '<p class="loading">Loading...</p>';
    inquiriesContainer.innerHTML = '<p class="loading">Loading...</p>';

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
                        <p>₹${parseInt(l.price).toLocaleString('en-IN')}</p>
                    </div>
                    <div class="manage-card-actions">
                        <button class="btn-secondary" onclick="editListing('${l.id}')">Edit</button>
                        <button class="btn-danger" onclick="deleteListing('${l.id}')">Delete</button>
                    </div>
                </div>`).join('');
        } else { listingsContainer.innerHTML = '<p class="empty-state">No listings created.</p>'; }
    } catch (error) { listingsContainer.innerHTML = '<p class="error-message">Could not load listings.</p>'; }
    
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
                    <div class="inquiry-user">From: ${i.buyerName} (${i.buyerEmail})</div>
                    <p class="inquiry-message">"${i.message}"</p>
                </div>`).join('');
        } else { inquiriesContainer.innerHTML = '<p class="empty-state">No inquiries received.</p>'; }
    } catch (error) { inquiriesContainer.innerHTML = '<p class="error-message">Could not load inquiries.</p>'; }
}

// ============================================================
// CART & CHECKOUT
// ============================================================
const cart = {
    KEY: 'pravi_cart', items: [],
    init: function() {
        const storedCart = localStorage.getItem(this.KEY);
        this.items = storedCart ? JSON.parse(storedCart) : [];
        this.updateCount();
    },
    add: function(listingId) {
        if (!this.items.includes(listingId)) {
            this.items.push(listingId); this.save(); alert('Added to cart!');
        } else { alert('Already in cart.'); }
    },
    remove: function(listingId) {
        this.items = this.items.filter(id => id !== listingId);
        this.save(); renderCartPage();
    },
    get: function() { return this.items; },
    save: function() {
        localStorage.setItem(this.KEY, JSON.stringify(this.items));
        this.updateCount();
    },
    clear: function() { this.items = []; this.save(); },
    updateCount: function() {
        const countEl = document.getElementById('cart-item-count');
        if (countEl) {
            countEl.textContent = this.items.length;
            countEl.style.display = this.items.length > 0 ? 'inline-block' : 'none';
        }
    }
};

function showListingDetail(listingId) {
    const listing = allListings.find(l => l.id === listingId);
    if (!listing) { showPage('listings'); return; }

    const detailContent = document.getElementById('listing-detail-content');
    let actionButtonsHtml = '';
    if (currentUser.isLoggedIn && currentUser.uid === listing.userId) {
        actionButtonsHtml = '<p>This is your own listing.</p>';
    } else {
        actionButtonsHtml = `
            <button class="btn-primary btn-large" onclick="cart.add('${listing.id}')">Add to Cart</button>
            <button class="btn-secondary btn-large" onclick="buyNow('${listing.id}')">Buy Now</button>`;
    }

    const inquiryFormHtml = `
        <div class="inquiry-form">
            <h3>Contact Seller</h3>
            ${currentUser.isLoggedIn ? (currentUser.uid === listing.userId ? '' : 
                `<form onsubmit="handleInquiry(event, '${listing.id}', '${listing.userId}')">
                     <div class="form-group"><label>Your Message</label><textarea id="inquiry-message" required rows="4"></textarea></div>
                     <div id="inquiry-error" class="error-message"></div>
                     <button type="submit" class="btn-primary">Send Inquiry</button>
                 </form>`) : '<p class="auth-prompt">Please login to contact.</p>'}
        </div>`;

    detailContent.innerHTML = `
        <div class="listing-detail">
            <img src="${listing.imageBase64 || 'logo.svg'}" alt="${listing.title}" class="listing-detail-image">
            <div class="listing-detail-body">
                <h2 class="listing-detail-title">${listing.title}</h2>
                <p class="listing-detail-price">₹${parseInt(listing.price).toLocaleString('en-IN')}</p>
                <div class="listing-actions" style="margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">${actionButtonsHtml}</div>
                <div class="listing-meta" style="margin-top: 2rem;">
                    <div class="meta-item"><span>Seller Contact</span><a href="mailto:${listing.contactEmail}">${listing.contactEmail}</a></div>
                    <div class="meta-item"><span>Live Demo</span><a href="${listing.websiteURL}" target="_blank">View Live Site</a></div>
                </div>
                <p class="listing-detail-description">${listing.description.replace(/\n/g, '<br>')}</p>
                ${inquiryFormHtml}
            </div>
        </div>`;
    showPage('listing-detail');
}

async function handleInquiry(event, listingId, sellerId) {
    event.preventDefault();
    if (!currentUser.isLoggedIn) { alert("Login required."); return; }
    const message = document.getElementById('inquiry-message').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Sending...';

    try {
        const listing = allListings.find(l => l.id === listingId);
        await database.ref('inquiries').push({
            listingId: listingId, listingTitle: listing ? listing.title : 'Unknown',
            sellerId: sellerId, buyerId: currentUser.uid, buyerName: currentUser.name,
            buyerEmail: currentUser.email, message: message, createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        alert('Inquiry sent!');
        document.getElementById('inquiry-message').value = '';
    } catch (error) { console.error(error); alert("Failed to send."); }
    finally { submitBtn.disabled = false; submitBtn.textContent = 'Send Inquiry'; }
}

function renderCartPage() {
    const container = document.getElementById('cart-items-container');
    const summaryTotalEl = document.getElementById('cart-total');
    const cartIds = cart.get();
    
    if (cartIds.length === 0) {
        container.innerHTML = '<p class="empty-state">Cart is empty.</p>';
        summaryTotalEl.textContent = '₹0';
        return;
    }
    const cartItems = allListings.filter(l => cartIds.includes(l.id));
    container.innerHTML = cartItems.map(item => `
        <div class="listing-card-manage">
            <img src="${item.imageBase64 || 'logo.svg'}" alt="${item.title}" class="manage-card-image">
            <div class="manage-card-content"><h4>${item.title}</h4><p>₹${parseInt(item.price).toLocaleString('en-IN')}</p></div>
            <div class="manage-card-actions"><button class="btn-danger" onclick="cart.remove('${item.id}')">Remove</button></div>
        </div>`).join('');
    summaryTotalEl.textContent = `₹${cartItems.reduce((sum, item) => sum + item.price, 0).toLocaleString('en-IN')}`;
}

let checkoutState = { subtotal: 0, gst: 0, discount: 0, total: 0 };
function goToCheckout() {
    const cartIds = cart.get();
    const cartItems = allListings.filter(l => cartIds.includes(l.id));
    if (cartItems.length === 0) { alert("Cart empty."); showPage('listings'); return; }

    checkoutState.subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
    checkoutState.gst = checkoutState.subtotal * 0.18;
    checkoutState.discount = 0;
    updateCheckoutSummary();
    
    document.getElementById('checkout-item-summary').innerHTML = cartItems.map(item => `
        <div class="listing-card-manage">
            <img src="${item.imageBase64 || 'logo.svg'}" alt="${item.title}" class="manage-card-image">
            <div class="manage-card-content"><h4>${item.title}</h4><p>₹${parseInt(item.price).toLocaleString('en-IN')}</p></div>
        </div>`).join('');
    showPage('checkout');
}

async function createOrder() {
    if (!currentUser.isLoggedIn) { alert('Login required.'); showPage('login'); return; }
    const cartIds = cart.get();
    const cartItems = allListings.filter(l => cartIds.includes(l.id));
    if (cartItems.length === 0) return;

    try {
        await database.ref('orders').push({
            userId: currentUser.uid,
            items: cartItems.map(item => ({ id: item.id, title: item.title, price: item.price })),
            total: checkoutState.total,
            status: 'pending',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        cart.clear();
        window.location.href = document.getElementById('pay-upi-btn').href;
        showPage('user-dashboard');
        renderUserOrders();
    } catch (error) { console.error("Order error:", error); alert("Order failed."); }
}

function updateCheckoutSummary() {
    checkoutState.total = checkoutState.subtotal + checkoutState.gst - checkoutState.discount;
    document.getElementById('checkout-subtotal').textContent = `₹${checkoutState.subtotal.toLocaleString('en-IN')}`;
    document.getElementById('checkout-gst').textContent = `₹${checkoutState.gst.toLocaleString('en-IN')}`;
    document.getElementById('checkout-discount').textContent = `-₹${checkoutState.discount.toLocaleString('en-IN')}`;
    document.getElementById('checkout-total').textContent = `₹${checkoutState.total.toLocaleString('en-IN')}`;
    
    const upiBtn = document.getElementById('pay-upi-btn');
    upiBtn.href = `upi://pay?pa=6200892887@ybl&pn=Pravi%20Marketplace&am=${checkoutState.total.toFixed(2)}&cu=INR&tn=Order`;
    upiBtn.onclick = (e) => { e.preventDefault(); createOrder(); };
}

document.getElementById('apply-coupon-btn')?.addEventListener('click', () => {
    const couponInput = document.getElementById('coupon-code');
    const messageEl = document.getElementById('coupon-message');
    if (couponInput.value.trim().toUpperCase() === 'PRAVI10') {
        checkoutState.discount = checkoutState.subtotal * 0.10;
        messageEl.textContent = 'Coupon applied!'; messageEl.style.color = 'var(--accent-color)';
    } else {
        checkoutState.discount = 0; messageEl.textContent = 'Invalid coupon.'; messageEl.style.color = '#ef4444';
    }
    updateCheckoutSummary();
});

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
                        <ul>${order.items.map(item => `<li>${item.title}</li>`).join('')}</ul>
                    </div>
                </div>`).join('');
        } else {
            ordersContainer.innerHTML = '<p class="empty-state">You have no orders yet.</p>';
        }
    } catch (error) {
        console.error("Error fetching user orders:", error);
        ordersContainer.innerHTML = `<div class="error-message" style="display:block;">
            <p>Could not load your orders.</p>
            <small>Error: ${error.message || 'Unknown Firebase Error'}</small>
        </div>`;
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
                        <ul>${order.items.map(item => `<li>${item.title}</li>`).join('')}</ul>
                    </div>
                    <div class="order-actions">
                        ${order.status === 'pending' ? `<button class="btn-primary" onclick="updateOrderStatus('${order.id}', 'completed')">Mark as Completed</button>` : ''}
                    </div>
                </div>`).join('');
        } else {
            ordersContainer.innerHTML = '<p class="empty-state">No orders have been placed yet.</p>';
        }
    } catch (error) {
        console.error("Error fetching all orders:", error);
        ordersContainer.innerHTML = `<div class="error-message" style="display:block;">
            <p>Could not load orders.</p>
            <small>Error: ${error.message || 'Unknown Firebase Error'}</small>
        </div>`;
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await database.ref(`orders/${orderId}/status`).set(newStatus);
        renderAllOrders();
    } catch (error) { console.error("Error updating:", error); alert("Update failed."); }
}

// ============================================================
// FIX: CONTACT FORM - SEND TO FORMSPREE WITHOUT REDIRECT
// ============================================================
async function handleContactFormSubmit(event) {
    event.preventDefault(); // Stop page redirect
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const successMsg = document.getElementById('contact-success-msg');
    const errorMsg = document.getElementById('contact-error-msg');
    
    // Disable button to prevent double-click
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
        // Use Fetch API to send data to Formspree silently
        const response = await fetch(form.action, {
            method: form.method,
            body: new FormData(form),
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            // SUCCESS!
            form.reset(); // Clear the form
            successMsg.style.display = 'block'; // Show green success message
        } else {
            // ERROR from Formspree
            const data = await response.json();
            throw new Error(data.error || 'Form submission failed');
        }
    } catch (error) {
        console.error("Contact Form Error:", error);
        errorMsg.textContent = "Error sending message. Please try again.";
        errorMsg.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const newPage = document.getElementById(`page-${pageId}`);
    if (newPage) {
        newPage.classList.add('active');
        currentPage = pageId;
        window.scrollTo(0, 0);

        if (currentUser.isLoggedIn) {
            switch (pageId) {
                case 'developer-dashboard': if (currentUser.role === 'admin') { renderAdminDashboard(); renderAllOrders(); } break;
                case 'seller-dashboard': if (currentUser.role === 'seller') renderSellerDashboard(); break;
                case 'user-dashboard': if (currentUser.role === 'user') { renderUserDashboard(); renderUserOrders(); } break;
            }
        }
        if (pageId === 'cart') renderCartPage();
    } else {
        document.getElementById('page-home').classList.add('active'); currentPage = 'home';
    }
    const nav = document.getElementById('main-nav');
    if (nav.classList.contains('mobile-active')) {
        nav.classList.remove('mobile-active');
        document.getElementById('mobile-menu-btn').classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

console.log('app.js loaded (v2.9)');

