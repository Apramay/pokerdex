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
    const imageName = `<span class="math-inline">\{rank\}\_of\_</span>{suit}.png`;

    return `<img src="./cards/<span class="math-inline">\{imageName\}" alt\="</span>{rank} of ${suit}" onerror="this.onerror=null; this.src='./cards/default.png';">`;
}

function displayHand(hand) {
    return hand.map(displayCard).join(", ");
}

let players = [];
let tableCards = [];
let pot = 0;
let currentPlayerIndex = 0;
let deckForGame = [];
let currentBet = 0;
let round = 0;
let smallBlindAmount = 10;
let bigBlindAmount = 20;
let dealerIndex = 0;
let socket; // Declare socket variable

function createPlayer(name, tokens) {
    return { name: name, tokens: tokens, hand: [], currentBet: 0, status: "active", allIn: false };
}

function startGame(playerNames, initialTokens) {
    deckForGame = shuffleDeck(createDeck());
    players = playerNames.map((name) => createPlayer(name, initialTokens));
    dealerIndex = Math.floor(Math.random() * players.length);
    startNewHand();
}

function startNewHand() {
    deckForGame = shuffleDeck(createDeck());
    players.forEach(player => {
        player.hand = dealHand(deckForGame, 2);
        player.currentBet = 0;
        player.status = "active";
        player.allIn = false;
    });
    tableCards = [];
    pot = 0;
    currentBet = 0;
    round = 0;
    setupBlinds();
}

function setupBlinds() {
    pot = 0;
    const smallBlindIndex = (dealerIndex + 1) % players.length;
    const bigBlindIndex = (dealerIndex + 2) % players.length;

    postBlind(players[smallBlindIndex], smallBlindAmount);
    postBlind(players[bigBlindIndex], bigBlindAmount);

    currentBet = bigBlindAmount;

    currentPlayerIndex = (bigBlindIndex + 1) % players.length;

    playersWhoActed.clear();
    updateUI();
    setTimeout(bettingRound, 500);
}

function postBlind(player, amount) {
    const blindAmount = Math.min(amount, player.tokens);
    player.tokens -= blindAmount;
    player.currentBet = blindAmount;
    pot += blindAmount;
    if (player.tokens === 0) {
        player.allIn = true;
    }
    displayMessage(`${player.name} posts ${blindAmount}.`);
}

function getNextPlayerIndex(currentIndex) {
    let nextIndex = (currentIndex + 1) % players.length;
    let attempts = 0;
    while ((players[nextIndex].status !== "active" || players[nextIndex].tokens === 0 || players[nextIndex].allIn) && attempts < players.length) {
        if (nextIndex === currentIndex) {
            return -1;
        }
        nextIndex = (nextIndex + 1) % players.length;
        attempts++;
    }
    return nextIndex;
}

let playersWhoActed = new Set();

function bettingRound() {
    let activePlayers = players.filter(p => p.status === "active" && !p.allIn && p.tokens > 0);

    if (activePlayers.length <= 1) {
        setTimeout(nextRound, 1000);
        return;
    }

    if (isBettingRoundOver()) {
        setTimeout(nextRound, 1000);
        return;
    }

    const player = players[currentPlayerIndex];

    if (playersWhoActed.has(player.name) && player.currentBet === currentBet) {
        currentPlayerIndex = getNextPlayerIndex(currentPlayerIndex);
        bettingRound();
        return;
    }

    displayMessage(`Waiting for player ${player.name} to act...`);
    playerAction(player);
}

function isBettingRoundOver() {
    let activePlayers = players.filter(p => p.status === "active" && !p.allIn && p.tokens > 0);

    if (activePlayers.length <= 1) {
        return true;
    }

    const allCalled = activePlayers.every(player => player.currentBet === currentBet || player.status === "folded");

    if (allCalled && playersWhoActed.size >= activePlayers.length) {
        return true;
    }

    return false;
}

function playerAction(player) {
    displayMessage(`${player.name}, your turn.`);

    if (currentBet > 0 && player.currentBet < currentBet) {
        checkBtn.style.display = "none";
    } else {
        checkBtn.style.display = "inline";
    }

    foldBtn.style.display = "inline";
    callBtn.style.display = currentBet > 0 ? "inline" : "none";
    betBtn.style.display = currentBet === 0 ? "inline" : "none";
    raiseBtn.style.display = currentBet > 0 ? "inline" : "none";

    foldBtn.onclick = () => { fold(player); };
    callBtn.onclick = () => { call(player); };
    betBtn.onclick = () => {
        const amount = parseInt(betInput.value);
        if (!isNaN(amount)) { bet(player, amount); } else { displayMessage("Invalid bet amount."); }
    };
    raiseBtn.onclick = () => {
        const amount = parseInt(betInput.value);
        if (!isNaN(amount)) { raise(player, amount); } else { displayMessage("Invalid raise amount."); }
    };
    checkBtn.onclick = () => { check(player); };
}

