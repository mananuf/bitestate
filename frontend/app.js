/**
 * BitEstate Frontend Application Logic
 * Integrates the DOM with the Mock Midl Blockchain.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const appState = {
        isWalletConnected: false,
        walletAddress: null,
        walletBalance: 0,
        properties: [],
        pendingTxPropertyId: null
    };

    // --- DOM Elements ---
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const propertiesGrid = document.getElementById('propertiesGrid');
    
    // Modal Elements
    const txModal = document.getElementById('txModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelTxBtn = document.getElementById('cancelTxBtn');
    const confirmTxBtn = document.getElementById('confirmTxBtn');
    const processingState = document.getElementById('processingState');
    const modalAmount = document.getElementById('modalAmount');
    
    // Toast Notification
    const notificationToast = document.getElementById('notificationToast');

    // --- Initialization ---
    async function initApp() {
        console.log("BitEstate: Initializing...");
        await loadProperties();
    }

    // --- Wallet Integration (Mock) ---
    connectBtn.addEventListener('click', () => {
        // Simulate Xverse Sats-Connect popup
        connectBtn.textContent = "Connecting...";
        
        setTimeout(() => {
            appState.isWalletConnected = true;
            // Generate mock address and balance
            appState.walletAddress = "bc1q" + Math.random().toString(36).substring(2, 8) + "..." + Math.random().toString(36).substring(2, 6);
            appState.walletBalance = (Math.random() * 10 + 2).toFixed(2); // Random balance between 2 and 12 BTC
            
            // Update UI
            connectBtn.classList.add('hidden');
            document.getElementById('walletAddress').textContent = appState.walletAddress;
            document.getElementById('walletBalance').textContent = appState.walletBalance + " BTC";
            walletInfo.classList.remove('hidden');
            
            // Re-render properties to enable buy buttons
            renderProperties();
        }, 1200);
    });

    // --- Blockchain Interaction (Mock) ---
    async function loadProperties() {
        try {
            // Fetch from global midlChain instance (mock-chain.js)
            appState.properties = await window.midlChain.getProperties();
            renderProperties();
        } catch (error) {
            console.error("Failed to fetch properties from Midl RPC", error);
            propertiesGrid.innerHTML = `<div class="loading-state"><p style="color:var(--danger)">Error: Could not connect to Midl node.</p></div>`;
        }
    }

    // --- UI Rendering ---
    function renderProperties() {
        if (!appState.properties || appState.properties.length === 0) {
            propertiesGrid.innerHTML = `<div class="loading-state"><p>No properties found on-chain.</p></div>`;
            return;
        }

        propertiesGrid.innerHTML = ''; // Clear loading state

        appState.properties.forEach(prop => {
            const card = document.createElement('div');
            card.className = 'property-card';
            
            // Status Logic
            const statusBadgeClass = prop.isSold ? 'sold' : 'available';
            const statusText = prop.isSold ? 'Sold Out' : 'Available';
            
            // Button Logic
            let buttonHtml = '';
            if (prop.isSold) {
                buttonHtml = `<button class="btn secondary-btn" disabled>Owner: ${prop.owner.substring(0, 6)}...</button>`;
            } else if (!appState.isWalletConnected) {
                buttonHtml = `<button class="btn secondary-btn" disabled>Connect Wallet to Buy</button>`;
            } else {
                buttonHtml = `<button class="btn primary-btn buy-btn" data-id="${prop.id}" data-price="${prop.priceBtc}">Buy Property</button>`;
            }

            card.innerHTML = `
                <div class="card-image" style="background-image: url('${prop.image}')">
                    <div class="status-badge ${statusBadgeClass}">${statusText}</div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${prop.title}</h3>
                    <div class="card-location">📍 ${prop.location}</div>
                    
                    <div class="card-footer">
                        <div class="price">
                            <span class="price-label">Price</span>
                            <span class="price-value">₿ ${prop.priceBtc.toFixed(2)}</span>
                        </div>
                        ${buttonHtml}
                    </div>
                </div>
            `;
            
            propertiesGrid.appendChild(card);
        });

        // Attach event listeners to new Buy buttons
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const propId = parseInt(e.target.getAttribute('data-id'));
                const price = parseFloat(e.target.getAttribute('data-price'));
                openTransactionModal(propId, price);
            });
        });
    }

    // --- Transaction Modal & Workflow ---
    function openTransactionModal(propertyId, priceBtc) {
        appState.pendingTxPropertyId = propertyId;
        modalAmount.textContent = `${priceBtc.toFixed(2)} BTC`;
        
        // Reset modal state
        processingState.classList.add('hidden');
        confirmTxBtn.textContent = "Confirm Purchase";
        confirmTxBtn.disabled = false;
        cancelTxBtn.disabled = false;
        closeModalBtn.style.display = 'block';
        
        txModal.classList.remove('hidden');
    }

    function closeTransactionModal() {
        txModal.classList.add('hidden');
        appState.pendingTxPropertyId = null;
    }

    // Close buttons
    closeModalBtn.addEventListener('click', closeTransactionModal);
    cancelTxBtn.addEventListener('click', closeTransactionModal);

    // Confirm Transaction Execution
    confirmTxBtn.addEventListener('click', async () => {
        if (!appState.pendingTxPropertyId) return;
        
        const propId = appState.pendingTxPropertyId;
        const prop = appState.properties.find(p => p.id === propId);
        
        // UI Updates for Processing
        processingState.classList.remove('hidden');
        confirmTxBtn.textContent = "Signing...";
        confirmTxBtn.disabled = true;
        cancelTxBtn.disabled = true;
        closeModalBtn.style.display = 'none';

        try {
            // Execute Mock Smart Contract Call
            const receipt = await window.midlChain.buyProperty(
                propId, 
                appState.walletAddress, 
                prop.priceBtc
            );
            
            console.log("Transaction Confirmed!", receipt);
            
            // Success Workflow
            closeTransactionModal();
            showSuccessToast(receipt.txHash);
            
            // Reload UI state from blockchain
            await loadProperties();
            
        } catch (error) {
            console.error("Transaction Failed:", error);
            processingState.classList.add('hidden');
            confirmTxBtn.textContent = "Failed. Try Again";
            confirmTxBtn.disabled = false;
            cancelTxBtn.disabled = false;
            closeModalBtn.style.display = 'block';
            alert(error.message);
        }
    });

    // --- Toast Notification ---
    function showSuccessToast(txHash) {
        notificationToast.classList.remove('hidden');
        document.getElementById('toastMessage').innerHTML = `
            Property secured on-chain.<br>
            <span style="font-family:monospace; font-size:12px; color:var(--text-secondary)">TX: ${txHash}</span>
        `;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notificationToast.classList.add('hidden');
        }, 5000);
    }

    // Start App
    initApp();
});
