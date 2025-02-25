/*******************************************************************/
// Initialize page
/*******************************************************************/
// initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // initialize the page with current date
    initializeDateRange();

    // setup event listeners
    setupEventListeners();

    // load initial data
    await loadInitialData();

    // set up the search category change event
    handleSearchCategoryChange();

    // initialize text search
    initializeTextSearch();
});

/*******************************************************************/
// Select Search
/*******************************************************************/

// global variables to store data
let allOrders = [];
let allMembers = [];
let allMaterials = {};  // will store by ID for quick lookup

// cache for lookup operations
let memberCache = {};
let materialCache = {};

// initialize date range with default values (last month to today)
function initializeDateRange() {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    document.getElementById('end-date').value = formatDateForInput(today);
    document.getElementById('start-date').value = formatDateForInput(lastMonth);
}

// format date for input fields (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// setup event listeners
function setupEventListeners() {
    // search button click
    document.getElementById('search-button').addEventListener('click', performSearch);

    // date range changes
    document.getElementById('start-date').addEventListener('change', performSearch);
    document.getElementById('end-date').addEventListener('change', performSearch);

    // enter key in search input
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // category change
    document.getElementById('search-category').addEventListener('change', handleSearchCategoryChange);
}

// handle search category change
function handleSearchCategoryChange() {
    const category = document.getElementById('search-category').value;
    const searchInput = document.getElementById('search-input');
    const searchInputContainer = document.getElementById('search-input-container');

    // clear existing content
    searchInputContainer.innerHTML = '';

    // create new input based on category
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
            // default text input
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'search-input';
            input.className = 'form-control';
            input.placeholder = 'Entrez votre recherche';
            input.style.height = '40px';
            searchInputContainer.appendChild(input);
    }
}

