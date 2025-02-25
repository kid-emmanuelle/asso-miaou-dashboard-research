// Global variables to store data
let allOrders = [];
let allMembers = [];
let allMaterials = {};  // Will store by ID for quick lookup

// Cache for lookup operations
const memberCache = {};
const materialCache = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize the page with current date
    initializeDateRange();

    // Setup event listeners
    setupEventListeners();

    // Load initial data
    await loadInitialData();

    // Set up the search category change event
    handleSearchCategoryChange();
});

// Initialize date range with default values (last month to today)
function initializeDateRange() {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    document.getElementById('end-date').value = formatDateForInput(today);
    document.getElementById('start-date').value = formatDateForInput(lastMonth);
}

// Format date for input fields (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Setup event listeners
function setupEventListeners() {
    // Search button click
    document.getElementById('search-button').addEventListener('click', performSearch);

    // Date range changes
    document.getElementById('start-date').addEventListener('change', performSearch);
    document.getElementById('end-date').addEventListener('change', performSearch);

    // Enter key in search input
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Category change
    document.getElementById('search-category').addEventListener('change', handleSearchCategoryChange);
}

// Handle search category change
function handleSearchCategoryChange() {
    const category = document.getElementById('search-category').value;
    const searchInput = document.getElementById('search-input');
    const searchInputContainer = document.getElementById('search-input-container');

    // Clear existing content
    searchInputContainer.innerHTML = '';

    // Create new input based on category
    switch(category) {
        case 'client':
            createMemberDropdown('CLIENT', searchInputContainer);
            break;
        case 'actif':
            createMemberDropdown('ACTIF', searchInputContainer);
            break;
        case 'materiel':
            createMaterialDropdown(searchInputContainer);
            break;
        default:
            // Default text input
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'search-input';
            input.className = 'form-control';
            input.placeholder = 'Entrez votre recherche';
            input.style.height = '40px';
            searchInputContainer.appendChild(input);
    }
}

