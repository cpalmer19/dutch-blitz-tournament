
var gameData = {
    players: [],
    rounds: [],
    date: Date.now()
};

$(() => {
    // generate options for selecting number of players
    const select = $('#numPlayerSelect');
    for (let i = 4; i <= 16; i++) {
        select.append('<option value="' + i + '">' + i + '</option>');
    }

    // set change and click handlers
    select.change(handlePlayerNumChange);
    $('#divRounds').change(handleScoreChange);
    $('#btnStartTournament').click(handleStartTournamentButton);
    $('#btnClearTournament').click(handleClearButton);
    
    // load saved game if present, otherwise clear the page
    gameData = loadSavedGameData();
    if (gameData) {
        loadRounds();
        loadPlayers();
        startTournament();
    } else {
        clearTournament();
    }
});

/**
 * Generate the schedule and score tables for the tournament.
 * Takes player names from the Players table, and generates unique pairings
 * for each round.
 */
function handleStartTournamentButton() {
    const playerNames = getPlayerNames();

    // verify all players have unique names
    if (!namesAreValid(playerNames)) {
        alert("Names must be unique and non-blank");
        return;
    }

    gameData.players = playerNames;
    gameData.rounds = generateRoundPairings(playerNames.length);
    
    loadRounds();
    startTournament();
}

/**
 * Handle the 'Clear' button being pressed.
 * Make the user confirm so data is not accidentally lost.
 */
function handleClearButton() {
    if (confirm("Clear all tournament data?")) {
        clearTournament();
    }
}

/**
 * Handle when the number of players is changed in the 'select' box.
 * It adds or removes the appropriate number of rows from the existing table.
 * @param {Event} event - the triggered change event
 */
function handlePlayerNumChange(event) {
    const playerTable = $('#playerTableBody');
    const numPlayers = parseInt(event.target.value);
    const oldNumPlayers = playerTable.find('tr').length;

    if (numPlayers > oldNumPlayers) {
        // add the extra rows to the end
        for (let i = oldNumPlayers; i < numPlayers; i++) {
            playerTable.append(`<tr>
                <td><input type="text" id="playerName${i}" /></td>
                <td class="playerTotal" id="playerTotal${i}"></td>
            </tr>`);
        }
    } else if (oldNumPlayers > numPlayers) {
        // remove the extra rows from the end
        let numExtra = oldNumPlayers - numPlayers;
        playerTable.find('tr').slice(-numExtra).remove();
    }
}

/**
 * Generate tables for the pairings for each round based on the current gameData.
 */
function loadRounds() {
    let roundsHtml = '<hr/>';
    for (let i in gameData.rounds) {
        roundsHtml += createRoundTable(i);
    }
    $('#divRounds').html(roundsHtml);
}

/**
 * Show the player setup based on the current gameData
 */
function loadPlayers() {
    const players = Array.from(gameData.players);
    
    const selfIndex = players.indexOf('self');
    if (selfIndex != -1) {
        players.splice(selfIndex, 1);
    }

    $('#numPlayerSelect').val(players.length).change();
    for (let i = 0; i < players.length; i++) {
        $('#playerName' + i).val(players[i]);
        updatePlayerScore(i);
    }
    sortPlayersByScore();
}

/**
 * Retrieve the player names from the player table inputs.
 * @returns {Array[String]} the array of player names
 */
function getPlayerNames() {
    const numPlayers = $('#numPlayerSelect').val();

    const names = [];
    for (let i = 0; i < numPlayers; i++) {
        names.push($('#playerName' + i).val());
    }

    // add placeholder of 'self' for odd-number of players
    if (numPlayers % 2 == 1) {
        names.push("self");
    }
    return names;
}

/**
 * Check if the given player names are valid.
 * They are valid if none are blank and there are no repeated names.
 * @param {Array[String]} names - the player names
 * @returns {Boolean} true if valid, false otherwise
 */
function namesAreValid(names) {
    const nameSet = new Set();
    for (let name of names) {
        if (strIsBlank(name)) {
            return false;
        }
        if (nameSet.has(name)) {
            return false;
        }
        nameSet.add(name);
    }
    return true;
}

/**
 * Check if the given input string is blank
 * @param {String} str - the string to check
 * @returns {Boolean} true if blank, false otherwise
 */
function strIsBlank(str) {
    return (!str || /^\s*$/.test(str));
}

/**
 * Generate the tournament schedule for the given number of players.
 * @param {Int} numPlayers - the number of players in the tournament
 * @returns {Array[Array[Object]]} the pairings for each round
 */
function generateRoundPairings(numPlayers) {
    // generate array of 0..numPlayers
    const playerNums = [];
    for (let i = 0; i < numPlayers;  i++) {
        playerNums.push(i);
    }
    
    const numRounds = numPlayers - 1;
    const rounds = [];

    for (let round = 0; round < numRounds; round++) {
        // pair 0 to N, 1 to N-1, 2 to N-2
        const firstHalf = playerNums.slice(0, numPlayers/2);
        const secondHalf = playerNums.slice(numPlayers/2).reverse();
        const pairs = firstHalf.map((e, i) => {
            return {
                players: [e, secondHalf[i]],
                score: ''
            };
        });
        rounds.push(pairs);

        // rotate playerNums, keeping the first number the same
        const last = playerNums[numPlayers-1];
        for (let j = numPlayers-1; j > 1; j--) {
            playerNums[j] = playerNums[j-1];
        }
        playerNums[1] = last;
    }

    return rounds;
}