// create member dropdown
async function createMemberDropdown(memberType, container) {
    const select = document.createElement('select');
    select.id = 'search-input';
    select.className = 'form-select';
    select.style.height = '40px';

    // add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = `Sélectionnez un membre ${memberType === 'CLIENT' ? 'client' : 'actif'}`;
    select.appendChild(emptyOption);

    // add loading option
    const loadingOption = document.createElement('option');
    loadingOption.disabled = true;
    loadingOption.textContent = 'Chargement...';
    select.appendChild(loadingOption);

    container.appendChild(select);

    try {
        // get filtered members if we don't have them yet
        if (!allMembers || allMembers.length === 0) {
            await loadAllMembers();
        }

        // filter members by type
        const filteredMembers = allMembers.filter(member => member.type === memberType);

        // remove loading option
        select.removeChild(loadingOption);

        // sort members by name
        filteredMembers.sort((a, b) => {
            if (a.nom !== b.nom) {
                return a.nom.localeCompare(b.nom);
            }
            return a.prenom.localeCompare(b.prenom);
        });

        // add member options
        filteredMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.prenom} ${member.nom}`;
            select.appendChild(option);
        });

        // add change event to trigger search
        select.addEventListener('change', performSearch);
    } catch (error) {
        console.error('Error loading members:', error);
        select.innerHTML = '<option value="">Erreur lors du chargement des membres</option>';
    }
}

// create material dropdown
async function createMaterialDropdown(container) {
    const select = document.createElement('select');
    select.id = 'search-input';
    select.className = 'form-select';
    select.style.height = '40px';

    // add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Sélectionnez un matériel';
    select.appendChild(emptyOption);

    // add loading option
    const loadingOption = document.createElement('option');
    loadingOption.disabled = true;
    loadingOption.textContent = 'Chargement...';
    select.appendChild(loadingOption);

    container.appendChild(select);

    try {
        // collect all unique material IDs from orders
        const materialIds = new Set();
        allOrders.forEach(order => {
            order.numerosSerie.forEach(id => materialIds.add(id));
        });

        // fetch and store materials that aren't already cached
        const materialsToFetch = [...materialIds].filter(id => !materialCache[id]);
        await Promise.all(materialsToFetch.map(fetchMaterial));

        // remove loading option
        select.removeChild(loadingOption);

        // create a sorted array of materials
        const materialArray = Object.values(materialCache);
        materialArray.sort((a, b) => {
            if (a.marque !== b.marque) {
                return a.marque.localeCompare(b.marque);
            }
            return a.modele.localeCompare(b.modele);
        });

        // add material options
        materialArray.forEach(material => {
            const option = document.createElement('option');
            option.value = material.id;
            option.textContent = `${material.marque} ${material.modele} (${material.type})`;
            select.appendChild(option);
        });

        // add change event to trigger search
        select.addEventListener('change', performSearch);
    } catch (error) {
        console.error('Error loading materials:', error);
        select.innerHTML = '<option value="">Erreur lors du chargement des matériels</option>';
    }
}

// load initial data
async function loadInitialData() {
    showLoadingIndicator();

    try {
        // load all orders
        await loadAllOrders();

        // load all members
        await loadAllMembers();

        // show initial results (filtered by date)
        performSearch();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('Erreur lors du chargement des données. Veuillez réessayer plus tard.');
    } finally {
        hideLoadingIndicator();
    }
}

// load all orders
async function loadAllOrders() {
    try {
        const response = await fetch('http://localhost:8080/api/commandes');
        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        allOrders = await response.json();

        // sort orders by date (newest first)
        allOrders.sort((a, b) => {
            return new Date(b.dateCommande) - new Date(a.dateCommande);
        });

        return allOrders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
}

// load all members
async function loadAllMembers() {
    try {
        const response = await fetch('http://localhost:8080/api/membres');
        if (!response.ok) {
            throw new Error('Failed to fetch members');
        }

        allMembers = await response.json();

        // cache members by ID for faster lookup
        allMembers.forEach(member => {
            memberCache[member.id] = member;
        });

        return allMembers;
    } catch (error) {
        console.error('Error fetching members:', error);
        throw error;
    }
}

// fetch material details by ID
async function fetchMaterial(materialId) {
    try {
        // check cache first
        if (materialCache[materialId]) {
            return materialCache[materialId];
        }

        const response = await fetch(`http://localhost:8080/api/materiels/${materialId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch material ${materialId}`);
        }

        const material = await response.json();

        // cache material
        materialCache[materialId] = material;

        return material;
    } catch (error) {
        console.error(`Error fetching material ${materialId}:`, error);
        // cache a placeholder to avoid repeated failed requests
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

// fetch member details by ID
async function fetchMember(memberId) {
    try {
        // check cache first
        if (memberCache[memberId]) {
            return memberCache[memberId];
        }

        const response = await fetch(`http://localhost:8080/api/membres/${memberId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch member ${memberId}`);
        }

        const member = await response.json();

        // cache member
        memberCache[memberId] = member;

        return member;
    } catch (error) {
        console.error(`Error fetching member ${memberId}:`, error);
        // cache a placeholder to avoid repeated failed requests
        memberCache[memberId] = {
            id: memberId,
            nom: 'Inconnu',
            prenom: 'Inconnu',
            type: 'Inconnu'
        };
        return memberCache[memberId];
    }
}

// perform search with current criteria
async function performSearch() {
    showLoadingIndicator();

    try {
        // get search criteria
        const startDate = new Date(document.getElementById('start-date').value || '2010-01-01');
        const endDate = new Date(document.getElementById('end-date').value || '2030-12-31');
        endDate.setHours(23, 59, 59, 999); // Set to end of day

        const searchCategory = document.getElementById('search-category').value;
        const searchInput = document.getElementById('search-input').value;

        // filter orders by date range
        let filteredOrders = allOrders.filter(order => {
            const orderDate = new Date(order.dateCommande);
            return orderDate >= startDate && orderDate <= endDate;
        });

        // apply additional filters based on category
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

        // display results
        await displayResults(filteredOrders);
    } catch (error) {
        console.error('Error performing search:', error);
        showError('Erreur lors de la recherche. Veuillez réessayer plus tard.');
    } finally {
        hideLoadingIndicator();
    }
}

