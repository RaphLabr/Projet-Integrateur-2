import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { StatType } from '@app/constants/stat-type';
import { GameStatisticsService } from '@app/services/game-statistics-page-service/game-statistics-page-service.service';
import { GlobalStatistics } from '@common/global-statistics';
import { PlayerStatistics } from '@common/player-statistics';
import { GameStatisticsPageComponent } from './game-statistics-page.component';

describe('GameStatisticsPageComponent', () => {
    let component: GameStatisticsPageComponent;
    let fixture: ComponentFixture<GameStatisticsPageComponent>;
    let mockGameStatisticsService: jasmine.SpyObj<GameStatisticsService>;
    let mockChatRoomService: { messages: string[] };
    let mockGlobalStatistics: GlobalStatistics;
    let mockPlayerStatistics: PlayerStatistics[];
    let mockRouter: jasmine.SpyObj<Router>;
    const messages = ['Hello', 'World'];

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockChatRoomService = { messages };
        mockGlobalStatistics = {
            gameTime: '10:00',
            rounds: 5,
            totalTerrainPercentage: '75%',
            doorsToggledPercentage: '50%',
            playersWithFlag: 2,
            totalTilesTraversed: new Set(['A1', 'B2']),
            doorsToggled: new Set(['D1', 'D2']),
            playerNamesWithFlag: new Set(['Player1', 'Player2']),
        };
        mockPlayerStatistics = [
            {
                name: 'Player1',
                wins: 1,
                losses: 2,
                combats: 3,
                evasions: 4,
                livesLost: 1,
                livesTaken: 2,
                itemsPicked: 3,
                terrainPercentage: '50%',
                tilesTraversed: new Set(['A1', 'B2']),
                flagsPicked: 1,
            },
        ];
        mockGameStatisticsService = jasmine.createSpyObj(
            'GameStatisticsService',
            ['obtainGameId', 'sendMessage', 'quitPage', 'filterByColumn', 'sortPlayersByName'],
            {},
        );
        Object.defineProperties(mockGameStatisticsService, {
            gameId: {
                writable: true,
                value: 'initial-value',
            },
            winnerName: {
                writable: true,
                value: 'Test Winner',
            },
            globalStatistics: {
                writable: true,
                value: mockGlobalStatistics,
            },
            playerStatistics: {
                writable: true,
                value: mockPlayerStatistics,
            },
            chatRoomService: {
                writable: true,
                value: mockChatRoomService,
            },
        });

        TestBed.configureTestingModule({
            imports: [GameStatisticsPageComponent],
            providers: [
                { provide: GameStatisticsService, useValue: mockGameStatisticsService },
                { provide: Router, useValue: mockRouter },
            ],
        });

        fixture = TestBed.createComponent(GameStatisticsPageComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        if (fixture) {
            fixture.destroy();
        }
        sessionStorage.clear();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('ngOnInit should call obtainGameId', () => {
        component.ngOnInit();
        expect(mockGameStatisticsService.obtainGameId).toHaveBeenCalled();
    });

    describe('testing the getter functions', () => {
        it('should get winner from service', () => {
            const testWinner = 'Test Winner';
            mockGameStatisticsService.winnerName = testWinner;
            expect(component.winner).toBe(testWinner);
        });

        it('should get globalStatistics from service', () => {
            expect(component.globalStatistics).toEqual(mockGlobalStatistics);
        });

        it('should get playerStatistics from service', () => {
            expect(component.playerStatistics).toEqual(mockPlayerStatistics);
        });

        it('should get messages from chatRoomService', () => {
            expect(component.messages).toEqual(messages);
        });

        it('should get playerName from sessionStorage', () => {
            const name = 'TestPlayer';
            sessionStorage.setItem('clientPlayerName', name);
            expect(component.playerName).toBe(name);
        });
        it('should return the gameId from the service', () => {
            const testGameId = 'test-game-123';
            // Need to accces read only
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mockGameStatisticsService as any).gameId = testGameId;

            expect(component.gameId).toBe(testGameId);
        });

        it('should return undefined if service has no gameId', () => {
            // Need to accces read only
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mockGameStatisticsService as any).gameId = undefined;

            expect(component.gameId).toBeUndefined();
        });
    });

    describe('testing component functions', () => {
        it('should call sendMessage and reset messageInput', () => {
            const testMessage = 'Test Message';
            component.messageInput = testMessage;
            component.sendMessage();
            expect(mockGameStatisticsService.sendMessage).toHaveBeenCalledWith(testMessage);
            expect(component.messageInput).toBe('');
        });

        it('should call quitPage and navigate to /home', () => {
            component.quitPage();
            expect(mockGameStatisticsService.quitPage).toHaveBeenCalled();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should call filterByColumn with selectedStat', () => {
            const selectedStat = StatType.Evasions;
            component.selectedStat = selectedStat;
            component.filterColumn();
            expect(mockGameStatisticsService.filterByColumn).toHaveBeenCalledWith(selectedStat);
        });
    });
    describe('sortPlayersByName', () => {
        it('should call sortPlayersByName on the gameStatisticsService', () => {
            const sortSpy = mockGameStatisticsService.sortPlayersByName.and.callThrough();
            component.sortPlayersByName();
            expect(sortSpy).toHaveBeenCalled();
        });

        it('should call the service method exactly once', () => {
            component.sortPlayersByName();
            expect(mockGameStatisticsService.sortPlayersByName).toHaveBeenCalledTimes(1);
        });
    });
});
