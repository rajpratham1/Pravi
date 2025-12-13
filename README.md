# Pravi Marketplace - User Manual

Welcome to the Pravi Marketplace! This document explains how to use the platform as a Buyer, a Seller, and an Administrator.

---

## 1. For Buyers (Users)

As a buyer, you can browse website listings, contact sellers, and manage your inquiries.

### 1.1. Creating an Account
1.  Click the **Sign Up** button in the header.
2.  Ensure the **"User Account"** tab is selected.
3.  Fill in your Full Name, Email, Phone, and a secure Password.
4.  Click **Create Account**. You will be automatically logged in and redirected to your dashboard.

### 1.2. Browsing and Finding Websites
-   **Homepage**: The homepage shows the latest website listings.
-   **Browse Websites Page**: Click "Browse Websites" in the navigation to see all available projects.
    -   **Search**: Use the search bar to filter listings by keywords in the title or description.
    -   **Sort**: Use the dropdown menu to sort listings by Newest, Price (Low to High), or Price (High to Low).

### 1.3. Viewing a Listing and Contacting a Seller
1.  Click on any listing card to see its detailed view.
2.  On the detail page, you can see a full description, a larger image, the price, and links to the seller's contact email and a live demo URL.
3.  To contact the seller directly through the platform, use the **"Contact Seller"** form. You must be logged in to do this.
4.  Type your message and click **Send Inquiry**.

### 1.4. Using the Shopping Cart
1.  On a listing's detail page, click the **"Add to Cart"** button.
2.  You can view your cart at any time by clicking the cart icon in the header.
3.  The cart page shows all items you have added, the total price, and allows you to remove items.

### 1.5. Checkout Process
1.  From the cart page, click **"Proceed to Checkout"**.
2.  The checkout page shows a final summary of your order.
3.  **Coupon Code**: You can enter a coupon code for a discount. For demonstration, try the code `PRAVI10` for a 10% discount.
4.  **Payment**: Click the **"Pay with UPI"** button. This will generate a standard UPI payment link to open your default payment app. 
    *Note: This is for demonstration purposes only. The website cannot verify if the payment was successful.*

### 1.6. Your Dashboard
-   Click **"My Dashboard"** in the user menu to view a history of all the inquiries you have sent to sellers.

### 1.7. My Orders
-   After placing an order, you can view its status in the "My Orders" section of your dashboard.
-   Orders will initially have a "Pending" status. The administrator will update the status to "Completed" after verifying the payment.

---

## 2. For Sellers (Developers)

As a seller, you can list your web projects for sale, manage your listings, and view inquiries from potential buyers.

### 2.1. The Seller Workflow (Important!)
The process to become a seller is in two parts: Application and Registration.

**Part 1: Apply to Become a Seller**
1.  First, you must have a standard **User Account**. If you don't have one, create one first.
2.  Log in to your User Account.
3.  On the homepage, click the **"Become a Seller"** button.
4.  Fill out the application form with your details, including your bank information and identity documents (Aadhaar and PAN cards).
5.  Click **Submit Application**. You must now wait for the platform Administrator to approve your application.

**Part 2: Register Your Seller Account**
1.  Once the Admin approves your application, your email is added to the approved sellers list.
2.  Log out of your user account if you are still logged in.
3.  Go to the **Sign Up** page.
4.  Click the **"Seller Account"** tab.
5.  Fill out the form using the **exact same email address** you used in your application.
6.  Click **Create Account**. The system will automatically assign you the "Seller" role.

### 2.2. Seller Dashboard
-   Once you log in as a Seller, you will be taken to your Seller Dashboard.
-   Here you can see **your listings** and **inquiries you have received**.

### 2.3. Managing Listings
1.  **Create a Listing**: Click the **"+ Create New Listing"** button on your dashboard.
2.  Fill out the form with your website's title, description, price, live demo URL, and contact details. You must upload a preview image for new listings.
3.  Click **Save Listing**.
4.  **Edit a Listing**: In your list of listings, click the **"Edit"** button. The form will appear with the existing data. Make your changes and click **Save Listing**.
5.  **Delete a Listing**: Click the **"Delete"** button next to a listing. You will be asked for confirmation before the listing is permanently removed.

---

## 3. For the Administrator (Developer)

The Administrator manages the entire platform.


*Note: The first time you use these credentials, the Admin account will be automatically created in the database.*

### 3.2. Admin Dashboard
The Admin Dashboard has two main sections:

**1. Pending Seller Applications**
-   This section lists all applications from users who want to become sellers.
-   For each application, you can see the applicant's details and view their identity documents by clicking the "View Aadhaar" and "View PAN" links.
-   **Approve**: Clicking "Approve" will mark the application as approved and add the user's email to the list of accounts that are allowed to register as sellers.
-   **Reject**: Clicking "Reject" will mark the application as rejected.

**2. Manage Platform Listings**
-   This section displays all listings currently on the platform from all sellers.
-   The Admin has the ability to permanently **Delete** any listing if it violates platform rules or is found to be fraudulent.

**3. Order Management**
-   This section displays all orders placed by users.
-   The Admin can view the details of each order, including the order ID, user ID, total amount, and status.
-   For pending orders, the Admin can click the **"Mark as Completed"** button to update the order's status after verifying the payment.