// pisplay search results
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

    // create results table
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

    // process each order (fetch member and material details)
    for (const order of orders) {
        // format date
        const orderDate = new Date(order.dateCommande);
        const formattedDate = orderDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // get client and vendor details
        let client = memberCache[order.idClient] || await fetchMember(order.idClient);
        let vendor = memberCache[order.idVendeur] || await fetchMember(order.idVendeur);

        // count materials by type
        const materialCounts = {};
        for (const materialId of order.numerosSerie) {
            if (!materialCache[materialId]) {
                await fetchMaterial(materialId);
            }
            const material = materialCache[materialId];
            materialCounts[material.type] = (materialCounts[material.type] || 0) + 1;
        }

        // format material summary
        const materialSummary = Object.entries(materialCounts)
            .map(([type, count]) => `${count} × ${type}`)
            .join(', ');

        // add row to table
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

    // close table
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    // add a summary
    tableHTML = `
        <div class="alert alert-success mt-4">
            <i class="fas fa-check-circle me-2"></i>
            <strong>${orders.length} commande(s) trouvée(s)</strong>
            pour un montant total de 
            <strong>${orders.reduce((sum, order) => sum + order.prixTotal, 0).toFixed(2)} €</strong>
        </div>
    ` + tableHTML;

    // update the results container
    resultsContainer.innerHTML = tableHTML;
}

// show order details
async function showOrderDetails(orderId) {
    try {
        // find the order
        const order = allOrders.find(o => o.id === orderId);
        if (!order) {
            showNotification('Commande non trouvée');
            return;
        }

        // format date
        const orderDate = new Date(order.dateCommande);
        const formattedDate = orderDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // get client and vendor details
        const client = memberCache[order.idClient] || await fetchMember(order.idClient);
        const vendor = memberCache[order.idVendeur] || await fetchMember(order.idVendeur);

        // get material details
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

        // create modal HTML
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
                                                <td class="text-center">${material.marque}</td>
                                                <td class="text-center">${material.modele}</td>
                                                <td class="text-center">${material.type}</td>
                                                <td class="text-center">${material.prix.toFixed(2)} €</td>
                                                <td class="text-center">${material.count}</td>
                                                <td class="text-center">${(material.prix * material.count).toFixed(2)} €</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="5" class="text-end"><strong>Total:</strong></td>
                                            <td class="text-center"><strong>${order.prixTotal.toFixed(2)} €</strong></td>
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

        // add modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // initialize and show the modal
        const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        modal.show();

        // remove modal from DOM when hidden
        document.getElementById('orderDetailModal').addEventListener('hidden.bs.modal', function() {
            document.body.removeChild(modalContainer);
        });
    } catch (error) {
        console.error('Error showing order details:', error);
        showNotification('Erreur lors du chargement des détails de la commande.');
    }
}

// print order details
function printOrderDetails() {
    const modalContent = document.querySelector('.modal-content').cloneNode(true);

    // remove buttons
    modalContent.querySelector('.modal-footer').remove();
    modalContent.querySelector('.btn-close').remove();

    // create print window
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

// show loading indicator
function showLoadingIndicator() {
    // check if indicator already exists
    if (document.getElementById('loading-indicator')) {
        document.getElementById('loading-indicator').style.display = 'flex';
        return;
    }

    // create loading indicator
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

// hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

/*******************************************************************/
// Text search
/*******************************************************************/
// Global variables for text search
let currentSearchResults = [];
let fullTextSearchActive = false;

// Initialize text search functionality
function initializeTextSearch() {
    const quickSearchInput = document.getElementById('quick-search');
    const clearSearchBtn = document.getElementById('clear-search');

    if (!quickSearchInput || !clearSearchBtn) return;

    // Add input event listener for real-time search
    quickSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toLowerCase();

        if (searchTerm.length > 0) {
            fullTextSearchActive = true;
            performFullTextSearch(searchTerm);
        } else {
            fullTextSearchActive = false;
            // If search is cleared, show regular search results
            performSearch();
        }
    });

    // Add clear button functionality
    clearSearchBtn.addEventListener('click', function() {
        quickSearchInput.value = '';
        fullTextSearchActive = false;
        performSearch();
    });
}

