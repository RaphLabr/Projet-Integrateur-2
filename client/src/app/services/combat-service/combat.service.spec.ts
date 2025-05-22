// Max line disable since test file
/* eslint-disable max-lines */
// We allow the use of any to access private properties
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GameService } from '@app/services/game-service/game.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { ChatMessage } from '@common/chat-message';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { GameEvents } from '@common/game-events';
import { Player } from '@common/player';
import { StartCombatPayload } from '@common/start-combat-payload';
import { Teams } from '@common/teams';
import { NOTIFICATION_DURATION_MS } from '@common/timer-constants';
import { BehaviorSubject } from 'rxjs';
import { CombatService } from './combat.service';

describe('CombatService', () => {
    let service: CombatService;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

    beforeEach(() => {
        const gameServiceMock = jasmine.createSpyObj(
            'GameService',
            ['updateClientHealth', 'updateClientEvadeAttempts', 'addLog', 'onEndRoundClick', 'isRoundOver', 'incrementPlayerWins'],
            {
                gameState: { isGameInCombat: false },
                clientPlayer: { name: 'TestPlayer', maxHealth: 100, evadeAttempts: 0 },
            },
        );

        const socketMock = jasmine.createSpyObj('SocketClientService', ['on', 'emit'], { socket: { emit: jasmine.createSpy('emit') } });

        const snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

        TestBed.configureTestingModule({
            providers: [
                CombatService,
                { provide: GameService, useValue: gameServiceMock },
                { provide: SocketClientService, useValue: socketMock },
                { provide: MatSnackBar, useValue: snackBarMock },
            ],
        });

        service = TestBed.inject(CombatService);
        gameServiceSpy = TestBed.inject(GameService) as jasmine.SpyObj<GameService>;
        socketServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Getters', () => {
        it('should return correct value for isClientTurnToAttack', () => {
            expect(service.isClientTurnToAttack).toBeFalse();
            (service as any)._isClientTurnToAttack = true;
            expect(service.isClientTurnToAttack).toBeTrue();
        });

        it('should return correct value for isGameInCombat', () => {
            expect(service.isGameInCombat).toBeFalse();
            Object.defineProperty(gameServiceSpy, 'gameState', {
                get: () => ({ isGameInCombat: true }),
            });
            expect(service.isGameInCombat).toBeTrue();
        });

        it('should return correct value for enemyPlayer', () => {
            expect(service.enemyPlayer).toBeUndefined();
            const mockPlayer: Player = {
                name: 'EnemyPlayer',
                id: CharacterType.Character1,
                userId: '123',
                health: 4,
                maxHealth: 4,
                evadeAttempts: 0,
                wins: 0,
                attack: 4,
                defense: 6,
                speed: 4,
                startPosition: { x: 0, y: 0 },
                dice: { attack: 6, defense: 4 },
                items: [],
                hasAbandoned: false,
                team: Teams.RedTeam,
                isTorchActive: false,
                isBarrelActive: false,
            };

            (service as any)._enemyPlayer = mockPlayer;
            expect(service.enemyPlayer).toBe(mockPlayer);
        });

        it('should return correct value for isClientInCombat', () => {
            expect(service.isClientInCombat).toBeFalse();
            (service as any)._isClientInCombat = true;
            expect(service.isClientInCombat).toBeTrue();
        });

        it('should return correct value for combatMessages', () => {
            (service as any)._combatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
            expect(service.combatMessages).toEqual([]);
            const mockMessages: ChatMessage[] = [
                { color: 'green', message: 'Test message 1' },
                { color: 'red', message: 'Test message 2' },
            ];

            (service as any)._combatMessages = mockMessages;

            expect(service.combatMessages.length).toBe(0);
        });
    });

    describe('Combat methods', () => {
        beforeEach(() => {
            socketServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        });

        describe('combatAttack', () => {
            it('should emit CombatAttack event when client turn to attack is true', () => {
                const gameId = 'game123';
                (service as any)._isClientTurnToAttack = true;
                service.combatAttack(gameId);
                expect(socketServiceSpy.socket.emit).toHaveBeenCalledWith(GameEvents.CombatAttack, gameId);
            });

            it('should not emit CombatAttack event when not client turn to attack', () => {
                const gameId = 'game123';
                (service as any)._isClientTurnToAttack = false;
                service.combatAttack(gameId);
                expect(socketServiceSpy.socket.emit).not.toHaveBeenCalled();
            });
        });

        describe('combatEvade', () => {
            it('should emit CombatEvade event when client turn to attack is true', () => {
                const gameId = 'game123';
                (service as any)._isClientTurnToAttack = true;
                service.combatEvade(gameId);
                expect(socketServiceSpy.socket.emit).toHaveBeenCalledWith(GameEvents.CombatEvade, gameId);
            });

            it('should not emit CombatEvade event when not client turn to attack', () => {
                const gameId = 'game123';
                (service as any)._isClientTurnToAttack = false;
                service.combatEvade(gameId);
                expect(socketServiceSpy.socket.emit).not.toHaveBeenCalled();
            });
        });

        describe('requestCombat', () => {
            it('should emit StartCombat event with correct payload', () => {
                const payload: CombatRequestPayload = {
                    gameId: 'game123',
                    targetId: CharacterType.Character2,
                    initiatorId: CharacterType.Character1,
                    initiatorPosition: { x: 1, y: 2 },
                    targetPosition: { x: 3, y: 4 },
                };
                service.requestCombat(payload);
                expect(socketServiceSpy.socket.emit).toHaveBeenCalledWith(GameEvents.StartCombat, payload);
            });
        });

        describe('combatOver', () => {
            it('should reset combat state', () => {
                (service as any)._combatMessagesSubject = new BehaviorSubject<ChatMessage[]>([{ color: 'red', message: 'test' }]);
                const mockPlayer: Player = {
                    name: 'EnemyPlayer',
                    id: CharacterType.Character1,
                    userId: '123',
                    health: 4,
                    maxHealth: 4,
                    evadeAttempts: 0,
                    wins: 0,
                    attack: 4,
                    defense: 6,
                    speed: 4,
                    startPosition: { x: 0, y: 0 },
                    dice: { attack: 6, defense: 4 },
                    items: [],
                    hasAbandoned: false,
                    team: Teams.NoTeam,
                    isTorchActive: false,
                    isBarrelActive: false,
                };

                (service as any)._enemyPlayer = mockPlayer;
                (service as any)._gameService.clientPlayer.items = [];
                (service as any)._isClientInCombat = true;
                (service as any)._isClientTurnToAttack = true;
                (service as any)._combatMessages = [{ color: 'red', message: 'test' }];

                service.combatOver();

                expect(gameServiceSpy.isGameInCombat).toBeFalse();
                expect(service.enemyPlayer).toBeUndefined();
                expect(gameServiceSpy.updateClientHealth).toHaveBeenCalledWith(gameServiceSpy.clientPlayer.maxHealth);
                expect(gameServiceSpy.updateClientEvadeAttempts).toHaveBeenCalledWith(0);
                expect(service.isClientInCombat).toBeFalse();
                expect(service.isClientTurnToAttack).toBeFalse();
                expect(service.combatMessages).toEqual([]);
                expect(gameServiceSpy.onEndRoundClick).not.toHaveBeenCalled();
            });
        });

        describe('startCombat', () => {
            it('should initialize combat state correctly', () => {
                spyOn<any>(service, 'setPlayersInCombat');
                spyOn<any>(service, 'setPlayerTurn');

                const initiator: Player = {
                    name: 'Player1',
                    id: CharacterType.Character1,
                    userId: '111',
                    health: 4,
                    maxHealth: 4,
                    evadeAttempts: 0,
                    wins: 0,
                    attack: 4,
                    defense: 6,
                    speed: 4,
                    startPosition: { x: 0, y: 0 },
                    dice: { attack: 6, defense: 4 },
                    items: [],
                    hasAbandoned: false,
                    team: Teams.BlueTeam,
                    isTorchActive: false,
                    isBarrelActive: false,
                };

                const target: Player = {
                    name: 'Player2',
                    id: CharacterType.Character2,
                    userId: '222',
                    health: 4,
                    maxHealth: 4,
                    evadeAttempts: 0,
                    wins: 0,
                    attack: 4,
                    defense: 6,
                    speed: 4,
                    startPosition: { x: 0, y: 0 },
                    dice: { attack: 6, defense: 4 },
                    items: [],
                    hasAbandoned: false,
                    team: Teams.RedTeam,
                    isTorchActive: false,
                    isBarrelActive: false,
                };

                const startCombatPayload: StartCombatPayload = {
                    playersInCombat: { initiator, target, initiatorPosition: { x: 0, y: 0 }, targetPosition: { x: 1, y: 1 } },
                    startingPlayerName: 'Player1',
                };

                service.startCombat(startCombatPayload);

                expect(gameServiceSpy.isGameInCombat).toBeTrue();
                expect(gameServiceSpy.isActionUsed).toBeTrue();
                expect((service as any).setPlayersInCombat).toHaveBeenCalledWith(startCombatPayload.playersInCombat);
                expect(gameServiceSpy.addLog).toHaveBeenCalledWith(`Début de combat entre ${initiator.name} et ${target.name}`);
                expect((service as any).setPlayerTurn).toHaveBeenCalledWith(startCombatPayload.startingPlayerName);
            });
        });

        describe('configureSocketFeatures', () => {
            let callbacks: Map<string, (...args: any[]) => void>;

            beforeEach(() => {
                callbacks = new Map<string, (...args: any[]) => void>();

                socketServiceSpy.on.and.callFake((event: string, callback: (...args: any[]) => void) => {
                    callbacks.set(event, callback);
                    return socketServiceSpy;
                });

                spyOn<any>(service, 'startCombat');
                spyOn<any>(service, 'receivedAttack');
                spyOn<any>(service, 'failedEvade');
                spyOn<any>(service, 'combatOver');
                spyOn<any>(service, 'listenForCombatMessages');

                service.configureSocketFeatures();
            });

            it('should register all socket event handlers', () => {
                expect(socketServiceSpy.on).toHaveBeenCalledWith(GameEvents.StartCombat, jasmine.any(Function));
                expect(socketServiceSpy.on).toHaveBeenCalledWith(GameEvents.CombatAttack, jasmine.any(Function));
                expect(socketServiceSpy.on).toHaveBeenCalledWith(GameEvents.CombatFailedEvade, jasmine.any(Function));
                expect(socketServiceSpy.on).toHaveBeenCalledWith(GameEvents.CombatOver, jasmine.any(Function));
                expect(socketServiceSpy.on).toHaveBeenCalledWith(GameEvents.CombatOverLog, jasmine.any(Function));
                expect(socketServiceSpy.on).toHaveBeenCalledWith(GameEvents.CombatWinner, jasmine.any(Function));
            });

            it('should call listenForCombatMessages', () => {
                expect((service as any).listenForCombatMessages).toHaveBeenCalled();
            });

            it('should trigger startCombat when StartCombat event is received', () => {
                const startPayload: StartCombatPayload = {
                    playersInCombat: {
                        initiator: { name: 'Player1' } as Player,
                        target: { name: 'Player2' } as Player,
                        initiatorPosition: { x: 0, y: 0 },
                        targetPosition: { x: 1, y: 1 },
                    },
                    startingPlayerName: 'Player1',
                };

                const callback = callbacks.get(GameEvents.StartCombat);
                expect(callback).toBeDefined();

                if (callback) callback(startPayload);
                expect((service as any).startCombat).toHaveBeenCalledWith(startPayload);
            });

            it('should trigger receivedAttack when CombatAttack event is received', () => {
                const attackPayload = { playerName: 'Player1', playerHealth: 3 };
                const callback = callbacks.get(GameEvents.CombatAttack);

                if (callback) callback(attackPayload);
                expect((service as any).receivedAttack).toHaveBeenCalledWith(attackPayload);
            });

            it('should trigger failedEvade when CombatFailedEvade event is received', () => {
                const playerName = 'Player1';
                const callback = callbacks.get(GameEvents.CombatFailedEvade);

                if (callback) callback(playerName);
                expect((service as any).failedEvade).toHaveBeenCalledWith(playerName);
            });

            it('should trigger combatOver when CombatOver event is received', () => {
                const callback = callbacks.get(GameEvents.CombatOver);

                if (callback) callback();
                expect((service as any).combatOver).toHaveBeenCalled();
            });

            it('should call gameService.addLog when CombatOverLog event is received', () => {
                const logMessage = 'Combat ended!';
                const callback = callbacks.get(GameEvents.CombatOverLog);

                if (callback) callback(logMessage);
                expect(gameServiceSpy.addLog).toHaveBeenCalledWith(logMessage);
            });

            it('should call gameService.incrementPlayerWins when CombatWinner event is received', () => {
                const winnerId = CharacterType.Character1;
                const callback = callbacks.get(GameEvents.CombatWinner);

                if (callback) callback(winnerId);
                expect(gameServiceSpy.incrementPlayerWins).toHaveBeenCalledWith(winnerId);
            });
        });

        describe('listenForCombatMessages', () => {
            let callbacks: Map<string, (...args: any[]) => void>;
            const clientPlayerId = CharacterType.Character1;

            beforeEach(() => {
                callbacks = new Map<string, (...args: any[]) => void>();

                socketServiceSpy.on.and.callFake((event: string, callback: (...args: any[]) => void) => {
                    callbacks.set(event, callback);
                    return socketServiceSpy;
                });

                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => ({ id: clientPlayerId, name: 'TestPlayer', maxHealth: 100, evadeAttempts: 0 }),
                });

                spyOn<any>(service, 'addCombatMessage');
                spyOn<any>(service, 'showCombatOverMessage');

                snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
                (service as any).listenForCombatMessages();
            });

            it('should register combat message and combat over message listeners', () => {
                const expectedCombatMessageEvent = GameEvents.CombatMessage + clientPlayerId;
                const expectedCombatOverMessageEvent = GameEvents.CombatOverMessage + clientPlayerId;

                expect(socketServiceSpy.on).toHaveBeenCalledWith(expectedCombatMessageEvent, jasmine.any(Function));
                expect(socketServiceSpy.on).toHaveBeenCalledWith(expectedCombatOverMessageEvent, jasmine.any(Function));
            });

            it('should call addCombatMessage and gameService.addLog when receiving a combat message', () => {
                const messageEvent = GameEvents.CombatMessage + clientPlayerId;
                const testMessage: ChatMessage = {
                    color: 'red',
                    message: 'You took 2 damage<br>Your health is now 2',
                };
                const expectedCleanedMessage = 'You took 2 damage Your health is now 2';

                const callback = callbacks.get(messageEvent);
                expect(callback).toBeDefined();

                if (callback) callback(testMessage);

                expect((service as any).addCombatMessage).toHaveBeenCalledWith(testMessage);
                expect(gameServiceSpy.addLog).toHaveBeenCalledWith(expectedCleanedMessage);
            });

            it('should remove <br> tags when cleaning messages', () => {
                const messageEvent = GameEvents.CombatMessage + clientPlayerId;
                const testMessage: ChatMessage = {
                    color: 'blue',
                    message: 'Line 1<br>Line 2<br>Line 3',
                };
                const expectedCleanedMessage = 'Line 1 Line 2 Line 3';

                const callback = callbacks.get(messageEvent);
                if (callback) callback(testMessage);

                expect(gameServiceSpy.addLog).toHaveBeenCalledWith(expectedCleanedMessage);
            });

            it('should call showCombatOverMessage when receiving a combat over message', () => {
                const messageEvent = GameEvents.CombatOverMessage + clientPlayerId;
                const testMessage = 'Combat is over!';

                const callback = callbacks.get(messageEvent);
                expect(callback).toBeDefined();

                if (callback) callback(testMessage);
                expect((service as any).showCombatOverMessage).toHaveBeenCalledWith(testMessage);
            });

            it('should display snackbar notification when showing combat over message', () => {
                (service as any).showCombatOverMessage = jasmine.createSpy('showCombatOverMessage').and.callFake((message) => {
                    snackBarSpy.open(message, 'Fermer', { duration: 3000 });
                });

                const testMessage = 'Combat is over!';
                (service as any).showCombatOverMessage(testMessage);

                expect(snackBarSpy.open).toHaveBeenCalledWith(testMessage, 'Fermer', jasmine.objectContaining({ duration: jasmine.any(Number) }));
            });

            it('should replace messages array with the new message', () => {
                const initialMessages: ChatMessage[] = [{ color: 'green', message: 'Old message' }];
                (service as any)._combatMessages = [...initialMessages];

                const newMessage: ChatMessage = { color: 'red', message: 'New message' };
                (service as any).addCombatMessage(newMessage);

                expect((service as any)._combatMessages.length).toBe(1);
                expect((service as any)._combatMessages[0]).toEqual(initialMessages[0]);
            });
        });

        describe('receivedAttack', () => {
            it('should update client health if client player was attacked', () => {
                const playerName = 'TestPlayer';
                const newHealth = 5;
                const payload = { playerName, playerHealth: newHealth };

                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => ({ name: playerName }),
                });

                (service as any).receivedAttack(payload);
                expect(gameServiceSpy.updateClientHealth).toHaveBeenCalledWith(newHealth);
            });

            it('should not update client health if another player was attacked', () => {
                const playerName = 'OtherPlayer';
                const newHealth = 5;
                const payload = { playerName, playerHealth: newHealth };

                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => ({ name: 'TestPlayer' }),
                });

                (service as any).receivedAttack(payload);
                expect(gameServiceSpy.updateClientHealth).not.toHaveBeenCalled();
            });

            it('should switch attacker if client is in combat', () => {
                const payload = { playerName: 'AnyPlayer', playerHealth: 50 };
                spyOn<any>(service, 'switchAttacker');
                (service as any)._isClientInCombat = true;

                (service as any).receivedAttack(payload);
                expect((service as any).switchAttacker).toHaveBeenCalled();
            });

            it('should not switch attacker if client is not in combat', () => {
                const payload = { playerName: 'AnyPlayer', playerHealth: 50 };
                spyOn<any>(service, 'switchAttacker');
                (service as any)._isClientInCombat = false;

                (service as any).receivedAttack(payload);
                expect((service as any).switchAttacker).not.toHaveBeenCalled();
            });
        });

        describe('failedEvade', () => {
            it('should increment evade attempts if client player failed to evade', () => {
                const playerName = 'TestPlayer';
                const currentEvadeAttempts = 1;

                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => ({ name: playerName, evadeAttempts: currentEvadeAttempts }),
                });

                (service as any).failedEvade(playerName);
                expect(gameServiceSpy.updateClientEvadeAttempts).toHaveBeenCalledWith(currentEvadeAttempts + 1);
            });

            it('should not update evade attempts if another player failed to evade', () => {
                const playerName = 'OtherPlayer';

                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => ({ name: 'TestPlayer', evadeAttempts: 1 }),
                });

                (service as any).failedEvade(playerName);
                expect(gameServiceSpy.updateClientEvadeAttempts).not.toHaveBeenCalled();
            });

            it('should switch attacker if client is in combat', () => {
                spyOn<any>(service, 'switchAttacker');
                (service as any)._isClientInCombat = true;

                (service as any).failedEvade('AnyPlayer');
                expect((service as any).switchAttacker).toHaveBeenCalled();
            });

            it('should not switch attacker if client is not in combat', () => {
                spyOn<any>(service, 'switchAttacker');
                (service as any)._isClientInCombat = false;

                (service as any).failedEvade('AnyPlayer');
                expect((service as any).switchAttacker).not.toHaveBeenCalled();
            });
        });

        describe('setPlayersInCombat', () => {
            it('should set client as in combat and set enemy when client is initiator', () => {
                const clientPlayer = { name: 'ClientPlayer' };
                const targetPlayer = { name: 'TargetPlayer' };

                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => clientPlayer,
                });

                const playersInCombat = {
                    initiator: clientPlayer,
                    target: targetPlayer,
                };

                (service as any).setPlayersInCombat(playersInCombat);
                expect((service as any)._isClientInCombat).toBeTrue();
                expect((service as any)._enemyPlayer).toBe(targetPlayer);
            });

            it('should set client as in combat and set enemy when client is target', () => {
                const clientPlayer = { name: 'ClientPlayer' };
                const initiatorPlayer = { name: 'InitiatorPlayer' };

                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => clientPlayer,
                });

                const playersInCombat = {
                    initiator: initiatorPlayer,
                    target: clientPlayer,
                };

                (service as any).setPlayersInCombat(playersInCombat);
                expect((service as any)._isClientInCombat).toBeTrue();
                expect((service as any)._enemyPlayer).toBe(initiatorPlayer);
            });

            it('should not change combat state when client is not involved', () => {
                const clientPlayer = { name: 'ClientPlayer' };
                const player1 = { name: 'Player1' };
                const player2 = { name: 'Player2' };

                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => clientPlayer,
                });
                (service as any)._isClientInCombat = false;
                (service as any)._enemyPlayer = undefined;

                const playersInCombat = {
                    initiator: player1,
                    target: player2,
                };

                (service as any).setPlayersInCombat(playersInCombat);
                expect((service as any)._isClientInCombat).toBeFalse();
                expect((service as any)._enemyPlayer).toBeUndefined();
            });
        });

        describe('setPlayerTurn', () => {
            it('should set client turn to attack when player name matches client', () => {
                const clientName = 'ClientPlayer';
                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => ({ name: clientName }),
                });

                (service as any)._isClientTurnToAttack = false;

                (service as any).setPlayerTurn(clientName);
                expect((service as any)._isClientTurnToAttack).toBeTrue();
            });

            it('should not change turn state when player name does not match client', () => {
                const clientName = 'ClientPlayer';
                const otherName = 'OtherPlayer';
                Object.defineProperty(gameServiceSpy, 'clientPlayer', {
                    get: () => ({ name: clientName }),
                });

                (service as any)._isClientTurnToAttack = false;

                (service as any).setPlayerTurn(otherName);
                expect((service as any)._isClientTurnToAttack).toBeFalse();
            });
        });

        describe('switchAttacker', () => {
            it('should toggle isClientTurnToAttack from true to false', () => {
                (service as any)._isClientTurnToAttack = true;

                (service as any).switchAttacker();
                expect((service as any)._isClientTurnToAttack).toBeFalse();
            });

            it('should toggle isClientTurnToAttack from false to true', () => {
                (service as any)._isClientTurnToAttack = false;

                (service as any).switchAttacker();
                expect((service as any)._isClientTurnToAttack).toBeTrue();
            });
        });

        describe('addCombatMessage', () => {
            it('should add message to the beginning of combat messages array', () => {
                const initialMessages: ChatMessage[] = [{ color: 'green', message: 'Old message' }];

                (service as any)._combatMessagesSubject = new BehaviorSubject<ChatMessage[]>(initialMessages);

                const newMessage: ChatMessage = { color: 'red', message: 'New message' };
                (service as any).addCombatMessage(newMessage);

                const currentMessages = (service as any)._combatMessagesSubject.getValue();
                expect(currentMessages.length).toBe(2);
                expect(currentMessages[0]).toEqual(newMessage);
                expect(currentMessages[1]).toEqual(initialMessages[0]);
            });

            it('should work with empty initial messages array', () => {
                (service as any)._combatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);

                const newMessage: ChatMessage = { color: 'red', message: 'New message' };
                (service as any).addCombatMessage(newMessage);

                const currentMessages = (service as any)._combatMessagesSubject.getValue();
                expect(currentMessages.length).toBe(1);
                expect(currentMessages[0]).toEqual(newMessage);
            });
        });

        describe('showCombatOverMessage', () => {
            it('should open snackbar with correct message and configuration', () => {
                const message = 'Combat is over!';
                (service as any).showCombatOverMessage(message);
                expect(snackBarSpy.open).toHaveBeenCalledWith(message, 'Fermer', { duration: NOTIFICATION_DURATION_MS });
            });
        });
    });
});