function fold(player) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "fold" }));
    }
    displayMessage(`${player.name} folds.`);
}

function call(player) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "call" }));
    }
    displayMessage(`${player.name} calls.`);
}

function bet(player, amount) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "bet", amount: amount }));
    }
    displayMessage(`${player.name} bets ${amount}.`);
}

function raise(player, amount) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "raise", amount: amount }));
    }
    displayMessage(`${player.name} raises to ${amount}.`);
}

function check(player) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "check" }));
    }
    displayMessage(`${player.name} checks.`);
}

function nextRound() {
    currentBet = 0;
    players.forEach((player) => (player.currentBet = 0));
    playersWhoActed.clear();

    if (round === 0) {
        round++;
        tableCards = dealHand(deckForGame, 3);
        displayMessage(`Flop: ${displayHand(tableCards)}`);

        currentPlayerIndex = (dealerIndex + 1) % players.length;
    } else if (round === 1) {
        round++;
        if (deckForGame.length > 0) {
            tableCards.push(dealCard(deckForGame));
            displayMessage(`Turn: ${displayCard(tableCards[3])}`);
        }
    } else if (round === 2) {
        round++;
        if (deckForGame.length > 0) {
            tableCards.push(dealCard(deckForGame));
            displayMessage(`River: ${displayCard(tableCards[4])}`);
        }
    } else if (round === 3) {
        showdown();
        return;
    }

    updateUI();
    setTimeout(bettingRound, 1000);
}

function showdown() {
    displayMessage("Showdown!");

    let activePlayers = players.filter(p => p.status === "active" || p.allIn);
    let winners = determineWinners(activePlayers);

    winners.forEach(winner => {
        displayMessage(`${winner.name} wins the hand!`);
    });

    distributePot();
    updateUI();
    setTimeout(resetHand, 3000);
}

function distributePot() {
    let eligiblePlayers = players.filter(p => p.status === "active" || p.allIn);
    eligiblePlayers.sort((a, b) => a.currentBet - b.currentBet);

    let totalPot = pot;
    let sidePots = [];

    while (eligiblePlayers.length > 0) {
        const minBet = eligiblePlayers[0].currentBet;
        let potPortion = 0;

        eligiblePlayers.forEach(player => {
            potPortion += Math.min(minBet, player.currentBet);
            player.currentBet -= Math.min(minBet, player.currentBet);
        });

        sidePots.push({ players: [...eligiblePlayers], amount: potPortion });
        eligiblePlayers = eligiblePlayers.filter(p => p.currentBet > 0);
    }

    sidePots.forEach(sidePot => {
        const winners = determineWinners(sidePot.players);
        const splitPot = Math.floor(sidePot.amount / winners.length);

        winners.forEach(winner => {
            winner.tokens += splitPot;
            displayMessage(`${winner.name} wins ${splitPot} from a side pot.`);
        });
    });

    let remainingPot = totalPot - sidePots.reduce((acc, sp) => acc + sp.amount, 0);
    if (remainingPot > 0) {
        let mainWinners = determineWinners(players.filter(p => p.status === "active"));
        let splitPot = Math.floor(remainingPot / mainWinners.length);
        mainWinners.forEach(winner => {
            winner.tokens += splitPot;
            displayMessage(`${winner.name} wins ${splitPot} from the main pot.`);
        });
    }
}

function determineWinners(playerList) {
    let eligiblePlayers = playerList.filter(player => player.status !== "folded");

    if (eligiblePlayers.length === 1) {
        return eligiblePlayers;
    }

    const playerHands = eligiblePlayers.map(player => ({
        player,
        hand: evaluateHand(player.hand.concat(tableCards)),
    }));

    playerHands.sort((a, b) => b.hand.value - a.hand.value);

    const bestHandValue = playerHands[0].hand.value;
    return playerHands
        .filter(playerHand => playerHand.hand.value === bestHandValue)
        .map(playerHand => playerHand.player);
}