// Perform full text search
async function performFullTextSearch(searchTerm) {
    showLoadingIndicator();

    try {
        // Get current date filters
        const startDate = new Date(document.getElementById('start-date').value || '2010-01-01');
        const endDate = new Date(document.getElementById('end-date').value || '2030-12-31');
        endDate.setHours(23, 59, 59, 999); // Set to end of day

        // Filter orders by date range first
        let filteredOrders = allOrders.filter(order => {
            const orderDate = new Date(order.dateCommande);
            return orderDate >= startDate && orderDate <= endDate;
        });

        // Pre-fetch any missing member and material data
        await prefetchRelatedData(filteredOrders);

        // Now perform the full text search
        const results = [];

        for (const order of filteredOrders) {
            let matchFound = false;
            const orderData = {
                order: order,
                matchFields: [] // Track which fields matched for highlighting
            };

            // Check order ID
            if (order.id.toLowerCase().includes(searchTerm)) {
                matchFound = true;
                orderData.matchFields.push('id');
            }

            // Check client info
            const client = memberCache[order.idClient];
            if (client) {
                const clientFullName = `${client.prenom} ${client.nom}`.toLowerCase();
                const clientEmail = (client.email || '').toLowerCase();

                if (clientFullName.includes(searchTerm) || clientEmail.includes(searchTerm)) {
                    matchFound = true;
                    orderData.matchFields.push('client');
                }
            }

            // Check vendor info
            const vendor = memberCache[order.idVendeur];
            if (vendor) {
                const vendorFullName = `${vendor.prenom} ${vendor.nom}`.toLowerCase();
                const vendorEmail = (vendor.email || '').toLowerCase();

                if (vendorFullName.includes(searchTerm) || vendorEmail.includes(searchTerm)) {
                    matchFound = true;
                    orderData.matchFields.push('vendor');
                }
            }

            // Check price
            if (order.prixTotal.toString().includes(searchTerm)) {
                matchFound = true;
                orderData.matchFields.push('price');
            }

            // Check date
            const orderDate = new Date(order.dateCommande);
            const formattedDate = orderDate.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            if (formattedDate.includes(searchTerm)) {
                matchFound = true;
                orderData.matchFields.push('date');
            }

            // Check materials
            let materialMatchFound = false;
            for (const materialId of order.numerosSerie) {
                const material = materialCache[materialId];
                if (material) {
                    const materialText = `${material.marque} ${material.modele} ${material.type}`.toLowerCase();
                    if (materialText.includes(searchTerm)) {
                        materialMatchFound = true;
                        break;
                    }
                }
            }

            if (materialMatchFound) {
                matchFound = true;
                orderData.matchFields.push('material');
            }

            // If any match is found, add to results
            if (matchFound) {
                results.push(orderData);
            }
        }

        // Store the results and display them
        currentSearchResults = results;
        await displayFullTextSearchResults(results);
    } catch (error) {
        console.error('Error performing full text search:', error);
        showError('Erreur lors de la recherche. Veuillez réessayer plus tard.');
    } finally {
        hideLoadingIndicator();
    }
}

// Pre-fetch all needed data for orders
async function prefetchRelatedData(orders) {
    const memberIds = new Set();
    const materialIds = new Set();

    // Collect all unique IDs
    orders.forEach(order => {
        memberIds.add(order.idClient);
        memberIds.add(order.idVendeur);
        order.numerosSerie.forEach(id => materialIds.add(id));
    });

    // Initialize caches if they don't exist
    if (!memberCache) memberCache = {};
    if (!materialCache) materialCache = {};

    // Create an array of fetch promises for members
    const memberPromises = [...memberIds].filter(id => !memberCache[id]).map(id =>
        fetch(`http://localhost:8080/api/membres/${id}`)
            .then(response => response.json())
            .then(data => {
                memberCache[id] = data;
            })
            .catch(() => {
                memberCache[id] = { id, prenom: 'Inconnu', nom: 'Inconnu', email: '' };
            })
    );

    // Create an array of fetch promises for materials
    const materialPromises = [...materialIds].filter(id => !materialCache[id]).map(id =>
        fetch(`http://localhost:8080/api/materiels/${id}`)
            .then(response => response.json())
            .then(data => {
                materialCache[id] = data;
            })
            .catch(() => {
                materialCache[id] = { id, marque: 'Inconnu', modele: 'Inconnu', type: 'INCONNU', prix: 0 };
            })
    );

    // Wait for all data to be fetched
    await Promise.all([...memberPromises, ...materialPromises]);
}

