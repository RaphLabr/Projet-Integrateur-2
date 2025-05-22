// Max line disable since test file
/* eslint-disable max-lines */
// We allow the use of as any to access private properties and methods.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute, Router } from '@angular/router';
import { INVALID_MAP_COORDINATES } from '@app/constants/map-edition-constants';
import { GameDisplayData } from '@app/interfaces/game-display-data';
import { GameState } from '@app/interfaces/game-state';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { GamePageService } from '@app/services/game-page-service/game-page.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { ChatMessage } from '@common/chat-message';
import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Teams } from '@common/teams';
import { BehaviorSubject, Subscription } from 'rxjs';

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockActivatedRoute: { snapshot: { paramMap: { get: jasmine.Spy } } };
    let mockPageService: jasmine.SpyObj<GamePageService>;

    const mockSocketService = jasmine.createSpyObj('SocketClientService', ['emit', 'on', 'emitToggleDebug']);
    const mockChatRoomService = {
        _messagesSubject: new BehaviorSubject<string[]>(['message1', 'message2']),
        messages$: new BehaviorSubject<string[]>(['message1', 'message2']).asObservable(),
        messages: ['message1', 'message2'],
        sendMessage: jasmine.createSpy('sendMessage'),
        initialize: jasmine.createSpy('initialize'),
        getChatHistory: jasmine.createSpy('getChatHistory'),
        configureBaseSocketFeatures: jasmine.createSpy('configureBaseSocketFeatures'),
        socketService: mockSocketService,
    };
    let logsSubject: BehaviorSubject<string[]>;
    let combatMessagesSubject: BehaviorSubject<ChatMessage[]>;

    const testGameId = 'game123';
    const testGameDataJSON = '{"someKey":"someValue"}';
    const mockPlayerName = 'TestPlayer';
    const mockCoordinates: Coordinates = { x: 1, y: 1 };
    const mockGameDisplayData = {} as GameDisplayData;
    const mockGameState = {
        isInDebugMode: false,
        isClientPlaying: true,
        isGameInCombat: false,
    } as GameState;

    const mockChatMessages = ['message1', 'message2'];
    const mockLogs = ['TestPlayer moved to (1,1)', 'Enemy moved to (2,2)'];
    const mockMapTiles = [[]];
    const mockEvent = {
        tileCoordinates: mockCoordinates,
        mouseEvent: new MouseEvent('click'),
    };
    const mockCombatMessages: ChatMessage[] = [{ color: 'red', message: 'TestPlayer attacked!' }];
    const mockPlayer: Player = {
        id: CharacterType.Character1,
        userId: 'player-123',
        name: mockPlayerName,
        health: 100,
        maxHealth: 100,
        attack: 10,
        defense: 8,
        speed: 5,
        wins: 3,
        startPosition: { x: 0, y: 0 },
        dice: { attack: 1, defense: 1 },
        items: [],
        evadeAttempts: 0,
        hasAbandoned: false,
        team: Teams.BlueTeam,
        isTorchActive: false,
        isBarrelActive: false,
    };

    const mockEnemyPlayer: Player = {
        id: CharacterType.Character2,
        userId: 'enemy-123',
        name: 'Enemy',
        health: 80,
        maxHealth: 100,
        attack: 12,
        defense: 6,
        speed: 4,
        wins: 1,
        startPosition: { x: 10, y: 10 },
        dice: { attack: 1, defense: 1 },
        items: [],
        evadeAttempts: 0,
        hasAbandoned: false,
        team: Teams.RedTeam,
        isTorchActive: false,
        isBarrelActive: false,
    };

    beforeEach(async () => {
        logsSubject = new BehaviorSubject<string[]>(mockLogs);
        combatMessagesSubject = new BehaviorSubject<ChatMessage[]>(mockCombatMessages);

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockActivatedRoute = { snapshot: { paramMap: { get: jasmine.createSpy() } } };
        mockPageService = jasmine.createSpyObj(
            'GamePageService',
            [
                'loadGameDataJSON',
                'initializePage',
                'quitGame',
                'toggleClientInAction',
                'onEndRoundClick',
                'onQuitGameClick',
                'onTileRightClick',
                'onTileClick',
                'onTileHover',
                'onTileLeave',
                'sendMessage',
                'combatAttack',
                'combatEvade',
                'getTeamColor',
                'dropItem',
                'closeTileInfo',
                'getTileDescription',
            ],
            {
                logs$: logsSubject.asObservable(),
                combatMessages$: combatMessagesSubject.asObservable(),
                showTileContext: false,
                isClientTurnToAttack: false,
                gameEnded: false,
            },
        );

        mockPageService.combatAttack.and.returnValue(undefined);
        mockPageService.combatEvade.and.returnValue(undefined);

        (mockPageService as any).gameDisplay = mockGameDisplayData;
        (mockPageService as any).gameState = mockGameState;
        (mockPageService as any).mapSize = MapSize.Medium;
        (mockPageService as any).map = mockMapTiles;
        (mockPageService as any).movementLeft = 5;
        (mockPageService as any).clientPlayer = mockPlayer;
        (mockPageService as any).isActionUsed = false;
        (mockPageService as any).combatMessages = mockCombatMessages;
        (mockPageService as any).logs = mockLogs;
        (mockPageService as any).gameId = testGameId;
        (mockPageService as any).enemyPlayer = mockEnemyPlayer;
        (mockPageService as any).currentTile = {
            type: MapTileType.Base,
            item: ItemType.NoItem,
            character: CharacterType.NoCharacter,
        };
        (mockPageService as any).contextPlayerName = undefined;
        (mockPageService as any).itemDescription = undefined;

        (mockPageService as any).combatService = {
            attack: jasmine.createSpy('attack').and.returnValue(undefined),
            evade: jasmine.createSpy('evade').and.returnValue(undefined),
            combatAttack: jasmine.createSpy('combatAttack'),
            combatEvade: jasmine.createSpy('combatEvade'),
            requestCombat: jasmine.createSpy('requestCombat'),
            isClientInCombat: false,
            isGameInCombat: false,
            isClientTurnToAttack: false,
            enemyPlayer: mockEnemyPlayer,
            combatMessages: mockCombatMessages,
        };
        mockPageService.hoveredTileCoordinates = { x: 0, y: 0 };

        mockPageService.chatRoomService = mockChatRoomService as any;

        await TestBed.configureTestingModule({
            imports: [FormsModule, MatButtonToggleModule, MatCheckboxModule, GamePageComponent],
            declarations: [],
            providers: [
                { provide: Router, useValue: mockRouter },
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: ChatRoomService, useValue: mockChatRoomService },
                { provide: GamePageService, useValue: mockPageService },
                { provide: SocketClientService, useValue: mockSocketService },
                { provide: SocketClientService, useValue: mockSocketService },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;

        (component as any)._logBox = { nativeElement: document.createElement('div') };
        (component as any)._filteredLogBox = { nativeElement: document.createElement('div') };
        (component as any)._combatMessageBox = { nativeElement: document.createElement('div') };

        spyOn(component as any, 'ngAfterViewInit').and.callFake(() => {
            (component as any)._logSubscription = new Subscription();
            (component as any)._filteredLogSubscription = new Subscription();
            (component as any)._combatMessageSubscription = new Subscription();
        });

        mockActivatedRoute.snapshot.paramMap.get.and.returnValue(testGameId);
        mockPageService.loadGameDataJSON.and.returnValue(testGameDataJSON);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('getters', () => {
        it('should get gameDisplay from pageService', () => {
            expect(component.gameDisplay).toBe(mockGameDisplayData);
        });

        it('should get gameState from pageService', () => {
            expect(component.gameState).toBe(mockGameState);
        });

        it('should get messages from chatRoomService', () => {
            expect(component.messages).toEqual(mockChatMessages as any);
        });

        it('should get mapSize from pageService', () => {
            expect(component.mapSize).toBe(MapSize.Medium);
        });

        it('should get map from pageService', () => {
            expect(component.map).toBe(mockMapTiles);
        });

        it('should get correct gameModeString', () => {
            (mockPageService as any).gameState = { isInDebugMode: false } as GameState;
            expect(component.gameModeString).toBe('normal');

            (mockPageService as any).gameState = { isInDebugMode: true } as GameState;
            expect(component.gameModeString).toBe('débogage');
        });

        it('should get movementLeft from pageService', () => {
            const movementLeft = 5;
            expect(component.movementLeft).toBe(movementLeft);
        });

        it('should get clientPlayer from pageService', () => {
            expect(component.clientPlayer).toBe(mockPlayer);
        });

        it('should return "petit" for Small map size', () => {
            (mockPageService as any).mapSize = MapSize.Small;
            expect(component.stringMapSize).toBe('petit');
        });

        it('should return "moyenne" for Medium map size', () => {
            (mockPageService as any).mapSize = MapSize.Medium;
            expect(component.stringMapSize).toBe('moyenne');
        });

        it('should return "large" for Large map size', () => {
            (mockPageService as any).mapSize = MapSize.Large;
            expect(component.stringMapSize).toBe('large');
        });

        it('should get isActionUsed from pageService', () => {
            expect(component.isActionUsed).toBeFalse();

            (mockPageService as any).isActionUsed = true;
            expect(component.isActionUsed).toBeTrue();
        });

        it('should get combatMessages from pageService', () => {
            expect(component.combatMessages).toBe(mockCombatMessages);
        });

        it('should get logs from pageService', () => {
            expect(component.logs).toBe(mockLogs);
        });

        it('should filter logs that include client player name', () => {
            const filteredLogs = component.filteredlogs;
            expect(filteredLogs.length).toBe(1);
            expect(filteredLogs[0]).toBe('TestPlayer moved to (1,1)');
        });

        it('should get currentTileType from pageService.currentTile', () => {
            const mockTile = { type: MapTileType.Base };
            (mockPageService as any).currentTile = mockTile;

            expect(component.currentTileType).toBe(MapTileType.Base);
        });

        it('should determine if tile has item based on currentTile.item', () => {
            (mockPageService as any).currentTile = { item: ItemType.NoItem };
            expect(component.tileHasItem).toBeFalse();

            (mockPageService as any).currentTile = { item: ItemType.Potion1 };
            expect(component.tileHasItem).toBeTrue();
        });

        it('should get itemDescription from pageService', () => {
            const mockDescription = 'A powerful potion';
            (mockPageService as any).itemDescription = mockDescription;

            expect(component.itemDescription).toBe(mockDescription);
        });

        it('should determine if tile has character based on currentTile.character', () => {
            (mockPageService as any).currentTile = { character: CharacterType.NoCharacter };
            expect(component.tileHasCharacter).toBeFalse();

            (mockPageService as any).currentTile = { character: CharacterType.Character1 };
            expect(component.tileHasCharacter).toBeTrue();
        });

        it('should get contextPlayerName from pageService', () => {
            (mockPageService as any).contextPlayerName = mockPlayerName;

            expect(component.contextPlayerName).toBe(mockPlayerName);
        });

        it('should get contextPlayerId from currentTile.character', () => {
            (mockPageService as any).currentTile = { character: CharacterType.Character2 };

            expect(component.contextPlayerId).toBe(CharacterType.Character2);
        });
    });

    describe('init, destroy', () => {
        it('should initialize page with gameId and gameData', () => {
            expect(mockPageService.initializePage).toHaveBeenCalledWith(testGameId, testGameDataJSON);
        });

        it('should navigate to home if gameId or gameDataJSON is missing', () => {
            mockActivatedRoute.snapshot.paramMap.get.and.returnValue(null);
            component.ngOnInit();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);

            mockActivatedRoute.snapshot.paramMap.get.and.returnValue(testGameId);
            mockPageService.loadGameDataJSON.and.returnValue(null);
            component.ngOnInit();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
        });
    });

    describe('event handlers', () => {
        it('should call toggleClientInAction on action button click', () => {
            component.onActionButtonClick();
            expect(mockPageService.toggleClientInAction).toHaveBeenCalled();
        });

        it('should call onEndRoundClick on end round button click', () => {
            component.onEndRoundClick();
            expect(mockPageService.onEndRoundClick).toHaveBeenCalled();
        });

        it('should call onQuitGameClick and navigate to home on quit', async () => {
            await component.onQuitGameClick();
            expect(mockPageService.onQuitGameClick).toHaveBeenCalled();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['']);
        });

        it('should call onTileRightClick with coordinates', () => {
            component.onTileRightMouseDown(mockCoordinates);
            expect(mockPageService.onTileRightClick).toHaveBeenCalledWith(mockCoordinates);
        });

        it('should call onTileClick with coordinates', () => {
            component.onTileLeftMouseDown(mockEvent);
            expect(mockPageService.onTileClick).toHaveBeenCalledWith(mockCoordinates);
        });

        it('should call onTileHover with coordinates', () => {
            component.onTileHover(mockEvent);
            expect(mockPageService.onTileHover).toHaveBeenCalledWith(mockCoordinates);
        });

        it('should call onTileLeave', () => {
            component.onTileLeave();
            expect(mockPageService.onTileLeave).toHaveBeenCalled();
        });

        it('should set hoveredTileCoordinates to INVALID_MAP_COORDINATES on map leave', () => {
            component.onMapLeave();
            expect(mockPageService.hoveredTileCoordinates).toEqual(INVALID_MAP_COORDINATES);
        });

        it('should call combatAttack', () => {
            component.combatAttack();
            expect(mockPageService.combatAttack).toHaveBeenCalled();
        });

        it('should call combatEvade', () => {
            component.combatEvade();
            expect(mockPageService.combatEvade).toHaveBeenCalled();
        });

        it('should call sendMessage and clear message input', () => {
            component.messageInput = 'test message';
            component.sendMessage();
            expect(mockPageService.sendMessage).toHaveBeenCalledWith('test message');
            expect(component.messageInput).toBe('');
        });
    });

    describe('keyboard event handling', () => {
        it('should emit toggle debug when "d" key is pressed', () => {
            const event = new KeyboardEvent('keydown', { key: 'd' });
            component.handleKeyDown(event);
            expect(mockSocketService.emitToggleDebug).toHaveBeenCalledWith(testGameId);
        });
    });

    describe('additional methods', () => {
        it('should call getTeamColor on pageService with the provided team', () => {
            const mockTeamColor = '#FF0000';
            mockPageService.getTeamColor = jasmine.createSpy('getTeamColor').and.returnValue(mockTeamColor);

            const result = component.getTeamColor(Teams.RedTeam);

            expect(mockPageService.getTeamColor).toHaveBeenCalledWith(Teams.RedTeam);
            expect(result).toBe(mockTeamColor);
        });

        it('should call dropItem on pageService with the provided index', () => {
            mockPageService.dropItem = jasmine.createSpy('dropItem');
            const testIndex = 2;

            component.dropItem(testIndex);

            expect(mockPageService.dropItem).toHaveBeenCalledWith(testIndex);
        });

        it('should call closeTileInfo on pageService', () => {
            mockPageService.closeTileInfo = jasmine.createSpy('closeTileInfo');
            component.closeTileInfo();
            expect(mockPageService.closeTileInfo).toHaveBeenCalled();
        });

        it('should call getTileDescription on pageService and return its result', () => {
            const mockDescription = 'Test tile description';
            mockPageService.getTileDescription = jasmine.createSpy('getTileDescription').and.returnValue(mockDescription);

            const result = component.getTileDescription();

            expect(mockPageService.getTileDescription).toHaveBeenCalled();
            expect(result).toBe(mockDescription);
        });
    });

    describe('scrollLogsOrChat', () => {
        let scrollLogsSpy: jasmine.Spy;

        beforeEach(() => {
            component['_logBox'] = { nativeElement: document.createElement('div') };
            component['_filteredLogBox'] = { nativeElement: document.createElement('div') };

            scrollLogsSpy = spyOn(component, 'scrollLogs' as any);
        });

        it('should call scrollLogs when chat is not toggled', () => {
            component.isChatToggled = false;
            component.scrollLogsOrChat();
            expect(scrollLogsSpy).toHaveBeenCalled();
        });

        it('should not call scrollLogs when chat is toggled', () => {
            component.isChatToggled = true;
            component.scrollLogsOrChat();
            expect(scrollLogsSpy).not.toHaveBeenCalled();
        });
    });
});