function resetHand() {
    round = 0;
    tableCards = [];
    players.forEach(player => {
        player.hand = [];
        player.status = "active";
        player.allIn = false;
    });
    dealerIndex = (dealerIndex + 1) % players.length;
    startNewHand();
}

// Hand evaluation functions:
function evaluateHand(cards) {
    const allCards = cards.sort((a, b) => rankValues[a.rank] - rankValues[b.rank]);
    const ranks = allCards.map(c => rankValues[c.rank]);
    const suits = allCards.map(c => c.suit);

    if (isRoyalFlush(allCards, ranks, suits)) return { value: 10, handName: "Royal Flush" };
    if (isStraightFlush(allCards, ranks, suits)) return { value: 9, handName: "Straight Flush", highCard: getStraightHighCard(ranks) };
    if (isFourOfAKind(ranks)) return { value: 8, handName: "Four of a Kind", quadRank: getQuadRank(ranks), kicker: getKicker(ranks, getQuadRank(ranks)) };
    if (isFullHouse(ranks)) return { value: 7, handName: "Full House", tripsRank: getTripsRank(ranks), pairRank: getPairRank(ranks) };
    if (isFlush(suits)) return { value: 6, handName: "Flush", highCard: getFlushHighCard(ranks, suits) };
    if (isStraight(ranks)) return { value: 5, handName: "Straight", highCard: getStraightHighCard(ranks) };
    if (isThreeOfAKind(ranks)) return { value: 4, handName: "Three of a Kind", tripsRank: getTripsRank(ranks), kickers: getKickers(ranks, getTripsRank(ranks)) };
    if (isTwoPair(ranks)) return { value: 3, handName: "Two Pair", highPairs: getTwoPairHighCards(ranks), kicker: getKicker(ranks, getTwoPairHighCards(ranks)[0], getTwoPairHighCards(ranks)[1]) };
    if (isOnePair(ranks)) return { value: 2, handName: "One Pair", pairRank: getPairRank(ranks), kickers: getKickers(ranks, getPairRank(ranks)) };
    return { value: 1, handName: "High Card", highCard: ranks[6] };
}

// Helper functions for hand evaluation:
function isRoyalFlush(cards, ranks, suits) {
    if (!isFlush(suits)) return false;
    const royalRanks = [10, 11, 12, 13, 14];
    return royalRanks.every(rank => ranks.includes(rank));
}

function isStraightFlush(cards, ranks, suits) {
    return isFlush(suits) && isStraight(ranks);
}

function isFourOfAKind(ranks) {
    return ranks.some(rank => ranks.filter(r => r === rank).length === 4);
}

function isFullHouse(ranks) {
    return isThreeOfAKind(ranks) && isOnePair(ranks);
}

function isFlush(suits) {
    return suits.every(suit => suit === suits[0]);
}

function isStraight(ranks) {
    for (let i = 0; i < ranks.length - 4; i++) {
        if (ranks[i + 1] === ranks[i] + 1 && ranks[i + 2] === ranks[i] + 2 && ranks[i + 3] === ranks[i] + 3 && ranks[i + 4] === ranks[i] + 4) {
            return true;
        }
    }
    if (ranks[3] === 5 && ranks[4] === 10 && ranks[5] === 11 && ranks[6] === 12 && ranks[7] === 13) {
        return true;
    }
    return false;
}

function isThreeOfAKind(ranks) {
    return ranks.some(rank => ranks.filter(r => r === rank).length === 3);
}

function isTwoPair(ranks) {
    const pairs = ranks.filter((rank, index) => ranks.indexOf(rank) !== index).sort((a, b) => b - a);
    return new Set(pairs).size === 2;
}

function isOnePair(ranks) {
    return ranks.some((rank, index) => ranks.indexOf(rank) !== index);
}

function getQuadRank(ranks) {
    return ranks.find(rank => ranks.filter(r => r === rank).length === 4);
}

function getTripsRank(ranks) {
    return ranks.find(rank => ranks.filter(r => r === rank).length === 3);
}

function getPairRank(ranks) {
    return ranks.find((rank, index) => ranks.indexOf(rank) !== index);
}

function getKicker(ranks, ...excludeRanks) {
    return ranks.filter(rank => !excludeRanks.includes(rank)).sort((a, b) => b - a)[0];
}

function getKickers(ranks, excludeRank) {
    return ranks.filter(rank => rank !== excludeRank).sort((a, b) => b - a).slice(0, 2);
}

