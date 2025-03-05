const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const rankValues = { "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14 };

function createDeck() {
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealCard(deck) {
    return deck.pop();
}

function dealHand(deck, numCards) {
    const hand = [];
    for (let i = 0; i < numCards; i++) {
        hand.push(dealCard(deck));
    }
    return hand;
}

function displayCard(card) {
    const rank = card.rank;
    const suit = card.suit;
    const imageName = `${rank}_of_${suit}.png`;

    return `<img src="./cards/${imageName}" alt="${rank} of ${suit}" onerror="this.onerror=null; this.src='./cards/default.png';">`;
}


function displayHand(hand) {
    return hand.map(displayCard).join(", ");
}

// UI elements and game state
let players = [];
let tableCards = [];
let pot = 0;
let currentPlayerIndex = 0;
let currentBet = 0;
let round = 0;
let dealerIndex = 0

// UI elements
const playersContainer = document.getElementById("players");
const tableCardsContainer = document.getElementById("community-cards");
const potDisplay = document.getElementById("pot");
const roundDisplay = document.getElementById("round");
const currentBetDisplay = document.getElementById("currentBet");
const messageDisplay = document.getElementById("message");
function updateUI(playersFromWebSocket = null) {
    if (playersFromWebSocket) {
        players = playersFromWebSocket;
    }

    if (!playersContainer) return;

    playersContainer.innerHTML = "";
    players.forEach((player, index) => {
        const playerDiv = document.createElement("div");
        playerDiv.classList.add("player");

        let dealerIndicator = "";
        if(round > 0){
            dealerIndicator = index === dealerIndex ? "D " : "";
        }
        let currentPlayerIndicator = index === currentPlayerIndex ? "➡️ " : "";
        let blindIndicator = "";
        if(round > 0){
            if (index === (dealerIndex + 1) % players.length) blindIndicator = "SB ";
            if (index === (dealerIndex + 2) % players.length) blindIndicator = "BB ";
        }

        playerDiv.innerHTML = `
            ${dealerIndicator}${blindIndicator}${currentPlayerIndicator}${player.name}: Tokens: ${player.tokens}<br>
            Hand: ${displayHand(player.hand)}
        `;
        playersContainer.appendChild(playerDiv);
    });

    if (tableCardsContainer) tableCardsContainer.innerHTML = displayHand(tableCards);
    if (potDisplay) potDisplay.textContent = `Pot: ${pot}`;
    if (roundDisplay) roundDisplay.textContent = `Round: ${round}`;
    if (currentBetDisplay) currentBetDisplay.textContent = `Current Bet: ${currentBet}`;

    if (messageDisplay && players[currentPlayerIndex]) {
        messageDisplay.textContent = `${players[currentPlayerIndex].name}, your turn.`;
    }
}
document.addEventListener("DOMContentLoaded", function () {
    const socket = new WebSocket("wss://pokerdex-server.onrender.com"); // Replace with your server address

    socket.onopen = () => {
        console.log("✅ Connected to WebSocket server");
    };

    const addPlayerBtn = document.getElementById("add-player-btn");
    const playerNameInput = document.getElementById("player-name-input");

    if (addPlayerBtn && playerNameInput) {
        addPlayerBtn.onclick = function () {
            const playerName = playerNameInput.value.trim();
            if (playerName) {
                socket.send(JSON.stringify({ type: "join", name: playerName }));
                playerNameInput.value = "";
            } else {
                console.warn("⚠️ No player name entered!");
            }
        };
    } else {
        console.error("❌ Player input elements not found!");
    }

    socket.onmessage = function (event) {
        console.log("📩 Received message from WebSocket:", event.data);

        try {
            let data = JSON.parse(event.data);
            if (data.type === "updatePlayers") {
                console.log("🔄 Updating players list:", data.players);
                updateUI(data.players);
            }
            if (data.type === "startGame") {
                console.log("🎲 Game has started!");
            }
            if (data.type === "updateGameState") {
                console.log("🔄 Updating game state:", data);
                players = data.players;
                tableCards = data.tableCards;
                pot = data.pot;
                currentBet = data.currentBet;
                round = data.round;
                currentPlayerIndex = data.currentPlayerIndex;
                dealerIndex = data.dealerIndex;
                updateUI(players);
            }

        } catch (error) {
            console.error("❌ Error parsing message:", error);
        }
    };

    const startGameBtn = document.getElementById("start-game-btn");
    if (startGameBtn) {
        startGameBtn.onclick = function () {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "startGame" }));
            } else {
                // displayMessage("WebSocket connection not open.");
            }
        };
    }

    // Action buttons
    const foldBtn = document.getElementById("fold-btn");
    const callBtn = document.getElementById("call-btn");
    const betBtn = document.getElementById("bet-btn");
    const raiseBtn = document.getElementById("raise-btn");
    const betAmountInput = document.getElementById("bet-input");

    if (foldBtn) foldBtn.onclick = () => sendAction("fold");
    if (callBtn) callBtn.onclick = () => sendAction("call");
    if (betBtn) {
        betBtn.onclick = () => {
            if (betAmountInput) {
                sendAction("bet", parseInt(betAmountInput.value));
            } else {
                console.error("betAmountInput not found!");
            }
        };
    }

    if (raiseBtn) {
        raiseBtn.onclick = () => {
            if (betAmountInput) {
                sendAction("raise", parseInt(betAmountInput.value));
            } else {
                console.error("betAmountInput not found!");
            }
        };
    }

    function sendAction(action, amount = null) {
        if (socket.readyState !== WebSocket.OPEN) {
            // displayMessage("WebSocket connection not open.");
            return;
        }

        const actionData = {
            type: action,
            playerName: players[currentPlayerIndex].name,
        };

        if (amount !== null) {
            actionData.amount = amount;
        }

        socket.send(JSON.stringify(actionData));
    }
});
