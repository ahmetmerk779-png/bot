let qTable = {}; // State: { action: reward }

function updateQTable(state, action, reward) {
    if (!qTable[state]) qTable[state] = {};
    if (!qTable[state][action]) qTable[state][action] = 0;
    
    // Öğrenme katsayısı
    qTable[state][action] += reward; 
}

function getBestAction(state) {
    if (!qTable[state]) return 'analyze';
    return Object.keys(qTable[state]).reduce((a, b) => 
        qTable[state][a] > qTable[state][b] ? a : b);
}