/**
 * Create the table for the specified round within the currency gameData.
 * Each pair gets its own row with an input for their score.
 * @param {Int} roundNum - the round number
 * @returns {String} the html for the new round table
 */
function createRoundTable(roundNum) {
    const humanRoundNum = parseInt(roundNum) + 1;
    let html = '<h2>Round ' + humanRoundNum + '</h2>' +
            '<table data-round="' + roundNum + '">' +
                '<tr><th>Pair</th><th>Score</th></tr>';

    // For odd-number of players, one person plays by themself each round.
    // 'self' is a placeholder for such a scenario.
    const selfIndex = gameData.players.indexOf('self');
    const isSinglePair = (pair) => pair.includes(selfIndex);

    for (let pairing of gameData.rounds[roundNum]) {
        let pairNames, classes;

        let pair = pairing.players;
        if (isSinglePair(pair)) {
            const playerIndex = pair[0] == selfIndex ? pair[1] : pair[0];
            pairNames = gameData.players[playerIndex];
            classes = 'scorePlayer' + playerIndex;
        } else {
            pairNames = gameData.players[pair[0]] + ' and ' + gameData.players[pair[1]];
            classes = 'scorePlayer' + pair[0] + ' scorePlayer' + pair[1];
        }

        html += `<tr>
            <td>${pairNames}</td>
            <td><input type="text" class="roundScore ${classes}" size="5" value="${pairing.score}"/></td>
        </tr>`;
    }

    html += '</table>';
    return html;
}

/**
 * Start the tournament by disabling the setup.
 */
function startTournament() {
    // disable changing number of players
    $('#numPlayerSelect').prop('disabled', true);

    // disable editing the player names
    $('#playerTableBody').find('input').prop('disabled', true);

    // disable the 'start tournament' button
    $('#btnStartTournament').prop('disabled', true);
}

/**
 * Clear all the tournament values.
 */
function clearTournament() {
    $('#divRounds').html('');
    $('#playerTableBody').html('');
    $('#numPlayerSelect').change();

    // enable setup inputs
    $('#numPlayerSelect').prop("disabled", false);
    $('#btnStartTournament').prop("disabled", false);

    localStorage.removeItem("gameData");
    gameData = {
        players: [],
        rounds: [],
        date: Date.now()
    }
}

/**
 * Handle when a score is updated in one of the Round tables.
 * @param {Event} event - The triggered event 
 */
function handleScoreChange(event) {
    const input = $(event.target);
    const playerNums = extractPlayerNums(input);

    for (num of playerNums) {
        updatePlayerScore(num);
    }

    sortPlayersByScore();

    saveGame(input);
}

/**
 * Update the total score of the player associated with the given player number.
 * @param {String} playerNum - The player number.
 */
function updatePlayerScore(playerNum) {
    let count = 0;
    $('.scorePlayer' + playerNum).each((i, e) => {
        count += strIsBlank(e.value) ? 0 : parseInt(e.value);
    });

    $('#playerTotal' + playerNum).text(count);
}

/**
 * Sort the players from highest to lowest score.
 */
function sortPlayersByScore() {
    let tableBody = $("#playerTableBody");
    let rows = tableBody.find("tr");

    let sorter = row => $(row).find(".playerTotal").text();
    rows.sort((a, b) => sorter(b) - sorter(a));

    tableBody.empty();
    tableBody.append(rows);
}

/**
 * Extract the player numbers from the given input's classes.
 * @param {String} input the input to get the player numbers for.
 */
function extractPlayerNums(input) {
    const nums = [];
    for (let match of input.attr('class').matchAll(/scorePlayer(\d+)/g)) {
        nums.push(parseInt(match[1]));
    }
    return nums;
}

/**
 * Save the game state based on the most recent score change.
 * @param scoreInput a jquery object of the score input that was just changed.
 */
function saveGame(scoreInput) {
    const roundNum = parseInt(scoreInput.closest('table').data('round'));
    const playerNum = extractPlayerNums(scoreInput)[0];

    const round = gameData.rounds[roundNum];
    const pairing = round.find(p => p.players.indexOf(playerNum) != -1);
    pairing.score = parseInt(scoreInput.val());

    const encodedData = JSON.stringify(gameData);
    localStorage.setItem("gameData", encodedData);
}

/**
 * Load a saved game if it isn't expired.
 */
function loadSavedGameData() {
    const encodedData = localStorage.getItem("gameData");
    if (encodedData) {
        const decodedData = JSON.parse(encodedData);
        if (decodedData && decodedData.players && decodedData.date && decodedData.rounds) {
            // game data expires after 2 hours
            const expiration = new Date(decodedData.date);
            expiration.setHours(expiration.getHours() + 2);
            if (Date.now() < expiration) {
                return decodedData;
            }
        }
    }
    return null;
}
