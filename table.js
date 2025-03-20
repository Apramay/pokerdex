// table.js - Handles table creation and routing
document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get("table");

    if (!tableId) {
        // No table ID provided, redirect back to the lobby
        window.location.href = "/pokerdex/index.html";
    } else {
        // Redirect to the actual game page with the specific table ID
        window.location.href = `/pokerdex/game.html?table=${tableId}`;
    }
});
