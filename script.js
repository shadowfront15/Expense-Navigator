// Firebase Configuration - Replace with your actual config

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Currency configuration
const currencies = {
    USD: { symbol: '$', name: 'US Dollar' },
    PKR: { symbol: '₨', name: 'Pakistani Rupee' },
    INR: { symbol: '₹', name: 'Indian Rupee' },
    AED: { symbol: 'د.إ', name: 'UAE Dirham' }
};

// Global variables
let currentUser = null;
let userCurrency = 'USD';
let expenses = [];
let budget = 0;
let expenseToDelete = null;

// DOM Elements - Auth
const authPage = document.getElementById('auth-page');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authTabButtons = document.querySelectorAll('.auth-tab-btn');
const authTabContents = document.querySelectorAll('.auth-tab-content');
const loadingOverlay = document.getElementById('loading-overlay');

// DOM Elements - Main App
const expenseForm = document.getElementById('expense-form');
const expenseNameInput = document.getElementById('expense-name');
const expenseAmountInput = document.getElementById('expense-amount');
const expenseCategoryInput = document.getElementById('expense-category');
const expenseDateInput = document.getElementById('expense-date');
const expenseList = document.getElementById('expense-list');
const noExpensesMessage = document.getElementById('no-expenses-message');
const totalAmountElement = document.getElementById('total-amount');
const budgetAmountElement = document.getElementById('budget-amount');
const remainingAmountElement = document.getElementById('remaining-amount');
const filterMonthSelect = document.getElementById('filter-month');
const filterCategorySelect = document.getElementById('filter-category');
const budgetInput = document.getElementById('budget-input');
const saveBudgetButton = document.getElementById('save-budget');
const clearDataButton = document.getElementById('clear-data');
const exportDataButton = document.getElementById('export-data');
const importDataButton = document.getElementById('import-data');
const importBtn = document.getElementById('import-btn');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteButton = document.getElementById('confirm-delete');
const cancelDeleteButton = document.getElementById('cancel-delete');
const categoryBarsElement = document.getElementById('category-bars');
const monthlyBarsElement = document.getElementById('monthly-bars');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const userNameElement = document.getElementById('user-name');
const userCurrencyElement = document.getElementById('user-currency');
const logoutButton = document.getElementById('logout-btn');
const currencySelect = document.getElementById('currency-select');
const saveCurrencyButton = document.getElementById('save-currency');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Set today's date as the default date
expenseDateInput.valueAsDate = new Date();

// Set current month in filter
const currentMonth = new Date().getMonth();
filterMonthSelect.value = currentMonth;

// Show loading overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Select all auth tab buttons and contents
// (Already declared above, so no need to redeclare here)

// Add click listeners to switch tabs
authTabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabId = button.getAttribute('data-tab');

    // Remove 'active' class from all buttons and contents
    authTabButtons.forEach(btn => btn.classList.remove('active'));
    authTabContents.forEach(content => content.classList.remove('active'));

    // Add 'active' class to clicked button and corresponding content
    button.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  });
});

// Optional: ensure the first tab is active on page load
window.addEventListener('DOMContentLoaded', () => {
  if (authTabButtons.length > 0 && authTabContents.length > 0) {
    authTabButtons[0].classList.add('active');
    authTabContents[0].classList.add('active');
  }
});


// Format currency based on user's preference
function formatCurrency(amount) {
    const currency = currencies[userCurrency];
    return currency.symbol + amount.toFixed(2);
}

// Load user data from Firebase
function loadUserData() {
    if (!currentUser) return;
    
    showLoading();
    
    // Load user preferences
    database.ref(`users/${currentUser.uid}/preferences`).once('value')
        .then((snapshot) => {
            const preferences = snapshot.val();
            if (preferences && preferences.currency) {
                userCurrency = preferences.currency;
                updateCurrencyDisplay();
            }
            if (preferences && preferences.darkMode) {
                document.body.classList.toggle('dark-mode', preferences.darkMode);
            }
            
            // Load expenses
            return database.ref(`users/${currentUser.uid}/expenses`).once('value');
        })
        .then((snapshot) => {
            expenses = [];
            snapshot.forEach((childSnapshot) => {
                const expense = childSnapshot.val();
                expense.id = childSnapshot.key;
                expenses.push(expense);
            });
            
            // Load budget
            return database.ref(`users/${currentUser.uid}/budget`).once('value');
        })
        .then((snapshot) => {
            const savedBudget = snapshot.val();
            if (savedBudget) {
                budget = parseFloat(savedBudget);
                budgetInput.value = budget;
            }
            
            updateBudgetDisplay();
            renderExpenses();
            hideLoading();
        })
        .catch((error) => {
            console.error("Error loading data: ", error);
            hideLoading();
            alert("Error loading your data. Please try again.");
        });
}

