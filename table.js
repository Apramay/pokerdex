function createTable() {
    const tableId = Math.random().toString(36).substr(2, 8); // Unique ID
    const tableUrl = `${window.location.origin}/pokerdex/game.html?table=${tableId}`;

    // Show table link
    document.getElementById("tableUrl").value = tableUrl;
    document.getElementById("tableLink").style.display = "block";

    // Send table info to the backend
    fetch("/registerTable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
    }).catch(err => console.error("Error registering table:", err));
}

function joinTable() {
    const tableId = prompt("Enter the table ID:");
    if (tableId) {
        window.location.href = `${window.location.origin}/pokerdex/game.html?table=${tableId}`;
    }
}

function copyLink() {
    const tableUrl = document.getElementById("tableUrl");
    tableUrl.select();
    document.execCommand("copy");
    alert("Link copied!");
}
