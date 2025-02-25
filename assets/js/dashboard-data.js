// Global variables to store fetched data
let allOrders = [];
let allMembers = [];
let allGroups = [];
let activeMembers = []; // Vendors

// Function to fetch all data needed for the dashboard
async function fetchDashboardData() {
    try {
        // Display loading indicators
        document.getElementById('revenue-value').innerHTML = '<small><i class="fas fa-spinner fa-spin"></i> Chargement...</small>';
        document.getElementById('members-value').innerHTML = '<small><i class="fas fa-spinner fa-spin"></i> Chargement...</small>';
        document.getElementById('groups-value').innerHTML = '<small><i class="fas fa-spinner fa-spin"></i> Chargement...</small>';
        document.getElementById('orders-value').innerHTML = '<small><i class="fas fa-spinner fa-spin"></i> Chargement...</small>';

        // Fetch all data in parallel
        const [ordersResponse, membersResponse, groupsResponse, activeMembersResponse] = await Promise.all([
            fetch('http://localhost:8080/api/commandes'),
            fetch('http://localhost:8080/api/membres'),
            fetch('http://localhost:8080/api/groupes'),
            fetch('http://localhost:8080/api/membres/actifs')
        ]);

        // Parse JSON responses
        allOrders = await ordersResponse.json();
        allMembers = await membersResponse.json();
        allGroups = await groupsResponse.json();
        activeMembers = await activeMembersResponse.json();

        // Update dashboard with fetched data
        updateDashboardStats();
        await updateVendorOrdersTable();
        updateRevenueChart();

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        alert('Erreur lors du chargement des données. Veuillez réessayer plus tard.');
    }
}

// Function to update the dashboard statistics
function updateDashboardStats() {
    // Calculate total revenue (Chiffre d'affaires)
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.prixTotal, 0);
    document.getElementById('revenue-value').textContent = totalRevenue.toFixed(2) + ' €';

    // Update total members count
    document.getElementById('members-value').textContent = allMembers.length;

    // Update total groups count
    document.getElementById('groups-value').textContent = allGroups.length;

    // Update total orders count
    document.getElementById('orders-value').textContent = allOrders.length;

    // Update current month/year in the small text
    const currentDate = new Date();
    const month = currentDate.toLocaleString('fr-FR', { month: '2-digit' });
    const year = currentDate.getFullYear();

    const dateTexts = document.querySelectorAll('.text-success.text-sm');
    dateTexts.forEach(element => {
        element.textContent = `${month}/${year}`;
    });
}

// Function to update the Vendor Orders table
async function updateVendorOrdersTable() {
    // Group orders by vendor and calculate totals
    const vendorStats = {};

    // Initialize stats for all active members (vendors)
    activeMembers.forEach(vendor => {
        vendorStats[vendor.id] = {
            name: `${vendor.prenom} ${vendor.nom}`,
            orderCount: 0,
            totalValue: 0
        };
    });

    // Fetch vendor orders in parallel
    const vendorPromises = activeMembers.map(async (vendor) => {
        try {
            const response = await fetch(`http://localhost:8080/api/commandes/search/vendeur/${vendor.id}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch orders for vendor ${vendor.id}`);
            }

            const vendorOrders = await response.json();
            if (vendorOrders && vendorOrders.length > 0) {
                vendorStats[vendor.id].orderCount = vendorOrders.length;
                vendorStats[vendor.id].totalValue = vendorOrders.reduce((sum, order) => sum + order.prixTotal, 0);
            }
        } catch (error) {
            console.error(`Error fetching orders for vendor ${vendor.id}:`, error);
        }
    });

    // Wait for all vendor data to be fetched
    await Promise.all(vendorPromises);

    // Sort vendors by total value (highest first)
    const sortedVendors = Object.values(vendorStats).sort((a, b) => b.totalValue - a.totalValue);

    // Get the table body
    const tableBody = document.querySelector('.table.align-items-center tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    // Add top vendors (or all if less than 3)
    const vendorsToShow = sortedVendors.slice(0, 3);
    vendorsToShow.forEach(vendor => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td class="w-30">
        <div class="d-flex px-2 py-1 align-items-center">
          <div class="ms-4">
            <p class="text-xs font-weight-bold mb-0">Vendeur:</p>
            <h6 class="text-sm mb-0">${vendor.name}</h6>
          </div>
        </div>
      </td>
      <td>
        <div class="text-center">
          <p class="text-xs font-weight-bold mb-0">Commandes:</p>
          <h6 class="text-sm mb-0">${vendor.orderCount}</h6>
        </div>
      </td>
      <td>
        <div class="text-center">
          <p class="text-xs font-weight-bold mb-0">Valeur:</p>
          <h6 class="text-sm mb-0">${vendor.totalValue.toFixed(2)} €</h6>
        </div>
      </td>
    `;
        tableBody.appendChild(row);
    });
}

// Function to update the Revenue Chart
function updateRevenueChart() {
    // Group orders by month
    const monthlyRevenue = {};

    // Initialize all months with zero
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(month => {
        monthlyRevenue[month] = 0;
    });

    // Calculate revenue for each month
    allOrders.forEach(order => {
        const orderDate = new Date(order.dateCommande);
        const monthIndex = orderDate.getMonth();
        const monthName = months[monthIndex];

        monthlyRevenue[monthName] += order.prixTotal;
    });

    // Get the chart data
    const chartData = months.map(month => monthlyRevenue[month]);

    // Get all chart instances
    const chartInstances = Chart.instances;

    // Destroy any existing chart on the canvas
    for (let key in chartInstances) {
        if (chartInstances[key].canvas.id === 'chart-line') {
            chartInstances[key].destroy();
            break;
        }
    }

    // Create chart
    var ctx1 = document.getElementById("chart-line").getContext("2d");
    var gradientStroke1 = ctx1.createLinearGradient(0, 230, 0, 50);

    gradientStroke1.addColorStop(1, 'rgba(94, 114, 228, 0.2)');
    gradientStroke1.addColorStop(0.2, 'rgba(94, 114, 228, 0.0)');
    gradientStroke1.addColorStop(0, 'rgba(94, 114, 228, 0)');

    // Store chart reference in a variable outside the function scope
    window.dashboardChart = new Chart(ctx1, {
        type: "line",
        data: {
            labels: months,
            datasets: [{
                label: "Chiffre d'affaires (€)",
                tension: 0.4,
                borderWidth: 0,
                pointRadius: 0,
                borderColor: "#5e72e4",
                backgroundColor: gradientStroke1,
                borderWidth: 3,
                fill: true,
                data: chartData,
                maxBarThickness: 6
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.toFixed(2)} €`;
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
            scales: {
                y: {
                    grid: {
                        drawBorder: false,
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: false,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        display: true,
                        padding: 10,
                        color: '#fbfbfb',
                        font: {
                            size: 11,
                            family: "Open Sans",
                            style: 'normal',
                            lineHeight: 2
                        },
                        callback: function(value) {
                            return value.toFixed(0) + ' €';
                        }
                    }
                },
                x: {
                    grid: {
                        drawBorder: false,
                        display: false,
                        drawOnChartArea: false,
                        drawTicks: false,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        display: true,
                        color: '#ccc',
                        padding: 20,
                        font: {
                            size: 11,
                            family: "Open Sans",
                            style: 'normal',
                            lineHeight: 2
                        },
                    }
                },
            },
        },
    });
}

// Initialize dashboard when the page loads
document.addEventListener('DOMContentLoaded', fetchDashboardData);