// Save user preferences
function saveUserPreferences() {
    if (!currentUser) return;
    
    const preferences = {
        currency: userCurrency,
        darkMode: document.body.classList.contains('dark-mode')
    };
    
    database.ref(`users/${currentUser.uid}/preferences`).set(preferences);
}

// Save budget to Firebase
function saveBudget() {
    if (!currentUser) return;
    
    database.ref(`users/${currentUser.uid}/budget`).set(budget.toString())
        .catch((error) => {
            console.error("Error saving budget: ", error);
            alert("Error saving budget. Please try again.");
        });
}

// Calculate total expenses
function calculateTotal(expenseArray) {
    return expenseArray.reduce((total, expense) => total + expense.amount, 0);
}

// Update budget display
function updateBudgetDisplay() {
    const total = calculateTotal(expenses);
    const remaining = Math.max(budget - total, 0);
    
    totalAmountElement.textContent = formatCurrency(total);
    budgetAmountElement.textContent = formatCurrency(budget);
    remainingAmountElement.textContent = formatCurrency(remaining);
    
    // Change color based on budget status
    if (remaining <= 0.2 * budget) {
        remainingAmountElement.style.color = '#e74c3c';
    } else if (remaining <= 0.5 * budget) {
        remainingAmountElement.style.color = '#f39c12';
    } else {
        remainingAmountElement.style.color = '#27ae60';
    }
}

// Update currency display
function updateCurrencyDisplay() {
    userCurrencyElement.textContent = userCurrency;
    currencySelect.value = userCurrency;
    
    // Update amount label
    const amountLabel = document.querySelector('label[for="expense-amount"]');
    const budgetLabel = document.querySelector('label[for="budget-input"]');
    const currency = currencies[userCurrency];
    
    amountLabel.textContent = `Amount (${currency.symbol})`;
    budgetLabel.textContent = `Monthly Budget (${currency.symbol})`;
    
    updateBudgetDisplay();
    renderExpenses();
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Get category name
function getCategoryName(categoryValue) {
    const categories = {
        'food': 'Food',
        'transportation': 'Transportation',
        'entertainment': 'Entertainment',
        'utilities': 'Utilities',
        'shopping': 'Shopping',
        'other': 'Other'
    };
    
    return categories[categoryValue] || categoryValue;
}

// Filter expenses
function filterExpenses() {
    const monthFilter = filterMonthSelect.value;
    const categoryFilter = filterCategorySelect.value;
    
    let filteredExpenses = [...expenses];
    
    if (monthFilter !== 'all') {
        const month = parseInt(monthFilter);
        filteredExpenses = filteredExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === month;
        });
    }
    
    if (categoryFilter !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => 
            expense.category === categoryFilter
        );
    }
    
    return filteredExpenses;
}

