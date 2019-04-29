$(() => {
    // generate options for selecting number of players
    const select = $('#numPlayerSelect');
    for (let i = 4; i <= 16; i++) {
        select.append('<option value="' + i + '">' + i + '</option>');
    }

    // set change and click handlers
    select.change(handlePlayerNumChange);
    $('#btnStartTournament').click(generateTournament);
    $('#btnClearTournament').click(handleClearButton);
    
    resetData();
});

/**
 * Generate the schedule and score tables for the tournament.
 * Takes player names from the Players table, and generates unique pairings
 * for each round.
 */
function generateTournament() {
    const playerNames = getPlayerNames();

    // verify all players have unique names
    if (!namesAreValid(playerNames)) {
        alert("Names must be unique and non-blank");
        return;
    }

    // find pairings for each round
    const rounds = generateRounds(playerNames.length);
    
    // show the pairings for each round
    const roundsHtml = createRoundTables(rounds, playerNames);
    $('#divRounds').html(roundsHtml);

    // assign the on-change handler for new score inputs
    $('.roundScore').change(handleScoreChange);

    // disable changing number of players
    $('#numPlayerSelect').prop("disabled", true);

    // disable editing the player names
    $('#playerTableBody').find('input').prop("disabled", true);
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
 * @returns {Array[Array[Array[Int]]]} the pairings for each round
 */
function generateRounds(numPlayers) {
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
        const pairs = firstHalf.map((e, i) => [e, secondHalf[i]]);
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
 * Create the round tables for the given rounds and players.
 * @param {Array[Array[Array[Int]]]} rounds - pairings for each round
 * @param {Array[String]} playerNames
 * @returns {String} the html for the round tables
 */
function createRoundTables(rounds, playerNames) {
    let html = '<hr/>';
    for (let i in rounds) {
        html += createRoundTable(i, rounds[i], playerNames);
    }
    return html;
}

/**
 * Create the table for the specified round. Each pair gets its own row with
 * an input for their score.s
 * @param {Int} roundNum - the round number
 * @param {Array[Array[Int]]} pairings - player pairings by number
 * @param {Array[String]} playerNames - player names as strings
 * @returns {String} the html for the new round table
 */
function createRoundTable(roundNum, pairings, playerNames) {
    const humanRoundNum = parseInt(roundNum) + 1;
    let html = '<h2>Round ' + humanRoundNum + '</h2>' +
            '<table>' +
                '<tr><th>Pair</th><th>Score</th></tr>';

    // For odd-number of players, one person plays by themself each round.
    // 'self' is a placeholder for such a scenario.
    const selfIndex = playerNames.indexOf('self');
    const isSinglePair = (pair) => pair.includes(selfIndex);

    for (let pair of pairings) {
        let pairNames, classes;

        if (isSinglePair(pair)) {
            const playerIndex = pair[0] == selfIndex ? pair[1] : pair[0];
            pairNames = playerNames[playerIndex];
            classes = 'scorePlayer' + playerIndex;
        } else {
            pairNames = playerNames[pair[0]] + ' and ' + playerNames[pair[1]];
            classes = 'scorePlayer' + pair[0] + ' scorePlayer' + pair[1];
        }

        html += `<tr>
            <td>${pairNames}</td>
            <td><input type="text" class="roundScore ${classes}" size="5"/></td>
        </tr>`;
    }

    html += '</table>';
    return html;
}

/**
 * Handle when the number of players is changed in the 'select' box.
 * It clears the player table and creates the appropriate number of rows.
 * @param {Event} event - the triggered change event
 */
function handlePlayerNumChange(event) {
    const numPlayers = parseInt(event.target.value);

    const playerTable = $('#playerTableBody');
    playerTable.html('');

    for (let i = 0; i < numPlayers; i++) {
        playerTable.append(`<tr>
            <td><input type="text" id="playerName${i}" /></td>
            <td class="playerTotal" id="playerTotal${i}"></td>
        </tr>`);
    }
}

/**
 * Handle when a score is updated in one of the Round tables.
 * @param {Event} event - The triggered event 
 */
function handleScoreChange(event) {
    const classes = event.currentTarget.classList;
    for (let i = 0; i < classes.length; i++) {
        const cls = classes.item(i);
        if (cls.startsWith("scorePlayer")) {
            updateScore(cls);
        }
    }
    sortPlayersByScore();
}

/**
 * Update the total score of the player associated with the given class.
 * @param {String} cls - The 'scorePlayerX' class, where X is the player number.
 */
function updateScore(cls) {
    const playerNum = parseInt(cls.match(/\d+/));

    let count = 0;
    $('.' + cls).each((i, e) => {
        count += strIsBlank(e.value) ? 0 : parseInt(e.value);
    });

    $('#playerTotal' + playerNum).text(count);
}

/**
 * Handle the 'Clear' button being pressed.
 * Make the user confirm so data is not accidentally lost.
 */
function handleClearButton() {
    if (confirm("Clear all tournament data?")) {
        resetData();
    }
}

/**
 * Clear all the tournament values.
 */
function resetData() {
    $('#divRounds').html('');
    $('#playerTableBody').html('');
    $('#numPlayerSelect').change();

    // enable changing number of players
    $('#numPlayerSelect').prop("disabled", false);
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
