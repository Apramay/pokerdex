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
    return `<img src="cards/${imageName}" alt="${rank} of ${suit}">`;
}

function displayHand(hand) {
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

function updateUI() {
    playersDiv.innerHTML = "";
    players.forEach((player, index) => {
        let indicators = "";
        if (index === dealerIndex) indicators += "D ";
        if (index === (dealerIndex + 1) % players.length) indicators += "SB ";
        if (index === (dealerIndex + 2) % players.length) indicators += "BB ";
        playersDiv.innerHTML += `<div class="player">${indicators}${player.name}: Tokens: ${player.tokens}<br>Hand: ${player.status === "active" ? displayHand(player.hand) : "Folded"}</div>`;
    });
    communityCardsDiv.innerHTML = "";
    tableCards.forEach(card => {
        communityCardsDiv.innerHTML += `<div>${displayCard(card)}</div>`;
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
const socket = io("pokerdex-server.onrender.com");  //  Connect to Render server

socket.on('connect', () => {
    console.log("Connected to server");

    //  Listen for events from the server and update the UI accordingly
    socket.on('gameState', (gameState) => {
        players = gameState.players;
        tableCards = gameState.tableCards;
        pot = gameState.pot;
        currentPlayerIndex = gameState.currentPlayerIndex;
        dealerIndex = gameState.dealerIndex;
        currentBet = gameState.currentBet;
        round = gameState.round;
        updateUI();
    });

    socket.on('message', (message) => {
        displayMessage(message);
    });

    //  Send player actions to the server
    function handleAction(action) {
        action();
    }

    function fold() {
        socket.emit('playerAction', 'fold');
    }

    function call() {
        socket.emit('playerAction', 'call');
    }

    function bet(amount) {
        socket.emit('playerAction', 'bet', amount);
    }

    function raise(amount) {
        socket.emit('playerAction', 'raise', amount);
    }

    function check() {
        socket.emit('playerAction', 'check');
    }

    //  Button click handlers - these now emit events
    addPlayerBtn.onclick = function() {
        const playerName = playerNameInput.value;
        if (playerName) {
            //  Emit 'addPlayer' event to the server
            socket.emit('addPlayer', playerName);
            playerNameInput.value = "";
        }
    };

    startGameBtn.onclick = function() {
        // Emit 'startGame' event to the server
        socket.emit('startGame');
    };

    restartBtn.onclick = function(){
        // Emit 'restartGame' event to the server
        socket.emit('restartGame');
        playerNameInput.value = "";
    };

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