// Render expenses to table
function renderExpenses() {
    const filteredExpenses = filterExpenses();
    
    // Clear expense list
    expenseList.innerHTML = '';
    
    if (filteredExpenses.length === 0) {
        noExpensesMessage.style.display = 'block';
    } else {
        noExpensesMessage.style.display = 'none';
        
        // Sort expenses by date (newest first)
        filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add each expense to the table
        filteredExpenses.forEach((expense) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${expense.name}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td>${getCategoryName(expense.category)}</td>
                <td>${formatDate(expense.date)}</td>
                <td>
                    <button class="action-btn delete-btn" data-id="${expense.id}">
                        Delete
                    </button>
                </td>
            `;
            
            expenseList.appendChild(row);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                showDeleteModal(id);
            });
        });
    }
    
    updateBudgetDisplay();
    renderCharts();
}

// Add a new expense
function addExpense(name, amount, category, date) {
    if (!currentUser) return;
    
    const newExpense = {
        name,
        amount,
        category,
        date
    };
    
    const newExpenseRef = database.ref(`users/${currentUser.uid}/expenses`).push();
    
    newExpenseRef.set(newExpense)
        .then(() => {
            newExpense.id = newExpenseRef.key;
            expenses.push(newExpense);
            renderExpenses();
        })
        .catch((error) => {
            console.error("Error adding expense: ", error);
            alert("Error adding expense. Please try again.");
        });
}

// Delete an expense
function deleteExpense(id) {
    if (!currentUser) return;
    
    database.ref(`users/${currentUser.uid}/expenses/${id}`).remove()
        .then(() => {
            expenses = expenses.filter(expense => expense.id !== id);
            renderExpenses();
        })
        .catch((error) => {
            console.error("Error deleting expense: ", error);
            alert("Error deleting expense. Please try again.");
        });
}

// Show delete confirmation modal
function showDeleteModal(id) {
    expenseToDelete = id;
    deleteModal.style.display = 'flex';
}

// Hide delete confirmation modal
function hideDeleteModal() {
    deleteModal.style.display = 'none';
    expenseToDelete = null;
}

// Render charts
function renderCharts() {
    renderCategoryChart();
    renderMonthlyChart();
}

// Render category chart
function renderCategoryChart() {
    categoryBarsElement.innerHTML = '';
    
    if (expenses.length === 0) return;
    
    // Group expenses by category
    const categoryData = {};
    const categoryColors = {
        'food': '#e74c3c',
        'transportation': '#3498db',
        'entertainment': '#9b59b6',
        'utilities': '#f39c12',
        'shopping': '#2ecc71',
        'other': '#95a5a6'
    };
    
    expenses.forEach(expense => {
        if (!categoryData[expense.category]) {
            categoryData[expense.category] = 0;
        }
        categoryData[expense.category] += expense.amount;
    });
    
    // Convert to array and sort by amount
    const categories = Object.keys(categoryData)
        .map(category => ({
            category,
            amount: categoryData[category],
            color: categoryColors[category] || '#3498db'
        }))
        .sort((a, b) => b.amount - a.amount);
    
    // Find max amount for scaling
    const maxAmount = Math.max(...categories.map(cat => cat.amount), 1);
    
    // Create bars
    categories.forEach(cat => {
        const height = (cat.amount / maxAmount) * 100;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}%`;
        bar.style.backgroundColor = cat.color;
        
        const label = document.createElement('div');
        label.className = 'chart-bar-label';
        label.textContent = getCategoryName(cat.category);
        
        const value = document.createElement('div');
        value.className = 'chart-bar-value';
        value.textContent = formatCurrency(cat.amount);
        
        bar.appendChild(label);
        bar.appendChild(value);
        categoryBarsElement.appendChild(bar);
    });
}

// Render monthly chart
function renderMonthlyChart() {
    monthlyBarsElement.innerHTML = '';
    
    // Group expenses by month
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    expenses.forEach(expense => {
        const date = new Date(expense.date);
        const month = date.getMonth();
        
        if (!monthlyData[month]) {
            monthlyData[month] = 0;
        }
        monthlyData[month] += expense.amount;
    });
    
    // Create bars for each month
    const maxAmount = Math.max(...Object.values(monthlyData), 1);
    
    months.forEach((monthName, monthIndex) => {
        const amount = monthlyData[monthIndex] || 0;
        const height = (amount / maxAmount) * 100;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}%`;
        
        // Highlight current month
        if (monthIndex === new Date().getMonth()) {
            bar.style.backgroundColor = '#3498db';
        } else {
            bar.style.backgroundColor = '#95a5a6';
        }
        
        const label = document.createElement('div');
        label.className = 'chart-bar-label';
        label.textContent = monthName;
        
        const value = document.createElement('div');
        value.className = 'chart-bar-value';
        value.textContent = formatCurrency(amount);
        
        bar.appendChild(label);
        bar.appendChild(value);
        monthlyBarsElement.appendChild(bar);
    });
}

// Export data to JSON file
function exportData() {
    if (!currentUser) return;
    
    const data = {
        expenses,
        budget,
        currency: userCurrency,
        exportDate: new Date(),
        userEmail: currentUser.email
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `expense-tracker-${currentUser.uid}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Import data from JSON file
function importData(file) {
    if (!currentUser) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('This will replace all your current data. Are you sure?')) {
                showLoading();
                
                // Clear existing data
                const updates = {};
                updates[`users/${currentUser.uid}/expenses`] = null;
                
                database.ref().update(updates)
                    .then(() => {
                        // Add imported expenses
                        if (data.expenses && Array.isArray(data.expenses)) {
                            const expenseUpdates = {};
                            data.expenses.forEach(expense => {
                                const id = database.ref(`users/${currentUser.uid}/expenses`).push().key;
                                expenseUpdates[`users/${currentUser.uid}/expenses/${id}`] = {
                                    name: expense.name,
                                    amount: expense.amount,
                                    category: expense.category,
                                    date: expense.date
                                };
                            });
                            return database.ref().update(expenseUpdates);
                        }
                    })
                    .then(() => {
                        // Update budget and currency
                        if (data.budget !== undefined) {
                            budget = parseFloat(data.budget);
                            budgetInput.value = budget;
                            database.ref(`users/${currentUser.uid}/budget`).set(budget.toString());
                        }
                        
                        if (data.currency && currencies[data.currency]) {
                            userCurrency = data.currency;
                            saveUserPreferences();
                            updateCurrencyDisplay();
                        }
                        
                        loadUserData();
                        alert('Data imported successfully!');
                    })
                    .catch((error) => {
                        console.error("Error importing data: ", error);
                        alert("Error importing data. Please try again.");
                        hideLoading();
                    });
            }
        } catch (error) {
            alert('Error importing data. Please check the file format.');
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
}

// Tab switching
function switchTab(tabId) {
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    if (tabId === 'chart') {
        renderCharts();
    }
}

// Authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        userNameElement.textContent = `Welcome, ${user.displayName || user.email}!`;
        authPage.style.display = 'none';
        mainApp.style.display = 'block';
        loadUserData();
    } else {
        currentUser = null;
        authPage.style.display = 'flex';
        mainApp.style.display = 'none';
        expenses = [];
        budget = 0;
        hideLoading();
    }
});

