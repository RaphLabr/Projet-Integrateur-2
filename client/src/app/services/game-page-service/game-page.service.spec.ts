// Max line disable since test file
/* eslint-disable max-lines */
// allow the use of any to access private properties
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { MapTile } from '@app/classes/map-tile';
import { ITEM_DESCRIPTIONS, TILES } from '@app/constants/map-edition-constants';
import { GameDisplayData } from '@app/interfaces/game-display-data';
import { GameState } from '@app/interfaces/game-state';
import { SessionStorageGameData } from '@app/interfaces/session-game-data';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { CombatService } from '@app/services/combat-service/combat.service';
import { GameMapService } from '@app/services/game-map-service/game-map.service';
import { GamePageService } from '@app/services/game-page-service/game-page.service';
import { GameService } from '@app/services/game-service/game.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { ChatMessage } from '@common/chat-message';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Teams } from '@common/teams';

describe('GamePageService', () => {
    let service: GamePageService;

    let gameServiceMock: jasmine.SpyObj<GameService>;
    let mapServiceMock: jasmine.SpyObj<GameMapService>;
    let combatServiceMock: jasmine.SpyObj<CombatService>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let chatRoomServiceMock: jasmine.SpyObj<ChatRoomService>;

    const mockGameDisplay = {} as GameDisplayData;
    const mockGameState = {
        isGameInCombat: false,
        isClientPlaying: true,
        isActionEnabled: false,
        isInDebugMode: false,
    } as GameState;
    const mockMapSize: MapSize = MapSize.Small;
    const mockMap = [[]] as MapTile[][];
    const mockMovementLeft = 5;
    const mockClientPlayer = {
        team: Teams.RedTeam,
        items: [ItemType.Flag, ItemType.Barrel],
    } as Player;
    let mockIsActionUsed = false;
    const mockGameId = 'game123';
    const mockIsClientInCombat = false;
    const mockEnemyPlayer = {} as Player;
    const mockCombatMessages: ChatMessage[] = [];
    const mockLogs: string[] = ['log1', 'log2'];
    const mockCoordinates: Coordinates = { x: 1, y: 1 };
    const mockGameDataJSON = '{"gameData":"test"}';
    const mockGameData = { gameData: 'test' } as unknown as SessionStorageGameData;
    const mockCombatRequestPayload = {} as CombatRequestPayload;
    let hoveredTileCoordinatesSpy: jasmine.Spy;

    beforeEach(() => {
        gameServiceMock = jasmine.createSpyObj(
            'GameService',
            [
                'initializeGameDisplay',
                'configureSocketFeatures',
                'quitGame',
                'toggleClientInAction',
                'onEndRoundClick',
                'onTileHover',
                'isRoundOver',
                'createCombatRequestPayload',
            ],
            {
                gameDisplay: mockGameDisplay,
                gameState: mockGameState,
                clientPlayer: mockClientPlayer,
                isActionUsed: mockIsActionUsed,
                gameId: mockGameId,
                logs: mockLogs,
            },
        );

        Object.defineProperty(gameServiceMock, 'isActionUsed', {
            get: () => mockIsActionUsed,
            set: jasmine.createSpy('isActionUsedSetter').and.callFake((value) => {
                mockIsActionUsed = value;
            }),
        });

        hoveredTileCoordinatesSpy = jasmine.createSpy('hoveredTileCoordinatesSetter');
        mapServiceMock = jasmine.createSpyObj(
            'GameMapService',
            [
                'configureSocketFeatures',
                'showReachableAndPathTiles',
                'hideReachableAndPathTiles',
                'isTileReachable',
                'hideShortestPath',
                'isActionPossibleOnTile',
                'isTileAdjacentToClient',
                'getCharacterOnTile',
                'requestDoorUpdate',
                'getTile',
                'isTileTraversable',
                'hideActiveAndPathTiles',
            ],
            {
                size: mockMapSize,
                gameMap: mockMap,
                movementLeft: mockMovementLeft,
                clientPosition: mockCoordinates,
                currentPath: [mockCoordinates],
            },
        );

        Object.defineProperty(mapServiceMock, 'hoveredTileCoordinates', {
            set: hoveredTileCoordinatesSpy,
        });

        combatServiceMock = jasmine.createSpyObj('CombatService', ['configureSocketFeatures', 'requestCombat', 'combatAttack', 'combatEvade'], {
            isClientInCombat: mockIsClientInCombat,
            enemyPlayer: mockEnemyPlayer,
            combatMessages: mockCombatMessages,
            isClientTurnToAttack: true,
        });

        socketServiceMock = jasmine.createSpyObj('SocketClientService', ['emitMovement', 'emitPlayerTeleport']);

        chatRoomServiceMock = jasmine.createSpyObj('ChatRoomService', ['sendMessage']);

        spyOn(sessionStorage, 'getItem').and.returnValue(mockGameDataJSON);
        spyOn(JSON, 'parse').and.returnValue(mockGameData);
        spyOn(window, 'removeEventListener');

        TestBed.configureTestingModule({
            providers: [
                GamePageService,
                { provide: GameService, useValue: gameServiceMock },
                { provide: GameMapService, useValue: mapServiceMock },
                { provide: CombatService, useValue: combatServiceMock },
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: ChatRoomService, useValue: chatRoomServiceMock },
            ],
        });

        service = TestBed.inject(GamePageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Getters', () => {
        it('should return gameDisplay from GameService', () => {
            expect(service.gameDisplay).toBe(mockGameDisplay);
        });

        it('should return gameState from GameService', () => {
            expect(service.gameState).toBe(mockGameState);
        });

        it('should return mapSize from MapService', () => {
            expect(service.mapSize).toBe(mockMapSize);
        });

        it('should return map from MapService', () => {
            expect(service.map).toBe(mockMap);
        });

        it('should return movementLeft from MapService', () => {
            expect(service.movementLeft).toBe(mockMovementLeft);
        });

        it('should return clientPlayer from GameService', () => {
            expect(service.clientPlayer).toBe(mockClientPlayer);
        });

        it('should return isActionUsed from GameService', () => {
            expect(service.isActionUsed).toBe(mockIsActionUsed);
        });

        it('should return gameId from GameService', () => {
            expect(service.gameId).toBe(mockGameId);
        });

        it('should return isClientInCombat from CombatService', () => {
            expect(service.isClientInCombat).toBe(mockIsClientInCombat);
        });

        it('should return enemyPlayer from CombatService', () => {
            expect(service.enemyPlayer).toBe(mockEnemyPlayer);
        });

        it('should return combatMessages from CombatService', () => {
            expect(service.combatMessages).toBe(mockCombatMessages);
        });

        it('should return logs from GameService', () => {
            expect(service.logs).toBe(mockLogs);
        });

        it('should return the correct value for showTileContext', () => {
            expect(service.showTileContext).toBeFalse();

            Object.defineProperty(mockGameState, 'isInDebugMode', { get: () => false });
            mapServiceMock.getTile.and.returnValue(new MapTile());

            service.onTileRightClick(mockCoordinates);

            expect(service.showTileContext).toBeTrue();
        });

        it('should return the correct MapTile for currentTile', () => {
            const mockTile = new MapTile(MapTileType.Wall, ItemType.Sword);
            mapServiceMock.getTile.and.returnValue(mockTile);

            service.onTileRightClick(mockCoordinates);

            expect(service.currentTile).toBe(mockTile);
        });

        it('should return the correct item description based on current tile', () => {
            const mockTile = new MapTile(MapTileType.Base, ItemType.Sword);
            mapServiceMock.getTile.and.returnValue(mockTile);
            service.onTileRightClick(mockCoordinates);

            const expectedDescription = ITEM_DESCRIPTIONS.get(ItemType.Sword);

            expect(service.itemDescription).toBe(expectedDescription);
        });

        it('should return the correct player name for contextPlayerName when character exists', () => {
            const mockTile = new MapTile(MapTileType.Base, ItemType.NoItem, CharacterType.Character1);
            mapServiceMock.getTile.and.returnValue(mockTile);
            gameServiceMock.getPlayerNameWithId = jasmine.createSpy('getPlayerNameWithId').and.returnValue('Player1');

            service.onTileRightClick(mockCoordinates);

            expect(service.contextPlayerName).toBe('Player1');
            expect(gameServiceMock.getPlayerNameWithId).toHaveBeenCalledWith(CharacterType.Character1);
        });

        it('should return undefined for contextPlayerName when no character exists', () => {
            const mockTile = new MapTile(MapTileType.Base, ItemType.NoItem, CharacterType.NoCharacter);
            mapServiceMock.getTile.and.returnValue(mockTile);
            gameServiceMock.getPlayerNameWithId = jasmine.createSpy('getPlayerNameWithId');

            service.onTileRightClick(mockCoordinates);

            expect(service.contextPlayerName).toBeUndefined();
            expect(gameServiceMock.getPlayerNameWithId).not.toHaveBeenCalled();
        });
    });

    describe('Setter', () => {
        it('should set hoveredTileCoordinates on MapService', () => {
            service.hoveredTileCoordinates = mockCoordinates;
            expect(hoveredTileCoordinatesSpy).toHaveBeenCalledWith(mockCoordinates);
        });

        it('should set gameEnded on gameService', () => {
            const gameEndedSetter = jasmine.createSpy('gameEndedSetter');

            Object.defineProperty(gameServiceMock, 'gameEnded', {
                set: gameEndedSetter,
            });

            service.gameEnded = true;

            expect(gameEndedSetter).toHaveBeenCalledWith(true);
        });
    });

    describe('initializePage', () => {
        it('should initialize game display and configure socket features', () => {
            service.initializePage(mockGameId, mockGameDataJSON);

            expect(JSON.parse).toHaveBeenCalledWith(mockGameDataJSON);
            expect(gameServiceMock.initializeGameDisplay).toHaveBeenCalledWith(mockGameData, mockGameId);
            expect(gameServiceMock.configureSocketFeatures).toHaveBeenCalled();
            expect(mapServiceMock.configureSocketFeatures).toHaveBeenCalled();
            expect(combatServiceMock.configureSocketFeatures).toHaveBeenCalled();
        });
    });

    describe('loadGameDataJSON', () => {
        it('should get game data from session storage', () => {
            const result = service.loadGameDataJSON();

            expect(sessionStorage.getItem).toHaveBeenCalledWith('gameData');
            expect(result).toBe(mockGameDataJSON);
        });
    });

    describe('sendMessage', () => {
        it('should send message via chat room service', () => {
            const message = 'test message';
            service.sendMessage(message);

            expect(chatRoomServiceMock.sendMessage).toHaveBeenCalledWith(message, mockGameId);
        });
    });

    describe('toggleClientInAction', () => {
        it('should call game service toggleClientInAction when not in combat and action not used', () => {
            Object.defineProperty(mockGameState, 'isGameInCombat', { get: () => false });
            spyOnProperty(gameServiceMock, 'isActionUsed').and.returnValue(false);

            service.toggleClientInAction();

            expect(gameServiceMock.toggleClientInAction).toHaveBeenCalled();
        });

        it('should not call game service toggleClientInAction when in combat', () => {
            Object.defineProperty(mockGameState, 'isGameInCombat', { get: () => true });

            service.toggleClientInAction();

            expect(gameServiceMock.toggleClientInAction).not.toHaveBeenCalled();
        });

        it('should not call game service toggleClientInAction when action is used', () => {
            spyOnProperty(gameServiceMock, 'isActionUsed').and.returnValue(true);

            service.toggleClientInAction();

            expect(gameServiceMock.toggleClientInAction).not.toHaveBeenCalled();
        });
    });

    describe('onEndRoundClick', () => {
        it('should call game service onEndRoundClick when not in combat', () => {
            Object.defineProperty(mockGameState, 'isGameInCombat', { get: () => false });
            gameServiceMock.onEndRoundClick.calls.reset();
            service.onEndRoundClick();

            expect(gameServiceMock.onEndRoundClick).toHaveBeenCalled();
        });

        it('should not call game service onEndRoundClick when in combat', () => {
            Object.defineProperty(mockGameState, 'isGameInCombat', { get: () => true });

            service.onEndRoundClick();

            expect(gameServiceMock.onEndRoundClick).not.toHaveBeenCalled();
        });
    });

    describe('onQuitGameClick', () => {
        it('should call game service quitGame', async () => {
            await service.onQuitGameClick();

            expect(gameServiceMock.quitGame).toHaveBeenCalled();
        });
    });

    describe('onTileClick', () => {
        beforeEach(() => {
            mapServiceMock.isTileReachable.and.returnValue(true);
            Object.defineProperty(mockGameState, 'isClientPlaying', { get: () => true });
            Object.defineProperty(mockGameState, 'isActionEnabled', { get: () => false });
            Object.defineProperty(combatServiceMock, 'isClientInCombat', { get: () => false });
        });

        it('should do nothing when client is not playing', () => {
            Object.defineProperty(mockGameState, 'isClientPlaying', { get: () => false });

            service.onTileClick(mockCoordinates);

            expect(mapServiceMock.isTileReachable).not.toHaveBeenCalled();
            expect(socketServiceMock.emitMovement).not.toHaveBeenCalled();
        });

        it('should do nothing when client is in combat', () => {
            Object.defineProperty(combatServiceMock, 'isClientInCombat', { get: () => true });

            service.onTileClick(mockCoordinates);

            expect(mapServiceMock.isTileReachable).not.toHaveBeenCalled();
            expect(socketServiceMock.emitMovement).not.toHaveBeenCalled();
        });

        it('should call performAction when action is enabled', () => {
            spyOn(service, 'performAction');
            Object.defineProperty(mockGameState, 'isActionEnabled', { get: () => true });

            service.onTileClick(mockCoordinates);

            expect(service.performAction).toHaveBeenCalledWith(mockCoordinates);
        });

        it('should emit movement when tile is reachable', () => {
            Object.defineProperty(gameServiceMock.gameState, 'isActionEnabled', { get: () => false });
            mapServiceMock.isTileReachable.and.returnValue(true);

            service.onTileClick(mockCoordinates);

            expect(socketServiceMock.emitMovement).toHaveBeenCalledWith({
                gameId: mockGameId,
                path: [mockCoordinates],
            });
            expect(mapServiceMock.hideActiveAndPathTiles).toHaveBeenCalled();
        });
        it('should not emit movement when tile is not reachable', () => {
            Object.defineProperty(mockGameState, 'isActionEnabled', { get: () => false });
            mapServiceMock.isTileReachable.and.returnValue(false);

            service.onTileClick(mockCoordinates);

            expect(socketServiceMock.emitMovement).not.toHaveBeenCalled();
            expect(mapServiceMock.hideActiveAndPathTiles).not.toHaveBeenCalled();
        });
    });

    describe('onTileRightClick', () => {
        it('should emit teleport in debug mode', () => {
            Object.defineProperty(mockGameState, 'isInDebugMode', { get: () => true });
            Object.defineProperty(mockGameState, 'isClientPlaying', { get: () => true });
            Object.defineProperty(mockGameState, 'isDroppingItem', { get: () => false });

            mapServiceMock.isTileTraversable.and.returnValue(true);

            service.onTileRightClick(mockCoordinates);

            expect(socketServiceMock.emitPlayerTeleport).toHaveBeenCalledWith({
                from: mockCoordinates,
                to: mockCoordinates,
                gameId: mockGameId,
            });
        });

        it('should not emit teleport when not in debug mode', () => {
            Object.defineProperty(mockGameState, 'isInDebugMode', { get: () => false });

            mapServiceMock.hideActiveAndPathTiles.calls.reset();
            socketServiceMock.emitPlayerTeleport.calls.reset();

            service.onTileRightClick(mockCoordinates);

            expect(mapServiceMock.hideActiveAndPathTiles).not.toHaveBeenCalled();
            expect(socketServiceMock.emitPlayerTeleport).not.toHaveBeenCalled();
        });
    });

    describe('onTileHover', () => {
        it('should call game service onTileHover', () => {
            service.onTileHover(mockCoordinates);

            expect(gameServiceMock.onTileHover).toHaveBeenCalledWith(mockCoordinates);
        });
    });

    describe('onTileLeave', () => {
        it('should call map service hideShortestPath', () => {
            service.onTileLeave();

            expect(mapServiceMock.hideShortestPath).toHaveBeenCalled();
        });
    });

    describe('performAction', () => {
        beforeEach(() => {
            gameServiceMock.toggleClientInAction.and.callThrough();
            mapServiceMock.isActionPossibleOnTile.and.returnValue(true);
            mapServiceMock.isTileAdjacentToClient.and.returnValue(true);
            gameServiceMock.createCombatRequestPayload.and.returnValue(mockCombatRequestPayload);
            mapServiceMock.getCharacterOnTile.and.returnValue(CharacterType.NoCharacter);
            mapServiceMock.getTile.and.returnValue(new MapTile(MapTileType.Base, ItemType.NoItem));
        });

        it('should toggle client in action', () => {
            spyOn(service, 'toggleClientInAction').and.callThrough();

            service.performAction(mockCoordinates);

            expect(service.toggleClientInAction).toHaveBeenCalled();
        });

        it('should not perform action if conditions are not met', () => {
            mapServiceMock.isActionPossibleOnTile.and.returnValue(false);
            mockIsActionUsed = false;
            service.performAction(mockCoordinates);
            expect(mockIsActionUsed).toBeFalse();
        });

        it('should request combat if there is a character on tile', () => {
            mapServiceMock.getCharacterOnTile.and.returnValue(CharacterType.Character2);
            gameServiceMock.createCombatRequestPayload.and.returnValue(mockCombatRequestPayload);

            const mockSessionData = {
                mode: GameMode.Classic,
                players: [
                    { id: CharacterType.Character1, team: Teams.RedTeam },
                    { id: CharacterType.Character2, team: Teams.BlueTeam },
                ],
            };

            spyOn(service, 'loadGameDataJSON').and.returnValue(JSON.stringify(mockSessionData));
            (JSON.parse as jasmine.Spy).and.returnValue(mockSessionData);

            service.performAction(mockCoordinates);

            expect(combatServiceMock.requestCombat).toHaveBeenCalledWith(mockCombatRequestPayload);
            expect(mockIsActionUsed).toBeTrue();
        });

        it('should request door update if there is no character on tile', () => {
            mapServiceMock.getCharacterOnTile.and.returnValue(CharacterType.NoCharacter);

            service.performAction(mockCoordinates);

            expect(mapServiceMock.requestDoorUpdate).toHaveBeenCalledWith(mockGameId, mockCoordinates);
        });
        it('should not request combat in CTF mode when players are on the same team', () => {
            mapServiceMock.getCharacterOnTile.and.returnValue(CharacterType.Character2);

            const mockSessionData = {
                mode: GameMode.CaptureTheFlag,
                players: [
                    { id: CharacterType.Character1, team: Teams.RedTeam },
                    { id: CharacterType.Character2, team: Teams.RedTeam },
                ],
            };

            spyOn(service, 'loadGameDataJSON').and.returnValue(JSON.stringify(mockSessionData));
            (JSON.parse as jasmine.Spy).and.returnValue(mockSessionData);

            service.performAction(mockCoordinates);

            expect(combatServiceMock.requestCombat).not.toHaveBeenCalled();
        });

        it('should request combat in CTF mode when players are on different teams', () => {
            mapServiceMock.getCharacterOnTile.and.returnValue(CharacterType.Character2);
            gameServiceMock.createCombatRequestPayload.and.returnValue(mockCombatRequestPayload);

            const mockSessionData = {
                mode: GameMode.CaptureTheFlag,
                players: [
                    { id: CharacterType.Character1, team: Teams.RedTeam },
                    { id: CharacterType.Character2, team: Teams.BlueTeam },
                ],
            };

            spyOn(service, 'loadGameDataJSON').and.returnValue(JSON.stringify(mockSessionData));
            (JSON.parse as jasmine.Spy).and.returnValue(mockSessionData);

            service.performAction(mockCoordinates);

            expect(combatServiceMock.requestCombat).toHaveBeenCalledWith(mockCombatRequestPayload);
            expect(mockIsActionUsed).toBeTrue();
        });
    });

    describe('combatAttack', () => {
        it('should call combat service combatAttack when it is client turn', () => {
            Object.defineProperty(combatServiceMock, 'isClientTurnToAttack', { get: () => true });

            service.combatAttack();

            expect(combatServiceMock.combatAttack).toHaveBeenCalledWith(mockGameId);
        });

        it('should not call combat service combatAttack when it is not client turn', () => {
            Object.defineProperty(combatServiceMock, 'isClientTurnToAttack', { get: () => false });

            service.combatAttack();

            expect(combatServiceMock.combatAttack).not.toHaveBeenCalled();
        });
    });

    describe('combatEvade', () => {
        it('should call combat service combatEvade when it is client turn', () => {
            Object.defineProperty(combatServiceMock, 'isClientTurnToAttack', { get: () => true });

            service.combatEvade();

            expect(combatServiceMock.combatEvade).toHaveBeenCalledWith(mockGameId);
        });

        it('should not call combat service combatEvade when it is not client turn', () => {
            Object.defineProperty(combatServiceMock, 'isClientTurnToAttack', { get: () => false });

            service.combatEvade();

            expect(combatServiceMock.combatEvade).not.toHaveBeenCalled();
        });
    });

    describe('dropItem', () => {
        it('should call gameService.dropItem with the provided item index', () => {
            const testIndex = 2;
            gameServiceMock.dropItem = jasmine.createSpy('dropItem');

            service.dropItem(testIndex);

            expect(gameServiceMock.dropItem).toHaveBeenCalledWith(testIndex);
        });
    });

    describe('getTeamColor', () => {
        it('should return cornsilk for NoTeam', () => {
            expect(service.getTeamColor(Teams.NoTeam)).toBe('cornsilk');
        });

        it('should return #73C2FB for BlueTeam', () => {
            expect(service.getTeamColor(Teams.BlueTeam)).toBe('#73C2FB');
        });

        it('should return #D2122E for RedTeam', () => {
            expect(service.getTeamColor(Teams.RedTeam)).toBe('#D2122E');
        });

        it('should return white for any other value', () => {
            const unknownTeam = 'unknown' as unknown as Teams;
            expect(service.getTeamColor(unknownTeam)).toBe('white');
        });
    });

    describe('closeTileInfo', () => {
        it('should set _showTileContext to false', () => {
            (service as any)._showTileContext = true;
            expect(service.showTileContext).toBeTrue();

            service.closeTileInfo();
            expect(service.showTileContext).toBeFalse();
        });
    });

    describe('getTileDescription', () => {
        it('should return the description for a known tile type', () => {
            const baseTile = new MapTile(MapTileType.Base, ItemType.NoItem);
            (service as any)._currentTile = baseTile;

            const expectedDescription = TILES.find((tool) => tool.type === MapTileType.Base)?.description;

            expect(service.getTileDescription()).toBe(expectedDescription);
        });

        it('should return undefined when type is not found in TYPE_TOOLS', () => {
            const invalidTile = { type: -999 };
            (service as any)._currentTile = invalidTile;

            expect(service.getTileDescription()).toBeUndefined();
        });
    });
});
