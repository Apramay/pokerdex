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
    if (!card || !card.suit || !card.rank) {
        console.warn("⚠️ Invalid card data received:", card);
        return `<img src="./cards/default.png" alt="Invalid Card">`;
    }

    const rank = card.rank;
    const suit = card.suit.toLowerCase();
    const imageName = `${rank}_of_${suit}.png`;

    return `<img src="https://apramay.github.io/pokerdex/cards/${imageName}" 
            alt="${rank} of ${suit}" 
            onerror="this.onerror=null; this.src='./cards/default.png';">`;
}



function displayHand(hand) {
    return hand.map(card => `<div class="card">${displayCard(card)}</div>`).join("");
}

// UI elements and game state
let players = [];
let tableCards = [];
let pot = 0;
let currentPlayerIndex = 0;
let currentBet = 0;
let round = 0;
let smallBlindAmount = 10;
let bigBlindAmount = 20;
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

         let dealerIndicator = index === dealerIndex ? "D " : "";
        let currentPlayerIndicator = index === currentPlayerIndex ? "➡️ " : "";
        let blindIndicator = "";
    
            if (index === (dealerIndex + 1) % players.length) blindIndicator = "SB ";
            if (index === (dealerIndex + 2) % players.length) blindIndicator = "BB ";
    

            const displayedHand = player.name === players[currentPlayerIndex].name ? displayHand(player.hand) 
                      : `<div class="card"><img src="https://apramay.github.io/pokerdex/cards/back.jpg" 
    alt="Card Back" style="width: 100px; height: auto;"></div>`;


        playerDiv.innerHTML = `
            ${dealerIndicator}${blindIndicator}${currentPlayerIndicator}${player.name}: Tokens: ${player.tokens}<br>
            Hand: ${displayHand(player.hand)}
        `;
        playersContainer.appendChild(playerDiv);
    });
    

    if (tableCardsContainer) tableCardsContainer.innerHTML = displayHand(tableCards);
    if (potDisplay) {
        console.log("💰 Updating UI pot display:", pot);
        potDisplay.textContent = `Pot: ${pot}`;
    }
    if (roundDisplay) roundDisplay.textContent = `Round: ${round}`;
    if (currentBetDisplay) currentBetDisplay.textContent = `Current Bet: ${currentBet}`;

   if (messageDisplay) {
        console.log(`📢 Updating UI: It's ${players[currentPlayerIndex]?.name}'s turn.`);
        messageDisplay.textContent = `It's ${players[currentPlayerIndex]?.name}'s turn.`;
    }
    const playerName = sessionStorage.getItem("playerName");

    // ✅ Enable buttons **only** for the current player
    const isCurrentPlayer = players[currentPlayerIndex]?.name === playerName;
    document.querySelectorAll("#action-buttons button").forEach(button => {
        button.disabled = !isCurrentPlayer;
        });
}
let actionHistory = [];