// Event Listeners - Auth
authTabButtons.forEach(button => {
    button.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        switchAuthTab(tabId);
    });
});

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoading();
    
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            hideLoading();
            alert('Login failed: ' + error.message);
        });
});

signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const currency = document.getElementById('signup-currency').value;
    
    showLoading();
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Update user profile
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            // Set initial user preferences
            userCurrency = currency;
            saveUserPreferences();
            updateCurrencyDisplay();
        })
        .catch((error) => {
            hideLoading();
            alert('Signup failed: ' + error.message);
        });
});

logoutButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut();
    }
});

// Event Listeners - Main App
expenseForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = expenseNameInput.value;
    const amount = parseFloat(expenseAmountInput.value);
    const category = expenseCategoryInput.value;
    const date = expenseDateInput.value;
    
    addExpense(name, amount, category, date);
    
    expenseForm.reset();
    expenseDateInput.valueAsDate = new Date();
});

filterMonthSelect.addEventListener('change', renderExpenses);
filterCategorySelect.addEventListener('change', renderExpenses);

saveBudgetButton.addEventListener('click', function() {
    const budgetValue = parseFloat(budgetInput.value);
    
    if (!isNaN(budgetValue) && budgetValue >= 0) {
        budget = budgetValue;
        saveBudget();
        updateBudgetDisplay();
        alert('Budget saved successfully!');
    } else {
        alert('Please enter a valid budget amount.');
    }
});

saveCurrencyButton.addEventListener('click', function() {
    const newCurrency = currencySelect.value;
    if (newCurrency !== userCurrency) {
        userCurrency = newCurrency;
        saveUserPreferences();
        updateCurrencyDisplay();
        alert('Currency updated successfully!');
    }
});

darkModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    saveUserPreferences();
});

clearDataButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
        if (!currentUser) return;
        
        showLoading();
        
        Promise.all([
            database.ref(`users/${currentUser.uid}/expenses`).remove(),
            database.ref(`users/${currentUser.uid}/budget`).remove()
        ])
        .then(() => {
            expenses = [];
            budget = 0;
            budgetInput.value = '';
            renderExpenses();
            hideLoading();
            alert('All data cleared successfully!');
        })
        .catch((error) => {
            console.error("Error clearing data: ", error);
            hideLoading();
            alert("Error clearing data. Please try again.");
        });
    }
});

exportDataButton.addEventListener('click', exportData);

importBtn.addEventListener('click', function() {
    importDataButton.click();
});

importDataButton.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        importData(e.target.files[0]);
    }
});

confirmDeleteButton.addEventListener('click', function() {
    if (expenseToDelete) {
        deleteExpense(expenseToDelete);
        hideDeleteModal();
    }
});

cancelDeleteButton.addEventListener('click', hideDeleteModal);

tabButtons.forEach(button => {
    button.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        switchTab(tabId);
    });
});

// Initialize app
window.addEventListener('DOMContentLoaded', function() {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
    }
});
