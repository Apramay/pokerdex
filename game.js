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
    if (!card) {
        return ""; //  Handle cases where card is undefined or null
    }
    const rank = card.rank;
    const suit = card.suit;
    const imageName = `<span class="math-inline">\{rank\}\_of\_</span>{suit}.png`;
    return `<img src="cards/<span class="math-inline">\{imageName\}" alt\="</span>{rank} of ${suit}">`;
}

function displayHand(hand) {
    if (!hand || hand.length === 0) {
        return ""; //  Handle cases where hand is undefined, null, or empty
    }
    return hand.map(displayCard).join(", ");
}

// UI functions
const playersDiv = document.getElementById("players");
const communityCardsDiv = document.getElementById("community-cards");
const potDiv = document.getElementById("pot");
const messageDiv = document.getElementById("message");
const foldBtn = document.getElementById("fold-btn");
const checkBtn = document.getElementById("check-btn");
const callBtn = document.getElementById("call-btn");
const betInput = document.getElementById("bet-input");
const betBtn = document.getElementById("bet-btn");
const raiseBtn = document.getElementById("raise-btn");
const restartBtn = document.getElementById("restart-btn");
const playerNameInput = document.getElementById("player-name-input");
const addPlayerBtn = document.getElementById("add-player-btn");
const startGameBtn = document.getElementById("start-game-btn");

let players = [];
let tableCards = [];
let pot = 0;
let currentPlayerIndex = 0;
let dealerIndex = 0;
let currentBet = 0;
let round = 0;

function updateUI() {
    playersDiv.innerHTML = "";
    players.forEach((player, index) => {
        let indicators = "";
        if (index === dealerIndex) indicators += "D ";
        if (index === (dealerIndex + 1) % players.length) indicators += "SB ";
        if (index === (dealerIndex + 2) % players.length) indicators += "BB ";
        let handDisplay = player.status === "active" ? displayHand(player.hand) : "Folded";
        playersDiv.innerHTML += `<div class="player"><span class="math-inline">\{indicators\}</span>{player.name}: Tokens: ${player.tokens}<br>Hand: ${handDisplay}</div>`;
    });
    communityCardsDiv.innerHTML = "";
    tableCards.forEach(card => {
        communityCardsDiv.innerHTML += `<div>${displayCard(card)}</div>`;
    });
    potDiv.textContent = `Pot: ${pot}`;
    messageDiv.textContent = "";
    document.getElementById("round").textContent = "Round: " + round;
    document.getElementById("currentBet").textContent = "Current Bet: " + currentBet;
}

function displayMessage(message) {
    messageDiv.textContent = message;
}

// WebSocket connection
const socket = new WebSocket("ws://pokerdex-server.onrender.com"); //  Replace with your server URL

socket.addEventListener('open', (event) => {
    console.log("Connected to WebSocket server");

    // Button click handlers - these now send WebSocket messages
    addPlayerBtn.onclick = function() {
        const playerName = playerNameInput.value;
        if (playerName) {
            socket.send(JSON.stringify({ type: 'addPlayer', playerName: playerName }));
            playerNameInput.value = "";
        }
    };

    startGameBtn.onclick = function() {
        socket.send(JSON.stringify({ type: 'startGame' }));
    };

    restartBtn.onclick = function(){
        socket.send(JSON.stringify({ type: 'restartGame' }));
        playerNameInput.value = "";
    };

    //  Send player actions to the server
    function handleAction(action) {
        action();
    }

    function fold() {
        socket.send(JSON.stringify({ type: 'playerAction', action: 'fold', playerName: playerNameInput.value }));
    }

    function call() {
         socket.send(JSON.stringify({ type: 'playerAction', action: 'call', playerName: playerNameInput.value }));
    }

    function bet(amount) {
         socket.send(JSON.stringify({ type: 'playerAction', action: 'bet', playerName: playerNameInput.value, amount: amount }));
    }

    function raise(amount) {
         socket.send(JSON.stringify({ type: 'playerAction', action: 'raise', playerName: playerNameInput.value, amount: amount }));
    }

    function check() {
         socket.send(JSON.stringify({ type: 'playerAction', action: 'check', playerName: playerNameInput.value }));
    }

    //  Button click handlers - these now emit events
    foldBtn.onclick = () => { handleAction(fold); };
    callBtn.onclick = () => { handleAction(call); };
    betBtn.onclick = () => {
        const amount = parseInt(betInput.value);
        if (!isNaN(amount)) { handleAction(() => bet(amount)); } else { displayMessage("Invalid bet amount."); }
    };
    raiseBtn.onclick = () => {
        const amount = parseInt(betInput.value);
        if (!isNaN(amount)) { handleAction(() => raise(amount)); } else { displayMessage("Invalid raise amount."); }
    };
    checkBtn.onclick = () => { handleAction(check); };
});

socket.addEventListener('message', (event) => {
    const message = event.data;
    try {
        const data = JSON.parse(message);
        if (data.type === 'gameState') {
            players = data.gameState.players;
            tableCards = data.gameState.tableCards;
            pot = data.gameState.pot;
            currentPlayerIndex = data.gameState.currentPlayerIndex;
            dealerIndex = data.gameState.dealerIndex;
            currentBet = data.gameState.currentBet;
            round = data.gameState.round;
            updateUI();
        } else if (data.type === 'message') {
            displayMessage(data.message);
        } else if (data.type === 'actionOptions') {
            // Handle action options from the server
            checkBtn.style.display = data.canCheck ? "inline" : "none";
            callBtn.style.display = data.canCall ? "inline" : "none";
            betBtn.style.display = data.canBet ? "inline" : "none";
            raiseBtn.style.display = data.canRaise ? "inline" : "none";
        }
    } catch (e) {
        console.error('Invalid JSON from server:', message);
    }
});

socket.addEventListener('close', (event) => {
    console.log("Disconnected from WebSocket server");
});

socket.addEventListener('error', (event) => {
    console.error("WebSocket error:", event);
});