function updateActionHistory(actionText) {
    const historyContainer = document.getElementById("action-history");
    if (historyContainer) {
        const actionElement = document.createElement("p");
        actionElement.textContent = actionText;
        historyContainer.appendChild(actionElement);

        // ✅ Keep only the last 5 actions
        while (historyContainer.children.length > 5) {
            historyContainer.removeChild(historyContainer.firstChild);
        }
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
                sessionStorage.setItem("playerName", playerName);
                playerNameInput.value = "";
            } else {
                console.warn("⚠️ No player name entered!");
            }
        };
    } else {
        console.error("❌ Player input elements not found!");
    }

    const messageDisplay = document.getElementById("message");

    function displayMessage(message) {
        if (messageDisplay) {
            messageDisplay.textContent = message;
        } else {
            console.error("Message display element not found.");
        }
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
            if (data.type === "showdown") {
        console.log("🏆 Showdown! Revealing winner's hand.");

        // Update UI to show the winner's hand above their username
        data.winningHands.forEach(winner => {
            let playerDiv = document.querySelector(`#player-${winner.name}`);
            if (playerDiv) {
                let handDiv = document.createElement("div");
                handDiv.classList.add("revealed-hand");
                handDiv.innerHTML = displayHand(winner.hand);
                playerDiv.appendChild(handDiv);
            }
        });
                 // Provide reveal buttons for other active players
        let revealContainer = document.getElementById("reveal-options");
        revealContainer.innerHTML = "";

        data.revealOptions.forEach(player => {
            let revealBtn = document.createElement("button");
            revealBtn.innerText = `Reveal Hand (${player.name})`;
            revealBtn.onclick = function () {
                socket.send(JSON.stringify({ type: "revealHand", playerName: player.name }));
            };
            revealContainer.appendChild(revealBtn);
        });
    }

 if (data.type === "winnerCanReveal") {
        console.log("👑 Winner can choose to reveal their hand.");
        let revealBtn = document.createElement("button");
        revealBtn.innerText = `Reveal Hand (${data.winner})`;
        revealBtn.onclick = function () {
            socket.send(JSON.stringify({ type: "revealHand", playerName: data.winner }));
        };
        document.getElementById("reveal-options").appendChild(revealBtn);
    }
     if (data.type === "updateSidebar") {
        console.log("📜 Updating sidebar with winning hands.");
        let sidebar = document.getElementById("hand-history");
        let entry = document.createElement("p");
        entry.innerHTML = `<strong>${data.history.map(h => h.name).join(", ")}</strong>: ${data.history.map(h => displayHand(h.hand)).join(" | ")}`;
        sidebar.appendChild(entry);
    }
if (data.type === "bigBlindAction" ) {
    if (!data.options) {
        console.warn("⚠️ No options received from server!");
        return;
    }
    

    checkBtn.style.display = data.options.includes("check") ? "inline" : "none";
    callBtn.style.display = data.options.includes("call") ? "inline" : "none";
    foldBtn.style.display = data.options.includes("fold") ? "inline" : "none";
    raiseBtn.style.display = data.options.includes("raise") ? "inline" : "none";


    checkBtn.onclick = () => {
        socket.send(JSON.stringify({ type: "check", playerName: players[currentPlayerIndex].name }));
    };

    callBtn.onclick = () => {
        socket.send(JSON.stringify({ type: "call", playerName: players[currentPlayerIndex].name }));
    };

    raiseBtn.onclick = () => {
        const amount = parseInt(betInput.value);
        if (!isNaN(amount)) {
            socket.send(JSON.stringify({ type: "raise", playerName: players[currentPlayerIndex].name, amount }));
        } else {
            displayMessage("Invalid raise amount.");
        }
    };

    foldBtn.onclick = () => {
        socket.send(JSON.stringify({ type: "fold", playerName: players[currentPlayerIndex].name }));
    };
}

             if (data.type === "playerTurn") {
    console.log(`🎯 Player turn received: ${data.playerName}`);
    let playerIndex = players.findIndex(p => p.name === data.playerName);
    if (playerIndex !== -1) {
        currentPlayerIndex = playerIndex;
        console.log(`✅ Updated currentPlayerIndex: ${currentPlayerIndex}`);
        updateUI(); // ✅ Immediately update UI after setting correct turn
    } else {
        console.warn(`⚠️ Player ${data.playerName} not found in players list`);
    }
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
                setTimeout(() => {
                updateUI(players);
            }, 500); 
            }
            if (data.type === "updateActionHistory") {
            updateActionHistory(data.action);
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
    const checkBtn = document.getElementById("check-btn"); // ✅ Add check button reference

    const betAmountInput = document.getElementById("bet-input");

    if (foldBtn) foldBtn.onclick = () => sendAction("fold");
    if (callBtn) callBtn.onclick = () => sendAction("call");


    if (raiseBtn) {
        raiseBtn.onclick = () => {
            if (betAmountInput) {
                sendAction("raise", parseInt(betAmountInput.value));
            } else {
                console.error("betAmountInput not found!");
            }
        };
    }
    if (checkBtn) {
    checkBtn.onclick = () => sendAction("check"); // ✅ Send check action when clicked
}

   function sendAction(action, amount = null) {
    if (socket.readyState !== WebSocket.OPEN) return;

    // ✅ Ensure currentPlayerIndex is valid
    if (!players[currentPlayerIndex]) {
        console.error("❌ Invalid currentPlayerIndex:", currentPlayerIndex);
        return;
    }

    const actionData = {
        type: action,
        playerName: players[currentPlayerIndex].name, // ✅ Always use the correct player
    };

    if (amount !== null) {
        actionData.amount = amount;
    }

    socket.send(JSON.stringify(actionData));
       let actionText = `${players[currentPlayerIndex].name} ${action}`;
    if (amount !== null) {
        actionText += ` ${amount}`;
    }
       
    // ✅ Ensure UI reflects the new state after action
    setTimeout(() => {
        socket.send(JSON.stringify({ type: "getGameState" }));
    }, 500);
}

});