// Display full text search results
async function displayFullTextSearchResults(results) {
    const resultsContainer = document.getElementById('results-container');

    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="alert alert-info mt-4">
                <i class="fas fa-info-circle me-2"></i>
                Aucune commande trouvée pour cette recherche.
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

    // Process each order
    for (const result of results) {
        const order = result.order;
        const matchFields = result.matchFields;

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
        const client = memberCache[order.idClient];
        const vendor = memberCache[order.idVendeur];

        // Count materials by type
        const materialCounts = {};
        for (const materialId of order.numerosSerie) {
            const material = materialCache[materialId];
            if (material) {
                materialCounts[material.type] = (materialCounts[material.type] || 0) + 1;
            }
        }

        // Format material summary
        const materialSummary = Object.entries(materialCounts)
            .map(([type, count]) => `${count} × ${type}`)
            .join(', ');

        // Add highlight class to matching fields
        const dateHighlight = matchFields.includes('id') || matchFields.includes('date') ? 'bg-light-yellow' : '';
        const clientHighlight = matchFields.includes('client') ? 'bg-light-yellow' : '';
        const vendorHighlight = matchFields.includes('vendor') ? 'bg-light-yellow' : '';
        const materialHighlight = matchFields.includes('material') ? 'bg-light-yellow' : '';
        const priceHighlight = matchFields.includes('price') ? 'bg-light-yellow' : '';

        // Add row to table
        tableHTML += `
            <tr>
                <td class="${dateHighlight}">
                    <div class="d-flex px-2 py-1">
                        <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">${formattedDate}</h6>
                            <p class="text-xs text-secondary mb-0">ID: ${order.id.substring(0, 8)}...</p>
                        </div>
                    </div>
                </td>
                <td class="${clientHighlight}">
                    <p class="text-xs font-weight-bold mb-0">${client.prenom} ${client.nom}</p>
                    <p class="text-xs text-secondary mb-0">${client.email || ''}</p>
                </td>
                <td class="${vendorHighlight}">
                    <p class="text-xs font-weight-bold mb-0">${vendor.prenom} ${vendor.nom}</p>
                    <p class="text-xs text-secondary mb-0">${vendor.email || ''}</p>
                </td>
                <td class="${materialHighlight}">
                    <p class="text-xs font-weight-bold mb-0">${order.numerosSerie.length} article(s)</p>
                    <p class="text-xs text-secondary mb-0">${materialSummary}</p>
                </td>
                <td class="${priceHighlight}">
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
            <strong>${results.length} commande(s) trouvée(s)</strong>
            pour un montant total de 
            <strong>${results.reduce((sum, result) => sum + result.order.prixTotal, 0).toFixed(2)} €</strong>
        </div>
    ` + tableHTML;

    // Add styles for highlighting
    tableHTML = `
        <style>
            .bg-light-yellow {
                background-color: rgba(255, 243, 205, 0.5) !important;
            }
        </style>
    ` + tableHTML;

    // Update the results container
    resultsContainer.innerHTML = tableHTML;
}

// Update the performSearch function to respect text search
const originalPerformSearch = performSearch;

performSearch = function() {
    // If text search is active, don't overwrite the results
    if (fullTextSearchActive) {
        const searchTerm = document.getElementById('quick-search').value.trim().toLowerCase();
        if (searchTerm.length > 0) {
            performFullTextSearch(searchTerm);
            return;
        }
    }

    // Otherwise, perform the regular search
    originalPerformSearch();
};

/*******************************************************************/
// Display messages
/*******************************************************************/

// show error message
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
        showNotification(message);
    }
}

// show notification popup
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