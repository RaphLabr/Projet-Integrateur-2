export enum GameEvents {
    CreateRoom = 'createRoom',
    RoomCreated = 'roomCreated',
    PlayerList = 'playerList',
    JoinRoom = 'joinRoom',
    RoomDestroyed = 'roomDestroyed',
    TogglePublic = 'togglePublic',
    KickUser = 'kickUser',
    StartGame = 'startGame',
    AddAi = 'addAi',
    Error = 'error',
    ConfirmName = 'confirmName',
    JoinCreatingRoom = 'joinCreatingRoom',
    RoomLocked = 'roomLocked',
    CharacterSelect = 'characterSelect',
    AvailableCharacters = 'availableCharacters',
    StartRound = 'startRound',
    StartTimer = 'startTimer',
    EndRound = 'endRound',
    TimerUpdate = 'timerUpdate',
    StartNotification = 'startNotification',
    MovePlayer = 'movePlayer',
    QuitGame = 'quitGame',
    PlayerQuit = 'playerQuit',
    TimerEnd = 'timerEnd',
    StartCombat = 'startCombat',
    UpdateDoor = 'updateDoor',
    CombatAttack = 'combatAttack',
    CombatEvade = 'combatEvade',
    CombatMessage = 'combatMessage',
    CombatSuccessfulEvade = 'combatSuccessfulEvade',
    CombatFailedEvade = 'combatFailedEvade',
    CombatOver = 'combatOver',
    GameOver = 'gameOver',
    ItemPickUp = 'itemPickUp',
    ItemDrop = 'itemDrop',
    ToggleDebug = 'toggleDebug',
    CombatOverMessage = 'combatOverMessage',
    SuccessfulEvade = 'combatSuccessfulEvade',
    FailedEvade = 'combatFailedEvade',
    EndOfMovement = 'endOfMovement',
    StartOfMovement = 'startOfMovement',
    TeleportPlayer = 'teleportPlayer',
    CombatWinner = 'combatWinner',
    GameOverEarly = 'gameOverEarly',
    GetChat = 'getChat',
    MessageSent = 'messageSent',
    CombatOverLog = 'combatOverLog',
    ItemPickUpLog = 'itemPickUpLog',
    LoserPlayer = 'loserPlayer',
}
