const urlParams = new URLSearchParams(window.location.search);
const tableId = urlParams.get("table");

if (!tableId) {
    alert("Invalid table. Returning to homepage.");
    window.location.href = "/";
}

// Redirect to the game, but ensure a unique session per table
window.location.href = `/game.html?table=${tableId}`;