function getStraightHighCard(ranks) {
    for (let i = ranks.length - 5; i >= 0; i--) {
        if (ranks[i + 1] === ranks[i] + 1 && ranks[i + 2] === ranks[i] + 2 && ranks[i + 3] === ranks[i] + 3 && ranks[i + 4] === ranks[i] + 4) {
            return ranks[i + 4];
        }
    }
    if (ranks[3] === 5 && ranks[4] === 10 && ranks[5] === 11 && ranks[6] === 12 && ranks[7] === 13) {
        return 13;
    }
    return 0;
}

function getFlushHighCard(ranks, suits) {
    const flushSuit = suits.find((suit, index, arr) => arr.filter(s => s === suit).length >= 5);
    const flushRanks = ranks.filter((_, index) => suits[index] === flushSuit).sort((a, b) => b - a);
    return flushRanks[0];
}

function getTwoPairHighCards(ranks) {
    const pairs = ranks.filter((rank, index) => ranks.indexOf(rank) !== index).sort((a, b) => b - a);
    return [pairs[0], pairs[2]];
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

function updateUI(playersFromWebSocket = null) {
    if (playersFromWebSocket) {
        players = playersFromWebSocket;
    }

    const playersDiv = document.getElementById("players");
    if (!playersDiv) {
        console.error("❌ Players list element not found!");
        return;
    }
    playersDiv.innerHTML = "";

    players.forEach((player, index) => {
        let indicators = "";
        if (index === dealerIndex) indicators += "D ";
        if (index === (dealerIndex + 1) % players.length) indicators += "SB ";
        if (index === (dealerIndex + 2) % players.length) indicators += "BB ";

        let handDisplay;
        if (player.name === getMyPlayerName()) {
            handDisplay = player.status === "active" ? displayHand(player.hand) : "Folded";
        } else {
            handDisplay = player.status === "active" ? "Hidden Hand" : "Folded";
        }

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

    if (players[currentPlayerIndex] && players[currentPlayerIndex].name === getMyPlayerName()) {
        foldBtn.style.display = "inline";
        checkBtn.style.display = "inline";
        callBtn.style.display = currentBet > 0 ? "inline" : "none";
        betBtn.style.display = currentBet === 0 ? "inline" : "none";
        raiseBtn.style.display = currentBet > 0 ? "inline" : "none";
    } else {
        foldBtn.style.display = "none";
        checkBtn.style.display = "none";
        callBtn.style.display = "none";
        betBtn.style.display = "none";
        raiseBtn.style.display = "none";
    }
}

function getMyPlayerName() {
    return playerNameInput.value;
}

function displayMessage(message) {
    messageDiv.textContent = message;
}

addPlayerBtn.onclick = function () {
    const playerName = playerNameInput.value;
    if (playerName) {
        players.push(createPlayer(playerName, 1000));
        playerNameInput.value = "";
        updateUI();
    }
};

startGameBtn.onclick = function () {
    if (players.length >= 2) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "startGame" }));
        }
        startGame(players.map(p => p.name), 1000);
        updateUI();
    } else {
        displayMessage("You need at least two players to start.");
    }
};

restartBtn.onclick = function () {
    players = [];
    tableCards = [];
    pot = 0;
    currentPlayerIndex = 0;
    deckForGame = [];
    currentBet = 0;
    round = 0;
    playerNameInput.value = "";
    updateUI();
};

document.addEventListener("DOMContentLoaded", function () {
    socket = new WebSocket("wss://pokerdex-server.onrender.com");

    socket.onopen = () => {
        console.log("✅ Connected to WebSocket server");
    };

    const addPlayerBtn = document.getElementById("add-player-btn");
    const playerNameInput = document.getElementById("player-name-input");

    if (addPlayerBtn && playerNameInput) {
        addPlayerBtn.onclick = function () {
            const playerName = playerNameInput.value.trim();
            if (playerName) {
                console.log(`📤 Sending join request for: ${playerName}`);
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
                players = data.players;
                updateUI();
            } else if (data.type === "playerHand") {
                players.forEach((player) => {
                    if (player.name === data.playerName) {
                        player.hand = data.hand;
                    }
                });
                updateUI();
            } else if (data.type === "communityCards") {
                tableCards = data.cards;
                updateUI();
            } else if (data.type === "potUpdate") {
                pot = data.pot;
                updateUI();
            } else if (data.type === "roundUpdate") {
                round = data.round;
                currentBet = data.currentBet;
                updateUI();
            } else if (data.type === "message") {
                displayMessage(data.message);
            }
       } catch (error) {
            console.error("❌ Error parsing message:", error);
        }
    };
});
