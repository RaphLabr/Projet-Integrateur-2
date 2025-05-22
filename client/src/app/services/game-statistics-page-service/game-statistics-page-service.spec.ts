// Max line disable since test file
/* eslint-disable max-lines */
// the following disable allows to access the private attribute _gameId
/* eslint-disable @typescript-eslint/no-explicit-any */
// We allow the use of magic numbers in this file since there are a lot of stats to track
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { StatType } from '@app/constants/stat-type';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { GameStatisticsService } from '@app/services/game-statistics-page-service/game-statistics-page-service.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { GameEvents } from '@common/game-events';
import { GameStatistics } from '@common/game-statistics';
import { GlobalStatistics } from '@common/global-statistics';
import { PlayerStatistics } from '@common/player-statistics';

describe('GameStatisticsService', () => {
    let service: GameStatisticsService;
    let socketClientServiceMock: jasmine.SpyObj<SocketClientService>;
    let chatRoomServiceMock: jasmine.SpyObj<ChatRoomService>;

    beforeEach(() => {
        socketClientServiceMock = jasmine.createSpyObj('SocketClientService', ['on'], {
            socket: jasmine.createSpyObj('Socket', ['on', 'disconnect']),
        });
        chatRoomServiceMock = jasmine.createSpyObj('ChatRoomService', ['sendMessage']);

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketClientServiceMock },
                { provide: ChatRoomService, useValue: chatRoomServiceMock },
            ],
        });
        service = TestBed.inject(GameStatisticsService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('filterByColumn', () => {
        const testPlayerStats: PlayerStatistics[] = [
            {
                name: 'Player1',
                livesTaken: 5,
                livesLost: 2,
                wins: 1,
                losses: 2,
                evasions: 3,
                itemsPicked: 7,
                terrainPercentage: '40',
                combats: 3,
                tilesTraversed: new Set(['1,1', '1,2', '1,3']),
                flagsPicked: 1,
            },
            {
                name: 'Player2',
                livesTaken: 3,
                livesLost: 4,
                wins: 2,
                losses: 1,
                evasions: 1,
                itemsPicked: 5,
                terrainPercentage: '25',
                combats: 5,
                tilesTraversed: new Set(['2,1', '2,2']),
                flagsPicked: 0,
            },
            {
                name: 'Player3',
                livesTaken: 7,
                livesLost: 1,
                wins: 0,
                losses: 3,
                evasions: 2,
                itemsPicked: 3,
                terrainPercentage: '35',
                combats: 1,
                tilesTraversed: new Set(['3,1', '3,2', '3,3', '3,4']),
                flagsPicked: 2,
            },
        ];

        beforeEach(() => {
            service.playerStatistics = [...testPlayerStats];
            service.sortDescending = false;
        });

        it('should sort in ascending order when sortDescending is false', () => {
            service.filterByColumn(StatType.LivesTaken);

            expect(service.playerStatistics[0].name).toBe('Player2');
            expect(service.playerStatistics[1].name).toBe('Player1');
            expect(service.playerStatistics[2].name).toBe('Player3');
            expect(service.playerStatistics.map((p) => p[StatType.LivesTaken])).toEqual([3, 5, 7]);
        });

        it('should sort in descending order when sortDescending is true', () => {
            service.sortDescending = true;
            service.filterByColumn(StatType.LivesTaken);

            expect(service.playerStatistics[0].name).toBe('Player3');
            expect(service.playerStatistics[1].name).toBe('Player1');
            expect(service.playerStatistics[2].name).toBe('Player2');
            expect(service.playerStatistics.map((p) => p[StatType.LivesTaken])).toEqual([7, 5, 3]);
        });

        it('should toggle sortDescending after each call', () => {
            expect(service.sortDescending).toBeFalse();

            service.filterByColumn(StatType.LivesLost);
            expect(service.sortDescending).toBeTrue();

            service.filterByColumn(StatType.LivesLost);
            expect(service.sortDescending).toBeFalse();
        });

        it('should sort by different stat types correctly', () => {
            service.filterByColumn(StatType.LivesLost);
            expect(service.playerStatistics.map((p) => p[StatType.LivesLost])).toEqual([1, 2, 4]);

            service.filterByColumn(StatType.Wins);
            expect(service.playerStatistics.map((p) => p[StatType.Wins])).toEqual([2, 1, 0]);

            service.filterByColumn(StatType.Losses);
            expect(service.playerStatistics.map((p) => p[StatType.Losses])).toEqual([1, 2, 3]);
        });

        it('should sort by evasions correctly', () => {
            service.filterByColumn(StatType.Evasions);
            expect(service.playerStatistics.map((p) => p[StatType.Evasions])).toEqual([1, 2, 3]);
        });

        it('should sort by itemsPicked correctly', () => {
            service.filterByColumn(StatType.ItemsPicked);
            expect(service.playerStatistics.map((p) => p[StatType.ItemsPicked])).toEqual([3, 5, 7]);
        });

        it('should sort by terrainPercentage correctly', () => {
            service.filterByColumn(StatType.TerrainPercentage);
            expect(service.playerStatistics.map((p) => p[StatType.TerrainPercentage])).toEqual(['25', '35', '40']);
        });

        it('should sort by combats correctly', () => {
            service.filterByColumn('combats' as StatType);
            expect(service.playerStatistics.map((p) => p.combats)).toEqual([1, 3, 5]);
        });

        it('should sort by flagsPicked correctly', () => {
            service.filterByColumn('flagsPicked' as StatType);
            expect(service.playerStatistics.map((p) => p.flagsPicked)).toEqual([0, 1, 2]);
        });
    });

    describe('configureSocketFeatures', () => {
        let socketOnSpy: jasmine.Spy;

        beforeEach(() => {
            socketOnSpy = jasmine.createSpy('socketOn').and.returnValue(socketClientServiceMock.socket);
            Object.defineProperty(socketClientServiceMock.socket, 'on', { value: socketOnSpy });
        });

        it('should register a handler for GameOver events', () => {
            service.configureSocketFeatures();

            expect(socketClientServiceMock.socket.on).toHaveBeenCalledWith(GameEvents.GameOver, jasmine.any(Function));
        });

        it('should call updateStatistics when GameOver event is received', () => {
            spyOn(service, 'updateStatistics');

            let savedCallback: ((gameStats: GameStatistics) => void) | undefined;
            socketOnSpy.and.callFake((event, callback) => {
                if (event === GameEvents.GameOver) {
                    savedCallback = callback;
                }
                return socketClientServiceMock.socket;
            });

            service.configureSocketFeatures();

            const mockPlayerStatsObj = {
                player1: {
                    name: 'Player1',
                    livesTaken: 5,
                    livesLost: 2,
                    wins: 1,
                    losses: 2,
                    evasions: 3,
                    itemsPicked: 7,
                    terrainPercentage: '40',
                    combats: 3,
                    tilesTraversed: new Set(['1,1', '1,2', '1,3']),
                    flagsPicked: 1,
                },
            };

            const mockGlobalStats: GlobalStatistics = {
                gameTime: '5:30',
                rounds: 10,
                totalTerrainPercentage: '75',
                doorsToggledPercentage: '60',
                playersWithFlag: 1,
                totalTilesTraversed: new Set(['1,1', '1,2', '2,2']),
                doorsToggled: new Set(['3,3', '4,4']),
                playerNamesWithFlag: new Set(['Player1']),
            };

            const mockGameStats: GameStatistics = {
                winner: 'Player1',
                // we use any to bypass type checking
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                playerStatistics: mockPlayerStatsObj as any,
                globalStatistics: mockGlobalStats,
                startTime: new Date('2025-01-01T12:00:00Z'),
            };

            if (savedCallback) {
                savedCallback(mockGameStats);
                expect(service.updateStatistics).toHaveBeenCalledWith(mockGameStats);
            } else {
                fail('GameOver callback was not captured');
            }
        });
    });

    describe('obtainGameId', () => {
        beforeEach(() => {
            sessionStorage.clear();
        });

        it('should retrieve game ID from sessionStorage and then remove it', () => {
            const testGameId = 'test-game-123';
            sessionStorage.setItem('gameId', testGameId);
            expect(sessionStorage.getItem('gameId')).toBe(testGameId);

            service.obtainGameId();
            expect((service as any)._gameId).toBe(testGameId);

            expect(sessionStorage.getItem('gameId')).toBeNull();
        });

        it('should set empty string when gameId is not found in sessionStorage', () => {
            expect(sessionStorage.getItem('gameId')).toBeNull();

            service.obtainGameId();

            expect((service as any)._gameId).toBe('');
        });
    });

    describe('updateStatistics', () => {
        it('should update service properties from game statistics', () => {
            const mockPlayerStatsObj = {
                player1: {
                    name: 'Player1',
                    livesTaken: 5,
                    livesLost: 2,
                    wins: 1,
                    losses: 2,
                    evasions: 3,
                    itemsPicked: 7,
                    terrainPercentage: '40',
                    combats: 3,
                    tilesTraversed: new Set(['1,1', '1,2', '1,3']),
                    flagsPicked: 1,
                },
                player2: {
                    name: 'Player2',
                    livesTaken: 3,
                    livesLost: 4,
                    wins: 2,
                    losses: 1,
                    evasions: 1,
                    itemsPicked: 5,
                    terrainPercentage: '25',
                    combats: 5,
                    tilesTraversed: new Set(['2,1', '2,2']),
                    flagsPicked: 0,
                },
            };

            const mockGlobalStats: GlobalStatistics = {
                gameTime: '10:45',
                rounds: 20,
                totalTerrainPercentage: '85',
                doorsToggledPercentage: '70',
                playersWithFlag: 1,
                totalTilesTraversed: new Set(['1,1', '1,2', '2,1', '2,2', '3,3']),
                doorsToggled: new Set(['3,4', '5,6']),
                playerNamesWithFlag: new Set(['Player1']),
            };

            const mockGameStats: GameStatistics = {
                winner: 'Player1',
                // we use any to bypass type checking
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                playerStatistics: mockPlayerStatsObj as any,
                globalStatistics: mockGlobalStats,
                startTime: new Date('2025-01-01T12:00:00Z'),
            };

            service.updateStatistics(mockGameStats);

            expect(service.winnerName).toBe('Player1');
            expect(service.playerStatistics.length).toBe(2);

            const player1 = service.playerStatistics.find((p) => p.name === 'Player1');
            const player2 = service.playerStatistics.find((p) => p.name === 'Player2');
            expect(player1).toBeTruthy('Player1 not found in statistics');
            expect(player2).toBeTruthy('Player2 not found in statistics');
            expect(service.globalStatistics).toBe(mockGlobalStats);
            expect(service.globalStatistics.gameTime).toBe('10:45');
            expect(service.globalStatistics.rounds).toBe(20);
            expect(service.globalStatistics.totalTerrainPercentage).toBe('85');
            expect(service.globalStatistics.doorsToggledPercentage).toBe('70');
            expect(service.globalStatistics.playersWithFlag).toBe(1);
            expect(service.globalStatistics.playerNamesWithFlag.has('Player1')).toBeTrue();
        });
    });

    describe('quitPage', () => {
        it('should disconnect the socket', () => {
            service.quitPage();

            expect(socketClientServiceMock.socket.disconnect).toHaveBeenCalled();
        });
    });

    describe('sendMessage', () => {
        it('should call chatRoomService with message and gameId', () => {
            (service as any)._gameId = 'test-game-id';
            const testMessage = 'Hello world';

            service.sendMessage(testMessage);

            expect(chatRoomServiceMock.sendMessage).toHaveBeenCalledWith(testMessage, 'test-game-id');
        });
    });

    describe('get gameId', () => {
        it('should return the value of the private _gameId property', () => {
            const testGameId = 'test-game-id-123';
            (service as any)._gameId = testGameId;

            expect(service.gameId).toBe(testGameId);
        });

        it('should return an empty string when _gameId is not set', () => {
            (service as any)._gameId = '';

            expect(service.gameId).toBe('');
        });

        it('should return undefined when _gameId is undefined', () => {
            (service as any)._gameId = undefined;

            expect(service.gameId).toBeUndefined();
        });
    });

    describe('sortPlayersByName', () => {
        const testPlayerStats: PlayerStatistics[] = [
            {
                name: 'Bravo',
                livesTaken: 5,
                livesLost: 2,
                wins: 1,
                losses: 2,
                evasions: 3,
                itemsPicked: 7,
                terrainPercentage: '40',
                combats: 3,
                tilesTraversed: new Set(['1,1', '1,2', '1,3']),
                flagsPicked: 1,
            },
            {
                name: 'Charlie',
                livesTaken: 3,
                livesLost: 4,
                wins: 2,
                losses: 1,
                evasions: 1,
                itemsPicked: 5,
                terrainPercentage: '25',
                combats: 5,
                tilesTraversed: new Set(['2,1', '2,2']),
                flagsPicked: 0,
            },
            {
                name: 'Alpha',
                livesTaken: 7,
                livesLost: 1,
                wins: 0,
                losses: 3,
                evasions: 2,
                itemsPicked: 3,
                terrainPercentage: '35',
                combats: 1,
                tilesTraversed: new Set(['3,1', '3,2', '3,3', '3,4']),
                flagsPicked: 2,
            },
        ];

        beforeEach(() => {
            service.playerStatistics = [...testPlayerStats];
        });

        it('should sort player names in ascending order (A-Z) when sortDescending is true', () => {
            service.sortDescending = true;
            service.sortPlayersByName();

            expect(service.playerStatistics[0].name).toBe('Alpha');
            expect(service.playerStatistics[1].name).toBe('Bravo');
            expect(service.playerStatistics[2].name).toBe('Charlie');
        });

        it('should sort player names in descending order (Z-A) when sortDescending is false', () => {
            service.sortDescending = false;
            service.sortPlayersByName();

            expect(service.playerStatistics[0].name).toBe('Charlie');
            expect(service.playerStatistics[1].name).toBe('Bravo');
            expect(service.playerStatistics[2].name).toBe('Alpha');
        });

        it('should toggle sortDescending property after sorting', () => {
            service.sortDescending = false;
            service.sortPlayersByName();
            expect(service.sortDescending).toBeTrue();

            service.sortPlayersByName();
            expect(service.sortDescending).toBeFalse();
        });

        it('should handle case insensitivity correctly', () => {
            const mixedCaseStats = [
                { ...testPlayerStats[0], name: 'bravo' },
                { ...testPlayerStats[1], name: 'CHARLIE' },
                { ...testPlayerStats[2], name: 'Alpha' },
            ];

            service.playerStatistics = mixedCaseStats;
            service.sortDescending = true;
            service.sortPlayersByName();

            expect(service.playerStatistics[0].name).toBe('Alpha');
            expect(service.playerStatistics[1].name).toBe('bravo');
            expect(service.playerStatistics[2].name).toBe('CHARLIE');
        });

        it('should handle empty player statistics array', () => {
            service.playerStatistics = [];
            service.sortDescending = false;

            expect(() => service.sortPlayersByName()).not.toThrow();
            expect(service.sortDescending).toBeTrue();
        });
    });
});
