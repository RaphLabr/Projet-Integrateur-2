// Disabling magic numbers to simplify testing
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */
// Disabling lint to access private properties for testing purposes
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GameDisplayData } from '@app/interfaces/game-display-data';
import { GameMapService } from '@app/services/game-map-service/game-map.service';
import { GameService } from '@app/services/game-service/game.service';
import { GameStatisticsService } from '@app/services/game-statistics-page-service/game-statistics-page-service.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { Dice } from '@common/dice';
import { DoorUpdateData } from '@common/door-update-data';
import { GameEvents } from '@common/game-events';
import { GameMode } from '@common/game-mode';
import { ItemDropDataToClient } from '@common/item-drop-data-client';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Teams } from '@common/teams';
import { NOTIFICATION_DURATION_MS } from '@common/timer-constants';
import { BehaviorSubject } from 'rxjs';

describe('GameService', () => {
    let service: GameService;
    let socketClientServiceMock: jasmine.SpyObj<SocketClientService>;
    let gameMapServiceMock: jasmine.SpyObj<GameMapService>;
    const gameStatisticsServiceMock = jasmine.createSpyObj('GameStatisticsService', ['updateStatistics']);

    beforeEach(() => {
        socketClientServiceMock = jasmine.createSpyObj('SocketClientService', ['on', 'emit', 'emitPlayerQuit'], {
            socket: jasmine.createSpyObj('Socket', ['on', 'emit', 'disconnect']),
        });
        gameMapServiceMock = jasmine.createSpyObj('GameMapService', [
            'initializeMap',
            'hideActiveAndPathTiles',
            'showReachableAndPathTiles',
            'removeCharacterFromTile',
            'removeItemOnTile',
            'updateDoor',
            'showShortestPath',
            'isActionPossibleFromTile',
            'getCharacterOnTile',
            'dropItem',
            'showActionTiles',
        ]);

        TestBed.configureTestingModule({
            imports: [MatSnackBarModule],
            providers: [
                { provide: SocketClientService, useValue: socketClientServiceMock },
                { provide: GameMapService, useValue: gameMapServiceMock },
                { provide: GameStatisticsService, useValue: gameStatisticsServiceMock },
            ],
        });
        service = TestBed.inject(GameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Getters and Setters', () => {
        const testGameId = 'test-game-id';
        const testPlayer: Player = {
            id: CharacterType.Character1,
            userId: 'test-user-id',
            name: 'TestPlayer',
            attack: 5,
            defense: 5,
            maxHealth: 10,
            health: 10,
            speed: 3,
            wins: 0,
            startPosition: { x: 0, y: 0 },
            dice: { attack: 6, defense: 4 } as Dice,
            items: [],
            evadeAttempts: 0,
            hasAbandoned: false,
            team: Teams.NoTeam,
            isTorchActive: false,
            isBarrelActive: false,
        };

        it('should handle getters and setters correctly', () => {
            (service as any)._logsSubject = new BehaviorSubject<string[]>([]);
            (service as any)._gameId = testGameId;
            expect(service.gameId).toBe(testGameId);

            (service as any)._clientPlayer = testPlayer;
            expect(service.clientPlayer).toBe(testPlayer);

            const testGameDisplay = { gameName: 'Test Game' } as GameDisplayData;
            (service as any)._gameDisplay = testGameDisplay;
            expect(service.gameDisplay).toBe(testGameDisplay);

            (service as any)._isClientAdmin = true;
            expect(service.isClientAdmin).toBeTrue();

            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: false,
                isActionEnabled: false,
                isGameInCombat: true,
            };
            service.isGameInCombat = true;
            expect((service as any)._gameState.isGameInCombat).toBeTrue();
        });
    });

    describe('Static Methods', () => {
        describe('mapSizeToString', () => {
            const cases = [
                { input: MapSize.Small, expected: 'petite' },
                { input: MapSize.Medium, expected: 'moyenne' },
                { input: MapSize.Large, expected: 'large' },
            ];

            cases.forEach(({ input, expected }) => {
                it(`should convert MapSize.${MapSize[input]} to "${expected}"`, () => {
                    expect(GameService['mapSizeToString'](input)).toBe(expected);
                });
            });
        });

        it('createEmptyGameDisplayData should return a correctly structured empty game display data object', () => {
            const emptyGameDisplay = GameService['createEmptyGameDisplayData']();

            expect(emptyGameDisplay).toBeDefined();
            expect(emptyGameDisplay.gameName).toBe('');
            expect(emptyGameDisplay.mapSize).toBe('');
            expect(emptyGameDisplay.currentPlayerName).toBe('');
            expect(emptyGameDisplay.numberOfPlayers).toBe(0);
            expect(emptyGameDisplay.timeLeft).toBe(0);
            expect(emptyGameDisplay.playerDisplay).toEqual([]);
            expect(emptyGameDisplay.notification).toBe('');
            expect(emptyGameDisplay.adminCharacterId).toBe(CharacterType.NoCharacter);
        });
    });

    describe('GameService Methods', () => {
        it('should initialize game display correctly', () => {
            const mockGameId = 'test-game-id';
            const mockGameData = {
                gameName: 'Test Game',
                mapSize: MapSize.Medium,
                mapTerrain: [],
                players: [
                    {
                        id: CharacterType.Character1,
                        userId: 'user1',
                        name: 'Player1',
                        attack: 5,
                        defense: 5,
                        maxHealth: 10,
                        health: 10,
                        speed: 3,
                        wins: 0,
                        startPosition: { x: 0, y: 0 },
                        dice: { attack: 6, defense: 4 } as Dice,
                        items: [],
                        evadeAttempts: 0,
                        hasAbandoned: false,
                        team: Teams.RedTeam,
                        isTorchActive: false,
                        isBarrelActive: false,
                    },
                    {
                        id: CharacterType.Character2,
                        userId: 'user2',
                        name: 'Player2',
                        attack: 5,
                        defense: 5,
                        maxHealth: 10,
                        health: 10,
                        speed: 3,
                        wins: 0,
                        startPosition: { x: 1, y: 1 },
                        dice: { attack: 6, defense: 4 } as Dice,
                        items: [],
                        evadeAttempts: 0,
                        hasAbandoned: false,
                        team: Teams.BlueTeam,
                        isTorchActive: false,
                        isBarrelActive: false,
                    },
                ],
                clientId: CharacterType.Character1,
                adminId: CharacterType.Character1,
                mode: GameMode.CaptureTheFlag,
            };

            const initializePlayersSpy = spyOn<any>(service, 'initializePlayers').and.callThrough();

            service.initializeGameDisplay(mockGameData, mockGameId);

            expect((service as any)._gameState).toEqual({
                isInDebugMode: false,
                isClientPlaying: false,
                isActionEnabled: false,
                isGameInCombat: false,
                isDroppingItem: false,
                isInMovement: false,
            });

            expect(service.gameId).toBe(mockGameId);

            expect(service.gameDisplay.gameName).toBe(mockGameData.gameName);
            expect(service.gameDisplay.mapSize).toBe('moyenne');

            expect(initializePlayersSpy).toHaveBeenCalledWith(mockGameData.players, mockGameData.clientId, mockGameData.adminId);

            expect(gameMapServiceMock.initializeMap).toHaveBeenCalledWith(mockGameData.mapTerrain, mockGameData.mapSize, CharacterType.Character1);

            expect(service.logs).toEqual([]);
        });

        it('should configure socket features correctly', () => {
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
                name: 'testPlayer',
                items: [],
            } as any;
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: false,
                isActionEnabled: false,
                isGameInCombat: false,
            };
            const startRoundSpy = spyOn<any>(service, 'startRound');
            const startNotificationPeriodSpy = spyOn<any>(service, 'startNotificationPeriod');
            const addLogSpy = spyOn<any>(service, 'addLog');
            const onPlayerQuitSpy = spyOn(service, 'onPlayerQuit');
            const kickLastPlayerSpy = spyOn<any>(service, 'kickLastPlayer');

            const eventHandlers: { [event: string]: (...args: any[]) => void } = {};
            socketClientServiceMock.on.and.callFake((event, callback) => {
                eventHandlers[event] = callback;
            });

            service.configureSocketFeatures();

            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.StartRound, jasmine.any(Function));
            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.StartNotification, jasmine.any(Function));
            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.TimerUpdate, jasmine.any(Function));
            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.EndOfMovement, jasmine.any(Function));
            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.ToggleDebug, jasmine.any(Function));
            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.GameOver, jasmine.any(Function));
            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.PlayerQuit, jasmine.any(Function));
            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.UpdateDoor, jasmine.any(Function));
            expect(socketClientServiceMock.on).toHaveBeenCalledWith(GameEvents.KickUser, jasmine.any(Function));

            eventHandlers[GameEvents.StartRound]();
            expect(startRoundSpy).toHaveBeenCalled();

            const testPlayerName = 'TestPlayer';
            eventHandlers[GameEvents.StartNotification](testPlayerName);
            expect(startNotificationPeriodSpy).toHaveBeenCalledWith(testPlayerName);
            expect(addLogSpy).toHaveBeenCalledWith(`Début du tour de ${testPlayerName}`);

            const testTimerValue = 42;
            eventHandlers[GameEvents.TimerUpdate](testTimerValue);
            expect((service as any)._gameDisplay.timeLeft).toBe(testTimerValue);

            eventHandlers[GameEvents.ToggleDebug](true);
            expect((service as any)._gameState.isInDebugMode).toBeTrue();
            expect(addLogSpy).toHaveBeenCalledWith('Mode de débogage activé');

            const quitData = {
                playerName: 'QuitterPlayer',
                playerPosition: { x: 1, y: 1 },
                playerStartPosition: { x: 0, y: 0 },
            };
            eventHandlers[GameEvents.PlayerQuit](quitData);
            expect(addLogSpy).toHaveBeenCalledWith(`${quitData.playerName} abandonne`);
            expect(onPlayerQuitSpy).toHaveBeenCalledWith(quitData);

            eventHandlers[GameEvents.KickUser]();
            expect(kickLastPlayerSpy).toHaveBeenCalled();
        });

        it('should handle EndOfMovement event correctly when client is playing', () => {
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
                name: 'testPlayer',
                items: [],
            } as any;
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: true,
                isActionEnabled: false,
                isGameInCombat: false,
            };

            const eventHandlers: { [event: string]: (...args: any[]) => void } = {};
            socketClientServiceMock.on.and.callFake((event, callback) => {
                eventHandlers[event] = callback;
            });

            service.configureSocketFeatures();

            eventHandlers[GameEvents.EndOfMovement]();

            expect(gameMapServiceMock.hideActiveAndPathTiles).toHaveBeenCalled();
            expect(gameMapServiceMock.showReachableAndPathTiles).toHaveBeenCalled();
        });

        it('should handle GameOver event correctly', () => {
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
                name: 'testPlayer',
                items: [],
            } as any;
            (service as any)._gameDisplay.playerDisplay = [
                { characterId: CharacterType.Character1, name: 'Player1', wins: 0, hasAbandoned: false },
                { characterId: CharacterType.Character2, name: 'Player2', wins: 0, hasAbandoned: false },
                { characterId: CharacterType.Character3, name: 'Player3', wins: 0, hasAbandoned: true },
            ];

            const endGameSpy = spyOn<any>(service, 'endGame');
            const addLogSpy = spyOn<any>(service, 'addLog');

            const eventHandlers: { [event: string]: (...args: any[]) => void } = {};
            socketClientServiceMock.on.and.callFake((event, callback) => {
                eventHandlers[event] = callback;
            });

            service.configureSocketFeatures();

            const winnerName = 'Player1';
            eventHandlers[GameEvents.GameOver](winnerName);

            expect(endGameSpy).toHaveBeenCalledWith(winnerName);
            expect(addLogSpy).toHaveBeenCalledWith('Fin de partie et il reste Player1, Player2');
        });

        it('should handle UpdateDoor event correctly when round is over', () => {
            (service as any)._logsSubject = new BehaviorSubject<string[]>([]);
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
                name: 'testPlayer',
                items: [],
            } as any;
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: true,
                isActionEnabled: false,
                isGameInCombat: false,
            };
            const player: Player = {
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

            const doorUpdateData: DoorUpdateData = {
                newDoorType: MapTileType.OpenDoor,
                doorCoordinates: { x: 5, y: 5 },
                player,
            };

            gameMapServiceMock.updateDoor.calls.reset();

            const eventHandlers: { [event: string]: (...args: any[]) => void } = {};
            socketClientServiceMock.on.and.callFake((event, callback) => {
                eventHandlers[event] = callback;
            });

            service.configureSocketFeatures();

            eventHandlers[GameEvents.UpdateDoor](doorUpdateData);

            expect(gameMapServiceMock.updateDoor).toHaveBeenCalledWith(doorUpdateData);
        });

        it('should handle UpdateDoor event correctly when round is not over', () => {
            (service as any)._logsSubject = new BehaviorSubject<string[]>([]);
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
                name: 'testPlayer',
                items: [],
            } as any;
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: true,
                isActionEnabled: false,
                isGameInCombat: false,
            };
            const player: Player = {
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

            const doorUpdateData: DoorUpdateData = {
                newDoorType: MapTileType.OpenDoor,
                doorCoordinates: { x: 5, y: 5 },
                player,
            };

            gameMapServiceMock.updateDoor.calls.reset();

            const onEndRoundClickSpy = spyOn(service, 'onEndRoundClick');

            const eventHandlers: { [event: string]: (...args: any[]) => void } = {};
            socketClientServiceMock.on.and.callFake((event, callback) => {
                eventHandlers[event] = callback;
            });

            service.configureSocketFeatures();

            eventHandlers[GameEvents.UpdateDoor](doorUpdateData);

            expect(gameMapServiceMock.updateDoor).toHaveBeenCalledWith(doorUpdateData);
            expect(onEndRoundClickSpy).not.toHaveBeenCalled();
        });

        describe('onPlayerQuit', () => {
            it('should mark player as abandoned and remove character and item', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: false,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };
                (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
                (service as any)._gameDisplay.playerDisplay = [
                    { characterId: CharacterType.Character1, name: 'Player1', wins: 0, hasAbandoned: false },
                    { characterId: CharacterType.Character2, name: 'Player2', wins: 0, hasAbandoned: false },
                ];

                const quitData = {
                    playerName: 'Player1',
                    playerPosition: { x: 1, y: 1 },
                    playerStartPosition: { x: 0, y: 0 },
                };

                service.onPlayerQuit(quitData);
                expect((service as any)._gameDisplay.playerDisplay[0].hasAbandoned).toBeTrue();
                expect(gameMapServiceMock.removeCharacterFromTile).toHaveBeenCalledWith(quitData.playerPosition);
                expect(gameMapServiceMock.removeItemOnTile).toHaveBeenCalledWith(quitData.playerStartPosition);
            });

            it('should do nothing if player is not found', () => {
                (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
                (service as any)._gameDisplay.playerDisplay = [
                    { characterId: CharacterType.Character1, name: 'Player1', wins: 0, hasAbandoned: false },
                ];

                const quitData = {
                    playerName: 'NonExistentPlayer',
                    playerPosition: { x: 1, y: 1 },
                    playerStartPosition: { x: 0, y: 0 },
                };

                gameMapServiceMock.removeCharacterFromTile.calls.reset();
                gameMapServiceMock.removeItemOnTile.calls.reset();
                service.onPlayerQuit(quitData);
                expect(gameMapServiceMock.removeCharacterFromTile).not.toHaveBeenCalled();
                expect(gameMapServiceMock.removeItemOnTile).not.toHaveBeenCalled();
            });
        });

        describe('toggleClientInAction', () => {
            it('should toggle isActionEnabled when client is playing', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: true,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };

                service.toggleClientInAction();
                expect((service as any)._gameState.isActionEnabled).toBeTrue();
            });

            it('should not toggle isActionEnabled when client is not playing', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: false,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };

                service.toggleClientInAction();
                expect((service as any)._gameState.isActionEnabled).toBeFalse();
            });
        });

        describe('onTileHover', () => {
            it('should update hoveredTileCoordinates and show shortest path when client is playing and not in combat', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: true,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };

                const testCoordinates = { x: 5, y: 5 };
                gameMapServiceMock.showShortestPath.calls.reset();
                service.onTileHover(testCoordinates);
                expect(gameMapServiceMock.hoveredTileCoordinates).toEqual(testCoordinates);
                expect(gameMapServiceMock.showShortestPath).toHaveBeenCalled();
            });

            it('should only update hoveredTileCoordinates when client is not playing', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: false,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };

                const testCoordinates = { x: 5, y: 5 };
                gameMapServiceMock.showShortestPath.calls.reset();
                service.onTileHover(testCoordinates);
                expect(gameMapServiceMock.hoveredTileCoordinates).toEqual(testCoordinates);
                expect(gameMapServiceMock.showShortestPath).not.toHaveBeenCalled();
            });

            it('should only update hoveredTileCoordinates when client is in combat', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: true,
                    isActionEnabled: false,
                    isGameInCombat: true,
                };

                const testCoordinates = { x: 5, y: 5 };
                gameMapServiceMock.showShortestPath.calls.reset();
                service.onTileHover(testCoordinates);
                expect(gameMapServiceMock.hoveredTileCoordinates).toEqual(testCoordinates);
                expect(gameMapServiceMock.showShortestPath).not.toHaveBeenCalled();
            });
        });

        describe('onEndRoundClick', () => {
            it('should call endRound when client is playing', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: true,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };

                const endRoundSpy = spyOn<any>(service, 'endRound');
                service.onEndRoundClick();
                expect(endRoundSpy).toHaveBeenCalled();
            });

            it('should not call endRound when client is not playing', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: false,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };

                const endRoundSpy = spyOn<any>(service, 'endRound');
                service.onEndRoundClick();
                expect(endRoundSpy).not.toHaveBeenCalled();
            });
        });

        describe('startNotificationPeriod', () => {
            beforeEach(() => {
                (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
                (service as any)._clientPlayer = {
                    name: 'TestPlayer',
                };
            });

            it('should update game state when client is playing', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: true,
                    isActionEnabled: true,
                    isGameInCombat: false,
                };

                service.startNotificationPeriod('OtherPlayer');

                expect(gameMapServiceMock.hideActiveAndPathTiles).toHaveBeenCalled();

                expect((service as any)._gameState.isActionEnabled).toBeFalse();
                expect((service as any)._gameState.isClientPlaying).toBeFalse();
                expect((service as any)._gameDisplay.currentPlayerName).toBe('OtherPlayer');
                expect((service as any)._isClientNextPlayer).toBeFalse();
                expect((service as any)._gameDisplay.notification).toBe("C'est à OtherPlayer de jouer !");
            });

            it('should set client as next player when notification is for client', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: false,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };

                service.startNotificationPeriod('TestPlayer');

                expect((service as any)._gameDisplay.currentPlayerName).toBe('TestPlayer');
                expect((service as any)._isClientNextPlayer).toBeTrue();
                expect((service as any)._gameDisplay.notification).toBe("C'est à vous de jouer !");
            });

            it('should not call hideReachableAndPathTiles when client is not playing', () => {
                (service as any)._gameState = {
                    isInDebugMode: false,
                    isClientPlaying: false,
                    isActionEnabled: false,
                    isGameInCombat: false,
                };

                gameMapServiceMock.hideActiveAndPathTiles.calls.reset();
                service.startNotificationPeriod('OtherPlayer');
                expect(gameMapServiceMock.hideActiveAndPathTiles).not.toHaveBeenCalled();
                expect((service as any)._gameDisplay.currentPlayerName).toBe('OtherPlayer');
            });
        });
    });

    describe('startRound', () => {
        beforeEach(() => {
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
        });

        it('should clear notification and set up client round when client is next player', () => {
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: false,
                isActionEnabled: false,
                isGameInCombat: false,
            };
            (service as any)._isClientNextPlayer = true;
            (service as any)._clientPlayer = {
                speed: 3,
            };

            service.startRound();

            expect(service.gameDisplay.notification).toBe('');

            expect(service.isActionUsed).toBeFalse();
            expect((service as any)._gameState.isClientPlaying).toBeTrue();

            expect(gameMapServiceMock.movementLeft).toBe(3);
            expect(gameMapServiceMock.showReachableAndPathTiles).toHaveBeenCalled();
        });

        it('should only clear notification when client is not next player', () => {
            (service as any)._isClientNextPlayer = false;
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: false,
                isActionEnabled: false,
                isGameInCombat: false,
            };

            gameMapServiceMock.showReachableAndPathTiles.calls.reset();

            service.startRound();

            expect(service.gameDisplay.notification).toBe('');
            expect((service as any)._gameState.isClientPlaying).toBeFalse();
            expect(gameMapServiceMock.showReachableAndPathTiles).not.toHaveBeenCalled();
        });
    });

    describe('quitGame', () => {
        it('should mark client as abandoned, emit quit event, and disconnect socket', async () => {
            (service as any)._clientPlayer = {
                name: 'TestPlayer',
                hasAbandoned: false,
            };
            (service as any)._gameId = 'test-game-id';
            Object.defineProperty(gameMapServiceMock, 'clientPosition', {
                get: () => ({ x: 5, y: 5 }),
            });

            await service.quitGame();

            expect((service as any)._clientPlayer.hasAbandoned).toBeTrue();
            expect(socketClientServiceMock.emitPlayerQuit).toHaveBeenCalledWith({
                gameId: 'test-game-id',
                playerName: 'TestPlayer',
                playerPosition: { x: 5, y: 5 },
            });

            expect(socketClientServiceMock.socket.disconnect).toHaveBeenCalled();
        });
    });

    describe('incrementPlayerWins', () => {
        it('should increment wins for the player with matching ID', () => {
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            (service as any)._gameDisplay.playerDisplay = [
                { characterId: CharacterType.Character1, name: 'Player1', wins: 0, hasAbandoned: false },
                { characterId: CharacterType.Character2, name: 'Player2', wins: 1, hasAbandoned: false },
                { characterId: CharacterType.Character3, name: 'Player3', wins: 2, hasAbandoned: false },
            ];

            service.incrementPlayerWins(CharacterType.Character2);

            expect((service as any)._gameDisplay.playerDisplay[0].wins).toBe(0);
            expect((service as any)._gameDisplay.playerDisplay[2].wins).toBe(2);
        });

        it('should do nothing if no player has matching ID', () => {
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            (service as any)._gameDisplay.playerDisplay = [{ characterId: CharacterType.Character1, name: 'Player1', wins: 0, hasAbandoned: false }];

            service.incrementPlayerWins(CharacterType.Character2);

            expect((service as any)._gameDisplay.playerDisplay[0].wins).toBe(0);
        });
    });

    describe('updateClientHealth', () => {
        it('should update client player health', () => {
            (service as any)._clientPlayer = {
                health: 10,
                items: [],
                defense: 5,
                attack: 5,
            };

            service.updateClientHealth(5);

            expect((service as any)._clientPlayer.health).toBe(5);
        });
    });

    describe('addLog', () => {
        it('should add formatted log message with timestamp', () => {
            (service as any)._logsSubject = new BehaviorSubject<string[]>([]);

            jasmine.clock().install();
            const baseTime = new Date(2023, 0, 1, 12, 0, 0);
            jasmine.clock().mockDate(baseTime);

            service.addLog('Test log message');

            expect(service.logs.length).toBe(1);
            expect(service.logs[0]).toBe('[12:00:00]: Test log message');

            jasmine.clock().uninstall();
        });
    });

    describe('updateClientEvadeAttempts', () => {
        it('should update client player evade attempts', () => {
            (service as any)._clientPlayer = {
                evadeAttempts: 0,
            };

            service.updateClientEvadeAttempts(2);
            expect((service as any)._clientPlayer.evadeAttempts).toBe(2);
        });
    });

    describe('createCombatRequestPayload', () => {
        it('should create correct combat request payload', () => {
            (service as any)._gameId = 'test-game-id';
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
            };
            Object.defineProperty(gameMapServiceMock, 'clientPosition', {
                get: () => ({ x: 1, y: 1 }),
            });
            const opponentPosition = { x: 2, y: 2 };
            gameMapServiceMock.getCharacterOnTile.and.returnValue(CharacterType.Character2);
            const payload = service.createCombatRequestPayload(opponentPosition);

            expect(payload).toEqual({
                gameId: 'test-game-id',
                initiatorId: CharacterType.Character1,
                targetId: CharacterType.Character2,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            });
        });
    });

    describe('endRound', () => {
        it('should emit end round event with game ID', () => {
            (service as any)._gameId = 'test-game-id';
            (service as any).endRound();
            expect(socketClientServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.EndRound, 'test-game-id');
        });
    });

    describe('endGame', () => {
        beforeEach(() => {
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: true,
                isActionEnabled: false,
                isGameInCombat: false,
            };
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
        });

        it('should set isClientPlaying to false and show winning message when client is winner', () => {
            (service as any)._clientPlayer = {
                name: 'TestPlayer',
            };

            (service as any).endGame('TestPlayer');
            expect((service as any)._gameState.isClientPlaying).toBeFalse();
            expect((service as any)._gameDisplay.notification).toBe('Vous avez gagné !');
        });

        it('should set isClientPlaying to false and show different winner message when client is not winner', () => {
            (service as any)._clientPlayer = {
                name: 'TestPlayer',
                team: Teams.NoTeam,
            };

            (service as any)._gameState = {
                isClientPlaying: true,
            };

            const mockGameStatistics = {
                winner: 'OtherPlayer',
                playerStats: [],
                gameMode: GameMode.Classic,
                mapName: 'Test Map',
            };

            (service as any).endGame(mockGameStatistics);
            expect((service as any)._gameState.isClientPlaying).toBeFalse();
            expect((service as any)._gameDisplay.notification).toBe('OtherPlayer a gagné !');
        });
        it('should set notification to "L\'équipe rouge a gagné !" when client is on Blue team and Red team wins', () => {
            (service as any)._clientPlayer = {
                team: Teams.BlueTeam,
                name: 'BluePlayer',
            };

            const gameStatistics = {
                winnerName: Teams.RedTeam,
                playerStats: [],
                gameMode: GameMode.CaptureTheFlag,
                mapName: 'Test Map',
            };

            (service as any).endGame(gameStatistics);
            expect((service as any)._gameDisplay.notification).toBe("L'équipe rouge a gagné !");
        });

        it('should set notification to "L\'équipe bleue a gagné !" when client is on Red team and Blue team wins', () => {
            (service as any)._clientPlayer = {
                team: Teams.RedTeam,
                name: 'RedPlayer',
            };

            const gameStatistics = {
                winnerName: Teams.BlueTeam,
                playerStats: [],
                gameMode: GameMode.CaptureTheFlag,
                mapName: 'Test Map',
            };

            (service as any).endGame(gameStatistics);
            expect((service as any)._gameDisplay.notification).toBe("L'équipe bleue a gagné !");
        });
    });

    describe('kickLastPlayer', () => {
        let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

        beforeEach(() => {
            snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
        });

        it('should show snackbar and call quitGame when client has not abandoned', () => {
            (service as any)._clientPlayer = {
                hasAbandoned: false,
            };

            spyOn(snackBarSpy, 'open');
            spyOn(service, 'quitGame');

            (service as any).kickLastPlayer();
            expect(snackBarSpy.open).toHaveBeenCalledWith('Vous avez été déconnecté du jeu car vous êtes le dernier joueur restant.', 'OK', {
                duration: jasmine.any(Number),
            });
            expect(service.quitGame).toHaveBeenCalled();
        });

        it('should do nothing when client has already abandoned', () => {
            (service as any)._clientPlayer = {
                hasAbandoned: true,
            };

            spyOn(snackBarSpy, 'open');
            spyOn(service, 'quitGame');

            (service as any).kickLastPlayer();
            expect(snackBarSpy.open).not.toHaveBeenCalled();
            expect(service.quitGame).not.toHaveBeenCalled();
        });
    });

    describe('dropItem', () => {
        it('should remove the item from client player items and emit item drop event', () => {
            (service as any)._clientPlayer = {
                items: [ItemType.Sword, ItemType.Potion1, ItemType.Torch],
                name: 'TestPlayer',
            };
            (service as any)._gameState = {
                isDroppingItem: true,
            };
            (service as any)._gameId = 'testGameId';

            const clientPosition = { x: 3, y: 4 };
            (gameMapServiceMock as any).clientPosition = clientPosition;
            socketClientServiceMock.emitItemDrop = jasmine.createSpy('emitItemDrop');
            service.dropItem(1);

            expect((service as any)._clientPlayer.items).toEqual([ItemType.Sword, ItemType.Torch]);
            expect((service as any)._gameState.isDroppingItem).toBeFalse();
            expect(socketClientServiceMock.emitItemDrop).toHaveBeenCalledWith({
                gameId: 'testGameId',
                itemIndex: 1,
                itemPosition: clientPosition,
            });
        });
    });

    describe('getPlayerNameWithId', () => {
        it('should return the name of the player with the matching ID', () => {
            (service as any)._gameDisplay = {
                playerDisplay: [
                    { id: CharacterType.Character1, name: 'Player1' },
                    { id: CharacterType.Character2, name: 'Player2' },
                    { id: CharacterType.Character3, name: 'Player3' },
                ],
            };

            expect(service.getPlayerNameWithId(CharacterType.Character1)).toBe('Player1');
            expect(service.getPlayerNameWithId(CharacterType.Character2)).toBe('Player2');
            expect(service.getPlayerNameWithId(CharacterType.Character3)).toBe('Player3');
        });

        it('should return undefined when no player has the given ID', () => {
            (service as any)._gameDisplay = {
                playerDisplay: [
                    { id: CharacterType.Character1, name: 'Player1' },
                    { id: CharacterType.Character2, name: 'Player2' },
                ],
            };

            expect(service.getPlayerNameWithId(CharacterType.Character3)).toBeUndefined();
            expect(service.getPlayerNameWithId(CharacterType.Character4)).toBeUndefined();
        });
    });

    describe('incrementPlayerWins', () => {
        it('should increment wins for the player with matching ID', () => {
            (service as any)._gameDisplay = {
                playerDisplay: [
                    { id: CharacterType.Character1, name: 'Player1', wins: 0 },
                    { id: CharacterType.Character2, name: 'Player2', wins: 1 },
                    { id: CharacterType.Character3, name: 'Player3', wins: 2 },
                ],
            };

            service.incrementPlayerWins(CharacterType.Character2);
            expect((service as any)._gameDisplay.playerDisplay[0].wins).toBe(0);
            expect((service as any)._gameDisplay.playerDisplay[1].wins).toBe(2);
            expect((service as any)._gameDisplay.playerDisplay[2].wins).toBe(2);

            service.incrementPlayerWins(CharacterType.Character1);
            expect((service as any)._gameDisplay.playerDisplay[0].wins).toBe(1);
        });
    });

    describe('configureSocketFeatures - Item event handlers', () => {
        beforeEach(() => {
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
                name: 'testPlayer',
                items: [],
            };
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: false,
                isActionEnabled: false,
                isGameInCombat: false,
                isDroppingItem: false,
            };

            spyOn<any>(service, 'addLog');
        });

        it('should add item to player inventory on ItemPickUp event', () => {
            service.configureSocketFeatures();

            const eventName = GameEvents.ItemPickUp + (service as any)._clientPlayer.id;
            const socketOnCalls = (socketClientServiceMock.socket.on as jasmine.Spy).calls.all();
            const itemPickupCall = socketOnCalls.find((call) => call.args[0] === eventName);
            expect(itemPickupCall).toBeTruthy('ItemPickUp event handler was not registered');

            const itemPickupCallback = itemPickupCall?.args[1];

            itemPickupCallback(ItemType.Sword);
            expect((service as any)._clientPlayer.items).toContain(ItemType.Sword);
            expect((service as any)._clientPlayer.items.length).toBe(1);
        });

        it('should set isDroppingItem to true when inventory exceeds 2 items', () => {
            (service as any)._clientPlayer.items = [ItemType.Potion1, ItemType.Torch];
            (service as any)._gameState.isDroppingItem = false;

            service.configureSocketFeatures();

            const eventName = GameEvents.ItemPickUp + (service as any)._clientPlayer.id;
            const socketOnCalls = (socketClientServiceMock.socket.on as jasmine.Spy).calls.all();
            const itemPickupCall = socketOnCalls.find((call) => call.args[0] === eventName);
            const itemPickupCallback = itemPickupCall?.args[1];

            itemPickupCallback(ItemType.Sword);
            expect((service as any)._gameState.isDroppingItem).toBeTrue();
            expect((service as any)._clientPlayer.items.length).toBe(3);
        });

        it('should not set isDroppingItem when inventory has 2 or fewer items', () => {
            (service as any)._clientPlayer.items = [ItemType.Potion1];
            (service as any)._gameState.isDroppingItem = false;

            service.configureSocketFeatures();

            const eventName = GameEvents.ItemPickUp + (service as any)._clientPlayer.id;
            const socketOnCalls = (socketClientServiceMock.socket.on as jasmine.Spy).calls.all();
            const itemPickupCall = socketOnCalls.find((call) => call.args[0] === eventName);
            const itemPickupCallback = itemPickupCall?.args[1];

            itemPickupCallback(ItemType.Sword);

            expect((service as any)._gameState.isDroppingItem).toBeFalse();
            expect((service as any)._clientPlayer.items.length).toBe(2);
        });

        it('should add log message and set flagCharacterId when ItemPickUpLog event is received with a flag', () => {
            service.configureSocketFeatures();

            const eventName = GameEvents.ItemPickUpLog;
            const socketOnCalls = socketClientServiceMock.on.calls.all();
            const itemPickupLogCall = socketOnCalls.find((call) => call.args[0] === eventName);
            expect(itemPickupLogCall).toBeTruthy('ItemPickUpLog event handler was not registered');

            const testItemLog = {
                item: ItemType.Flag,
                playerName: 'TestPlayer',
                id: CharacterType.Character2,
            };

            if (itemPickupLogCall && itemPickupLogCall.args[1]) {
                const itemPickupLogCallback = itemPickupLogCall.args[1];
                itemPickupLogCallback(testItemLog);
            }
            expect(service['addLog']).toHaveBeenCalledWith('Drapeau ramassé par TestPlayer!');
            expect((service as any)._gameDisplay.flagCharacterId).toBe(CharacterType.Character2);
        });

        it('should add log message but not update flagCharacterId for non-flag items', () => {
            (service as any)._gameDisplay.flagCharacterId = CharacterType.NoCharacter;
            service.configureSocketFeatures();

            const eventName = GameEvents.ItemPickUpLog;
            const socketOnCalls = socketClientServiceMock.on.calls.all();
            const itemPickupLogCall = socketOnCalls.find((call) => call.args[0] === eventName);

            const testItemLog = {
                item: ItemType.Sword,
                playerName: 'TestPlayer',
                id: CharacterType.Character2,
            };

            if (itemPickupLogCall && itemPickupLogCall.args[1]) {
                const itemPickupLogCallback = itemPickupLogCall.args[1];
                itemPickupLogCallback(testItemLog);
            }

            expect(service['addLog']).toHaveBeenCalledWith('Épée ramassé par TestPlayer!');
            expect((service as any)._gameDisplay.flagCharacterId).toBe(CharacterType.NoCharacter);
        });

        it('should log when a door is closed by a player', () => {
            service.configureSocketFeatures();

            const eventName = GameEvents.UpdateDoor;
            const socketOnCalls = socketClientServiceMock.on.calls.all();
            const updateDoorCall = socketOnCalls.find((call) => call.args[0] === eventName);
            expect(updateDoorCall).toBeTruthy('UpdateDoor event handler was not registered');

            const doorPayload = {
                newDoorType: MapTileType.ClosedDoor,
                doorCoordinates: { x: 3, y: 4 },
                player: { name: 'DoorCloser' } as Player,
            };

            (service['addLog'] as jasmine.Spy).calls.reset();
            const updateDoorCallback = updateDoorCall?.args[1];
            if (updateDoorCallback) {
                updateDoorCallback(doorPayload);
            } else {
                fail('UpdateDoor callback function not found');
            }
            expect(service['addLog']).toHaveBeenCalledWith('Une porte a été fermée par DoorCloser');
        });

        it('should navigate to statistics page after game over timeout', () => {
            const routerSpy = spyOn((service as any)._router, 'navigate');
            (service as any)._gameId = 'test-game-id';
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            (service as any)._gameDisplay.playerDisplay = [{ name: 'Player1', hasAbandoned: false }];
            (service as any)._clientPlayer = {
                name: 'Player1',
                team: Teams.NoTeam,
            };

            const eventHandlers: { [event: string]: (...args: any[]) => void } = {};
            socketClientServiceMock.on.and.callFake((event, callback) => {
                eventHandlers[event] = callback;
            });
            service.configureSocketFeatures();
            jasmine.clock().install();

            const mockGameStats = {
                winnerName: 'Player1',
                playerStats: [],
                gameMode: GameMode.Classic,
                mapName: 'Test Map',
            };

            eventHandlers[GameEvents.GameOver](mockGameStats);

            expect(service.gameEnded).toBeTrue();
            jasmine.clock().tick(NOTIFICATION_DURATION_MS);
            expect(routerSpy).toHaveBeenCalledWith(['/statistics/test-game-id']);
            jasmine.clock().uninstall();
        });

        it('should handle ToggleDebug event correctly for deactivation', () => {
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
                name: 'testPlayer',
                items: [],
            } as any;
            (service as any)._gameState = {
                isInDebugMode: true,
                isClientPlaying: false,
                isActionEnabled: false,
                isGameInCombat: false,
            };

            const eventHandlers: { [event: string]: (...args: any[]) => void } = {};
            socketClientServiceMock.on.and.callFake((event, callback) => {
                eventHandlers[event] = callback;
            });

            (service['addLog'] as jasmine.Spy).calls.reset();

            service.configureSocketFeatures();
            eventHandlers[GameEvents.ToggleDebug](false);
            expect((service as any)._gameState.isInDebugMode).toBeFalse();
            expect(service['addLog']).toHaveBeenCalledWith('Mode de débogage désactivé');
        });
    });

    describe('configureSocketFeatures - ItemDrop handler', () => {
        beforeEach(() => {
            (service as any)._clientPlayer = {
                id: CharacterType.Character1,
                name: 'testPlayer',
                items: [],
            } as any;
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            service.configureSocketFeatures();
        });

        it('should handle ItemDrop event by calling mapService.dropItem', () => {
            const itemDropCall = socketClientServiceMock.on.calls.all().find((call) => call.args[0] === GameEvents.ItemDrop);
            expect(itemDropCall).toBeTruthy('ItemDrop event handler was not registered');

            const itemDropCallback = itemDropCall?.args[1];

            const itemDropPayload: ItemDropDataToClient = {
                itemCoordinates: { x: 3, y: 4 },
                item: ItemType.Sword,
            };

            gameMapServiceMock.dropItem.calls.reset();

            if (itemDropCallback) {
                itemDropCallback(itemDropPayload);
                expect(gameMapServiceMock.dropItem).toHaveBeenCalledWith(itemDropPayload);
            } else {
                fail('ItemDrop callback not found');
            }
        });
    });

    describe('quitGame early return', () => {
        it('should only save client player name to session storage when game has ended', async () => {
            (service as any)._clientPlayer = {
                name: 'TestPlayer',
                hasAbandoned: false,
            };
            service.gameEnded = true;

            spyOn(sessionStorage, 'setItem');

            await service.quitGame();

            expect(sessionStorage.setItem).toHaveBeenCalledWith('clientPlayerName', 'TestPlayer');
            expect(socketClientServiceMock.emitPlayerQuit).not.toHaveBeenCalled();
            expect(socketClientServiceMock.socket.disconnect).not.toHaveBeenCalled();
            expect((service as any)._clientPlayer.hasAbandoned).toBeTrue();
        });
    });

    describe('onPlayerQuit with client playing status', () => {
        it('should show reachable tiles after player quit when client is playing', () => {
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: true,
                isActionEnabled: false,
                isGameInCombat: false,
            };
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            (service as any)._gameDisplay.playerDisplay = [{ name: 'Player1', hasAbandoned: false }];

            const quitData = {
                playerName: 'Player1',
                playerPosition: { x: 1, y: 1 },
                playerStartPosition: { x: 0, y: 0 },
            };

            gameMapServiceMock.showReachableAndPathTiles.calls.reset();
            service.onPlayerQuit(quitData);
            expect(gameMapServiceMock.showReachableAndPathTiles).toHaveBeenCalled();
        });

        it('should not show reachable tiles after player quit when client is not playing', () => {
            (service as any)._gameState = {
                isInDebugMode: false,
                isClientPlaying: false,
                isActionEnabled: false,
                isGameInCombat: false,
            };
            (service as any)._gameDisplay = GameService['createEmptyGameDisplayData']();
            (service as any)._gameDisplay.playerDisplay = [{ name: 'Player1', hasAbandoned: false }];

            const quitData = {
                playerName: 'Player1',
                playerPosition: { x: 1, y: 1 },
                playerStartPosition: { x: 0, y: 0 },
            };

            gameMapServiceMock.showReachableAndPathTiles.calls.reset();
            service.onPlayerQuit(quitData);
            expect(gameMapServiceMock.showReachableAndPathTiles).not.toHaveBeenCalled();
        });
    });
});
