document.addEventListener("DOMContentLoaded", function () {
    const createTableBtn = document.getElementById("create-table-btn");

    if (createTableBtn) {
        createTableBtn.addEventListener("click", function () {
            const tableId = Math.random().toString(36).substr(2, 9); // Generate unique table ID
            window.location.href = `/game.html?table=${tableId}`; // Redirect to game with table ID
        });
    }
});