// Create member dropdown
async function createMemberDropdown(memberType, container) {
    const select = document.createElement('select');
    select.id = 'search-input';
    select.className = 'form-select';
    select.style.height = '40px';

    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = `Sélectionnez un membre ${memberType === 'CLIENT' ? 'client' : 'actif'}`;
    select.appendChild(emptyOption);

    // Add loading option
    const loadingOption = document.createElement('option');
    loadingOption.disabled = true;
    loadingOption.textContent = 'Chargement...';
    select.appendChild(loadingOption);

    container.appendChild(select);

    try {
        // Get filtered members if we don't have them yet
        if (!allMembers || allMembers.length === 0) {
            await loadAllMembers();
        }

        // Filter members by type
        const filteredMembers = allMembers.filter(member => member.type === memberType);

        // Remove loading option
        select.removeChild(loadingOption);

        // Sort members by name
        filteredMembers.sort((a, b) => {
            if (a.nom !== b.nom) {
                return a.nom.localeCompare(b.nom);
            }
            return a.prenom.localeCompare(b.prenom);
        });

        // Add member options
        filteredMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.prenom} ${member.nom}`;
            select.appendChild(option);
        });

        // Add change event to trigger search
        select.addEventListener('change', performSearch);
    } catch (error) {
        console.error('Error loading members:', error);
        select.innerHTML = '<option value="">Erreur lors du chargement des membres</option>';
    }
}

// Create material dropdown
async function createMaterialDropdown(container) {
    const select = document.createElement('select');
    select.id = 'search-input';
    select.className = 'form-select';
    select.style.height = '40px';

    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Sélectionnez un matériel';
    select.appendChild(emptyOption);

    // Add loading option
    const loadingOption = document.createElement('option');
    loadingOption.disabled = true;
    loadingOption.textContent = 'Chargement...';
    select.appendChild(loadingOption);

    container.appendChild(select);

    try {
        // Collect all unique material IDs from orders
        const materialIds = new Set();
        allOrders.forEach(order => {
            order.numerosSerie.forEach(id => materialIds.add(id));
        });

        // Fetch and store materials that aren't already cached
        const materialsToFetch = [...materialIds].filter(id => !materialCache[id]);
        await Promise.all(materialsToFetch.map(fetchMaterial));

        // Remove loading option
        select.removeChild(loadingOption);

        // Create a sorted array of materials
        const materialArray = Object.values(materialCache);
        materialArray.sort((a, b) => {
            if (a.marque !== b.marque) {
                return a.marque.localeCompare(b.marque);
            }
            return a.modele.localeCompare(b.modele);
        });

        // Add material options
        materialArray.forEach(material => {
            const option = document.createElement('option');
            option.value = material.id;
            option.textContent = `${material.marque} ${material.modele} (${material.type})`;
            select.appendChild(option);
        });

        // Add change event to trigger search
        select.addEventListener('change', performSearch);
    } catch (error) {
        console.error('Error loading materials:', error);
        select.innerHTML = '<option value="">Erreur lors du chargement des matériels</option>';
    }
}

// Load initial data
async function loadInitialData() {
    showLoadingIndicator();

    try {
        // Load all orders
        await loadAllOrders();

        // Load all members
        await loadAllMembers();

        // Show initial results (filtered by date)
        performSearch();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('Erreur lors du chargement des données. Veuillez réessayer plus tard.');
    } finally {
        hideLoadingIndicator();
    }
}

// Load all orders
async function loadAllOrders() {
    try {
        const response = await fetch('http://localhost:8080/api/commandes');
        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        allOrders = await response.json();

        // Sort orders by date (newest first)
        allOrders.sort((a, b) => {
            return new Date(b.dateCommande) - new Date(a.dateCommande);
        });

        return allOrders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
}

// Load all members
async function loadAllMembers() {
    try {
        const response = await fetch('http://localhost:8080/api/membres');
        if (!response.ok) {
            throw new Error('Failed to fetch members');
        }

        allMembers = await response.json();

        // Cache members by ID for faster lookup
        allMembers.forEach(member => {
            memberCache[member.id] = member;
        });

        return allMembers;
    } catch (error) {
        console.error('Error fetching members:', error);
        throw error;
    }
}

// Fetch material details by ID
async function fetchMaterial(materialId) {
    try {
        // Check cache first
        if (materialCache[materialId]) {
            return materialCache[materialId];
        }

        const response = await fetch(`http://localhost:8080/api/materiels/${materialId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch material ${materialId}`);
        }

        const material = await response.json();

        // Cache material
        materialCache[materialId] = material;

        return material;
    } catch (error) {
        console.error(`Error fetching material ${materialId}:`, error);
        // Cache a placeholder to avoid repeated failed requests
        materialCache[materialId] = {
            id: materialId,
            marque: 'Inconnu',
            modele: 'Inconnu',
            type: 'Inconnu',
            prix: 0
        };
        return materialCache[materialId];
    }
}

// Fetch member details by ID
async function fetchMember(memberId) {
    try {
        // Check cache first
        if (memberCache[memberId]) {
            return memberCache[memberId];
        }

        const response = await fetch(`http://localhost:8080/api/membres/${memberId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch member ${memberId}`);
        }

        const member = await response.json();

        // Cache member
        memberCache[memberId] = member;

        return member;
    } catch (error) {
        console.error(`Error fetching member ${memberId}:`, error);
        // Cache a placeholder to avoid repeated failed requests
        memberCache[memberId] = {
            id: memberId,
            nom: 'Inconnu',
            prenom: 'Inconnu',
            type: 'Inconnu'
        };
        return memberCache[memberId];
    }
}

// Perform search with current criteria
async function performSearch() {
    showLoadingIndicator();

    try {
        // Get search criteria
        const startDate = new Date(document.getElementById('start-date').value || '2010-01-01');
        const endDate = new Date(document.getElementById('end-date').value || '2030-12-31');
        endDate.setHours(23, 59, 59, 999); // Set to end of day

        const searchCategory = document.getElementById('search-category').value;
        const searchInput = document.getElementById('search-input').value;

        // Filter orders by date range
        let filteredOrders = allOrders.filter(order => {
            const orderDate = new Date(order.dateCommande);
            return orderDate >= startDate && orderDate <= endDate;
        });

        // Apply additional filters based on category
        if (searchInput) {
            switch (searchCategory) {
                case 'client':
                    filteredOrders = filteredOrders.filter(order => order.idClient === searchInput);
                    break;
                case 'actif':
                    filteredOrders = filteredOrders.filter(order => order.idVendeur === searchInput);
                    break;
                case 'materiel':
                    filteredOrders = filteredOrders.filter(order => order.numerosSerie.includes(searchInput));
                    break;
            }
        }

        // Display results
        await displayResults(filteredOrders);
    } catch (error) {
        console.error('Error performing search:', error);
        showError('Erreur lors de la recherche. Veuillez réessayer plus tard.');
    } finally {
        hideLoadingIndicator();
    }
}

