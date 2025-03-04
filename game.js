const socket = new WebSocket("ws://localhost:3000");

socket.onopen = () => {
    console.log("✅ Connected to WebSocket server");
};

socket.onmessage = function(event) {
    let data = JSON.parse(event.data);
    
    if (data.type === "updatePlayers") {
        updateUI(data.players);
    }
    
    if (data.type === "gameState") {
        updateUI(data.players, data.pot, data.currentBet, data.currentPlayerIndex);
    }
};

function joinGame() {
    const playerName = document.getElementById("player-name-input").value.trim();
    if (playerName) {
        socket.send(JSON.stringify({ type: "join", name: playerName }));
    }
}

function startGame() {
    socket.send(JSON.stringify({ type: "startGame" }));
}

function sendAction(action) {
    socket.send(JSON.stringify({ type: "action", action, name: playerName }));
}

function updateUI(players, pot, currentBet, currentPlayerIndex) {
    const playersDiv = document.getElementById("players");
    playersDiv.innerHTML = "";
    
    players.forEach((player, index) => {
        let status = index === currentPlayerIndex ? " (Your Turn)" : "";
        playersDiv.innerHTML += `<div>${player.name}: ${player.chips} chips ${status}</div>`;
    });

    document.getElementById("pot").textContent = `Pot: ${pot}`;
    document.getElementById("currentBet").textContent = `Current Bet: ${currentBet}`;
}

document.getElementById("join-btn").addEventListener("click", joinGame);
document.getElementById("start-game-btn").addEventListener("click", startGame);
document.getElementById("fold-btn").addEventListener("click", () => sendAction({ type: "fold" }));
document.getElementById("call-btn").addEventListener("click", () => sendAction({ type: "call" }));
document.getElementById("raise-btn").addEventListener("click", () => {
    const amount = parseInt(document.getElementById("bet-input").value);
    sendAction({ type: "raise", amount });
});