// Display search results
async function displayResults(orders) {
    const resultsContainer = document.getElementById('results-container');

    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }

    if (orders.length === 0) {
        resultsContainer.innerHTML = `
            <div class="alert alert-info mt-4">
                <i class="fas fa-info-circle me-2"></i>
                Aucune commande trouvée pour ces critères de recherche.
            </div>
        `;
        return;
    }

    // Create results table
    let tableHTML = `
        <div class="table-responsive mt-4">
            <table class="table table-hover align-items-center">
                <thead>
                    <tr>
                        <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Date</th>
                        <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Client</th>
                        <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Vendeur</th>
                        <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Produits</th>
                        <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Total</th>
                        <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Détails</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Process each order (fetch member and material details)
    for (const order of orders) {
        // Format date
        const orderDate = new Date(order.dateCommande);
        const formattedDate = orderDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Get client and vendor details
        let client = memberCache[order.idClient] || await fetchMember(order.idClient);
        let vendor = memberCache[order.idVendeur] || await fetchMember(order.idVendeur);

        // Count materials by type
        const materialCounts = {};
        for (const materialId of order.numerosSerie) {
            if (!materialCache[materialId]) {
                await fetchMaterial(materialId);
            }
            const material = materialCache[materialId];
            materialCounts[material.type] = (materialCounts[material.type] || 0) + 1;
        }

        // Format material summary
        const materialSummary = Object.entries(materialCounts)
            .map(([type, count]) => `${count} × ${type}`)
            .join(', ');

        // Add row to table
        tableHTML += `
            <tr>
                <td>
                    <div class="d-flex px-2 py-1">
                        <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">${formattedDate}</h6>
                            <p class="text-xs text-secondary mb-0">ID: ${order.id.substring(0, 8)}...</p>
                        </div>
                    </div>
                </td>
                <td>
                    <p class="text-xs font-weight-bold mb-0">${client.prenom} ${client.nom}</p>
                    <p class="text-xs text-secondary mb-0">${client.email || ''}</p>
                </td>
                <td>
                    <p class="text-xs font-weight-bold mb-0">${vendor.prenom} ${vendor.nom}</p>
                    <p class="text-xs text-secondary mb-0">${vendor.email || ''}</p>
                </td>
                <td>
                    <p class="text-xs font-weight-bold mb-0">${order.numerosSerie.length} article(s)</p>
                    <p class="text-xs text-secondary mb-0">${materialSummary}</p>
                </td>
                <td>
                    <p class="text-xs font-weight-bold mb-0">${order.prixTotal.toFixed(2)} €</p>
                </td>
                <td>
                    <button class="btn btn-link text-primary mb-0" onclick="showOrderDetails('${order.id}')">
                        <i class="fas fa-info-circle text-xs"></i> Détails
                    </button>
                </td>
            </tr>
        `;
    }

    // Close table
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    // Add a summary
    tableHTML = `
        <div class="alert alert-success mt-4">
            <i class="fas fa-check-circle me-2"></i>
            <strong>${orders.length} commande(s) trouvée(s)</strong>
            pour un montant total de 
            <strong>${orders.reduce((sum, order) => sum + order.prixTotal, 0).toFixed(2)} €</strong>
        </div>
    ` + tableHTML;

    // Update the results container
    resultsContainer.innerHTML = tableHTML;
}

// Show order details
async function showOrderDetails(orderId) {
    try {
        // Find the order
        const order = allOrders.find(o => o.id === orderId);
        if (!order) {
            alert('Commande non trouvée');
            return;
        }

        // Format date
        const orderDate = new Date(order.dateCommande);
        const formattedDate = orderDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Get client and vendor details
        const client = memberCache[order.idClient] || await fetchMember(order.idClient);
        const vendor = memberCache[order.idVendeur] || await fetchMember(order.idVendeur);

        // Get material details
        const materialDetails = [];
        const uniqueMaterialIds = [...new Set(order.numerosSerie)];

        for (const materialId of uniqueMaterialIds) {
            const material = materialCache[materialId] || await fetchMaterial(materialId);
            const count = order.numerosSerie.filter(id => id === materialId).length;
            materialDetails.push({
                ...material,
                count
            });
        }

        // Create modal HTML
        const modalHTML = `
            <div class="modal fade" id="orderDetailModal" tabindex="-1" aria-labelledby="orderDetailModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="orderDetailModalLabel">Détails de la commande</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6 class="text-sm">Informations générales</h6>
                                    <p class="text-xs mb-1"><strong>ID:</strong> ${order.id}</p>
                                    <p class="text-xs mb-1"><strong>Date:</strong> ${formattedDate}</p>
                                    <p class="text-xs mb-1"><strong>Total:</strong> ${order.prixTotal.toFixed(2)} €</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-sm">Parties concernées</h6>
                                    <p class="text-xs mb-1"><strong>Client:</strong> ${client.prenom} ${client.nom} (${client.email || 'N/A'})</p>
                                    <p class="text-xs mb-1"><strong>Vendeur:</strong> ${vendor.prenom} ${vendor.nom} (${vendor.email || 'N/A'})</p>
                                </div>
                            </div>
                            
                            <h6 class="text-sm mb-3">Articles (${order.numerosSerie.length})</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Marque</th>
                                            <th>Modèle</th>
                                            <th>Type</th>
                                            <th>Prix unitaire</th>
                                            <th>Quantité</th>
                                            <th>Sous-total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${materialDetails.map(material => `
                                            <tr>
                                                <td>${material.marque}</td>
                                                <td>${material.modele}</td>
                                                <td>${material.type}</td>
                                                <td>${material.prix.toFixed(2)} €</td>
                                                <td>${material.count}</td>
                                                <td>${(material.prix * material.count).toFixed(2)} €</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="5" class="text-end"><strong>Total:</strong></td>
                                            <td><strong>${order.prixTotal.toFixed(2)} €</strong></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                            <button type="button" class="btn btn-primary" onclick="printOrderDetails()">Imprimer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Initialize and show the modal
        const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        modal.show();

        // Remove modal from DOM when hidden
        document.getElementById('orderDetailModal').addEventListener('hidden.bs.modal', function() {
            document.body.removeChild(modalContainer);
        });
    } catch (error) {
        console.error('Error showing order details:', error);
        alert('Erreur lors du chargement des détails de la commande.');
    }
}

// Print order details
function printOrderDetails() {
    const modalContent = document.querySelector('.modal-content').cloneNode(true);

    // Remove buttons
    modalContent.querySelector('.modal-footer').remove();
    modalContent.querySelector('.btn-close').remove();

    // Create print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Détails de la commande</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { padding: 20px; }
                    @media print {
                        body { padding: 0; }
                        .modal-header { border-bottom: 1px solid #dee2e6; }
                    }
                </style>
            </head>
            <body>
                ${modalContent.outerHTML}
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

// Show loading indicator
function showLoadingIndicator() {
    // Check if indicator already exists
    if (document.getElementById('loading-indicator')) {
        document.getElementById('loading-indicator').style.display = 'flex';
        return;
    }

    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;

    loadingIndicator.innerHTML = `
        <div class="spinner-border text-light" role="status">
            <span class="visually-hidden">Chargement...</span>
        </div>
    `;

    document.body.appendChild(loadingIndicator);
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="alert alert-danger mt-4">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
        `;
    } else {
        alert(message);
    }
}

function showNotification(message) {
    var notification = document.createElement('div');
    notification.className = 'notification-popup';
    notification.innerText = message;

    var closeButton = document.createElement('button');
    closeButton.innerText = 'X';
    closeButton.className = 'close-button';
    closeButton.onclick = function() {
        document.body.removeChild(notification);
    };

    notification.appendChild(closeButton);
    document.body.appendChild(notification);

    setTimeout(function() {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 2000);
}