// disable no any so that the private attributes can be accessed
/* eslint-disable @typescript-eslint/no-explicit-any */
// Disable to many lines to add all necessiry tests
/* eslint-disable max-lines */
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { CreationWaitingService } from '@app/services/creation-waiting-service/creation-waiting.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { GameEvents } from '@common/game-events';
import { GameMode } from '@common/game-mode';
import { MapSize } from '@common/map-size';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';

describe('CreationWaitingService', () => {
    let service: CreationWaitingService;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let routerMock: jasmine.SpyObj<Router>;
    let snackBarMock: jasmine.SpyObj<MatSnackBar>;
    let snackBarRefMock: jasmine.SpyObj<MatSnackBarRef<TextOnlySnackBar>>;
    let httpMock: jasmine.SpyObj<HttpClient>;

    function getCallbackForEvent(eventName: string): (...args: unknown[]) => void {
        const socketCall = socketServiceMock.on.calls.all().find((call) => call.args[0] === eventName);
        if (!socketCall) {
            throw new Error(`Event listener for "${eventName}" not found.`);
        }
        return socketCall.args[1];
    }

    beforeEach(async () => {
        socketServiceMock = jasmine.createSpyObj<SocketClientService>('SocketClientService', ['connect', 'disconnect', 'on']);
        socketServiceMock.socket = jasmine.createSpyObj('Socket', ['emit', 'disconnect']);
        routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
        snackBarMock = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        snackBarRefMock = jasmine.createSpyObj<MatSnackBarRef<TextOnlySnackBar>>('MatSnackBarRef', ['onAction', 'dismiss']);
        httpMock = jasmine.createSpyObj('HttpClient', ['get']);

        snackBarRefMock.onAction.and.returnValue(of(undefined));
        snackBarRefMock.dismiss.and.callThrough();
        snackBarMock.open.and.returnValue(snackBarRefMock);

        await TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, MatSnackBarModule],
            providers: [
                CreationWaitingService,
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: Router, useValue: routerMock },
                { provide: MatSnackBar, useValue: snackBarMock },
                { provide: HttpClient, useValue: httpMock },
            ],
        }).compileComponents();

        service = TestBed.inject(CreationWaitingService);
        service.clientPlayer = {
            userId: 'userId',
            id: CharacterType.Character1,
            name: 'testPlayer',
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
            admin: true,
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should disconnect socket and navigate to home when not starting game', () => {
        service.isStartingGame = false;

        service.disconnect();

        expect(socketServiceMock.socket.disconnect).toHaveBeenCalled();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should not disconnect socket or navigate when starting game', () => {
        service.isStartingGame = true;

        service.disconnect();

        expect(socketServiceMock.disconnect).not.toHaveBeenCalled();
        expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should set player userId on RoomCreated event', () => {
        service.configureBaseSocketFeatures();
        const roomCreatedCallback = getCallbackForEvent(GameEvents.RoomCreated);
        roomCreatedCallback(undefined);
        expect(service.clientPlayer.userId).toBe(service.socketId);
    });

    it('should update users list on PlayerList event', () => {
        service.configureBaseSocketFeatures();
        const playerListCallback = getCallbackForEvent(GameEvents.PlayerList);
        playerListCallback([
            {
                userId: 'user123',
                characterId: CharacterType.Character1,
                characterName: 'userName',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: true,
            },
        ]);
        expect(service.users.length).toBe(1);
        expect(service.users[0].id).toBe('user123');
    });

    it('should lock the room and set maxPlayers to true if max players reached for map Small', () => {
        service.mapSize = 10;
        service.configureBaseSocketFeatures();
        const playerListCallback = getCallbackForEvent(GameEvents.PlayerList);
        playerListCallback([
            {
                userId: 'user123',
                characterId: CharacterType.Character1,
                characterName: 'userName',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: true,
            },
            {
                userId: 'user124',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
        ]);
        expect(service.isLocked).toBeTrue();
        expect(service.isGameFull).toBeTrue();
    });
    it('should lock the room and set maxPlayers to true if max players reached for map Medium', () => {
        service.mapSize = 15;
        service.configureBaseSocketFeatures();
        const playerListCallback = getCallbackForEvent(GameEvents.PlayerList);
        playerListCallback([
            {
                userId: 'user123',
                characterId: CharacterType.Character1,
                characterName: 'userName',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: true,
            },
            {
                userId: 'user124',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
            {
                userId: 'user125',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
            {
                userId: 'user126',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
        ]);
        expect(service.isLocked).toBeTrue();
        expect(service.isGameFull).toBeTrue();
    });

    it('should lock the room and set maxPlayers to true if max players reached for map Large', () => {
        service.mapSize = 20;
        service.configureBaseSocketFeatures();
        const playerListCallback = getCallbackForEvent(GameEvents.PlayerList);
        playerListCallback([
            {
                userId: 'user123',
                characterId: CharacterType.Character1,
                characterName: 'userName',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: true,
            },
            {
                userId: 'user124',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
            {
                userId: 'user125',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
            {
                userId: 'user126',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
            {
                userId: 'user127',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
            {
                userId: 'user128',
                characterId: CharacterType.Character2,
                characterName: 'userName2',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            },
        ]);
        expect(service.isLocked).toBeTrue();
        expect(service.isGameFull).toBeTrue();
    });

    it('should navigate to home and disconnect on KickUser event', fakeAsync(() => {
        routerMock.navigate.and.returnValue(Promise.resolve(true));
        service.configureBaseSocketFeatures();
        const kickUserCallback = getCallbackForEvent(GameEvents.KickUser);
        kickUserCallback();
        tick();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
        expect(socketServiceMock.disconnect).toHaveBeenCalled();
    }));

    it('should navigate to home and disconnect on RoomDestroyed event', fakeAsync(() => {
        routerMock.navigate.and.returnValue(Promise.resolve(true));
        service.configureBaseSocketFeatures();
        const roomDestroyedCallback = getCallbackForEvent(GameEvents.RoomDestroyed);
        roomDestroyedCallback();
        tick();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
        expect(socketServiceMock.disconnect).toHaveBeenCalled();
    }));

    it('should call connectToGame on connect event', () => {
        spyOn(service, 'connectToGame');
        service.configureBaseSocketFeatures();
        const connectCallback = getCallbackForEvent('connect');
        connectCallback();
        expect(service.connectToGame).toHaveBeenCalled();
    });

    it('should navigate to game page and set session storage on StartGame event', () => {
        routerMock.navigate.and.returnValue(Promise.resolve(true));
        spyOn(sessionStorage, 'setItem');
        service.clientPlayer.userId = 'c1';
        service.configureBaseSocketFeatures();
        const startGameCallback = getCallbackForEvent(GameEvents.StartGame);
        startGameCallback({ players: [], map: {} });
        expect(sessionStorage.setItem).toHaveBeenCalledWith(
            'gameData',
            JSON.stringify({
                players: [],
                clientId: 'c1',
            }),
        );
        expect(routerMock.navigate).toHaveBeenCalledWith([`/game/${service.gameId}`]);
    });

    it('should update player characterName on ConfirmName event', () => {
        service.configureBaseSocketFeatures();
        const confirmNameCallback = getCallbackForEvent(GameEvents.ConfirmName);
        confirmNameCallback('testCharacterName');
        expect(service.clientPlayer.name).toBe('testCharacterName');
    });

    it('should emit KickUser event with gameId and userId', () => {
        service.gameId = 'testGameId';
        const userId = 'testUserId';
        service.onKickUser(userId);
        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.KickUser, {
            gameId: 'testGameId',
            userId: 'testUserId',
        });
    });

    it('should call socketService.connect and configureBaseSocketFeatures', () => {
        service.gameId = 'testGameId';
        spyOn(service, 'configureBaseSocketFeatures');
        service.connect();
        expect(socketServiceMock.connect).toHaveBeenCalledWith('testGameId');
        expect(service.configureBaseSocketFeatures).toHaveBeenCalled();
    });

    it('should set isLocked to true and not emit TogglePublic if maxPlayers is true', () => {
        service.isGameFull = true;
        service.gameId = 'testGameId';
        service.onTogglePublic();
        expect(service.isLocked).toBeTrue();
        expect(socketServiceMock.socket.emit).not.toHaveBeenCalled();
    });

    it('should emit TogglePublic event with gameId if maxPlayers is false', () => {
        service.isGameFull = false;
        service.gameId = 'testGameId';
        service.onTogglePublic();
        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.TogglePublic, {
            gameId: 'testGameId',
        });
    });

    it('should not emit any event if gameId is not set', () => {
        service.gameId = '';
        service.connectToGame();
        expect(socketServiceMock.socket.emit).not.toHaveBeenCalled();
    });

    it('should emit JoinRoom event with gameId, player, and mapId if joining is true', () => {
        service.gameId = 'testGameId';
        service.joining = true;
        service.clientPlayer = {
            userId: 'testUserId',
            id: CharacterType.Character1,
            name: 'testPlayer',
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
            admin: false,
        };
        service.mapId = 'testMapId';
        service.connectToGame();
        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.JoinRoom, {
            gameId: 'testGameId',
            player: service.clientPlayer,
            map: 'testMapId',
        });
    });

    it('should emit CreateRoom event with gameId, player, and mapId if joining is false', () => {
        service.gameId = 'testGameId';
        service.joining = false;
        service.clientPlayer = {
            userId: 'testUserId',
            id: CharacterType.Character1,
            name: 'testPlayer',
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
            admin: false,
        };
        service.mapId = 'testMapId';
        service.connectToGame();
        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.CreateRoom, {
            gameId: 'testGameId',
            player: service.clientPlayer,
            map: 'testMapId',
        });
    });

    it('should show notification and not emit StartGame if users.length < 2 and isLocked is false', () => {
        service.users = [
            {
                name: 'userName',
                character: CharacterType.Character1,
                id: 'user123',
            },
        ];
        service.isLocked = false;
        service.startGame();
        expect(snackBarMock.open).toHaveBeenCalledWith('Il faut au moins 2 joueurs pour commencer la partie', 'OK', {
            duration: 5000,
            panelClass: 'snackbar',
        });
        expect(socketServiceMock.socket.emit).not.toHaveBeenCalled();
    });

    it('should emit StartGame event with gameId if users.length >= 2 or isLocked is true', () => {
        service.users = [
            {
                name: 'userName',
                character: CharacterType.Character1,
                id: 'user123',
            },
            {
                name: 'userName2',
                character: CharacterType.Character2,
                id: 'user124',
            },
        ];
        service.isLocked = true;
        service.gameId = 'testGameId';
        service.clientPlayer.admin = true;
        service.startGame();
        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.StartGame, {
            gameId: 'testGameId',
        });
        expect(snackBarMock.open).not.toHaveBeenCalled();
    });

    it('should return the socket ID when the socket and ID exist', () => {
        const mockSocketId = 'testSocket123';
        (socketServiceMock.socket as any).id = mockSocketId;

        const result = service.socketId;
        expect(result).toBe(mockSocketId);
    });

    it('should show notification to lock game when users >=2 but game is unlocked', () => {
        service.users = [
            { name: 'user1', character: CharacterType.Character1, id: 'user123' },
            { name: 'user2', character: CharacterType.Character2, id: 'user124' },
        ];
        service.isLocked = false;

        service.startGame();

        expect(snackBarMock.open).toHaveBeenCalledWith('Veuillez verrouiller la partie avant de la commencer', 'OK', {
            duration: 5000,
            panelClass: 'snackbar',
        });
        expect(socketServiceMock.socket.emit).not.toHaveBeenCalled();
    });

    it('should call HTTP GET with the correct URL', () => {
        const mapId = 'testMapId';
        const expectedUrl = `${environment.serverUrl}/api/map/${mapId}/size`;
        service.mapId = mapId;
        httpMock.get.and.returnValue(of(MapSize.Small));
        service.getSize().subscribe((size) => {
            expect(size).toBe(MapSize.Small);
        });
        expect(httpMock.get).toHaveBeenCalledWith(expectedUrl);
    });

    it('should show notification when mode is CTF and users count is odd', () => {
        service.mode = GameMode.CaptureTheFlag;
        service.users = [
            { name: 'user1', character: CharacterType.Character1, id: 'user123' },
            { name: 'user2', character: CharacterType.Character2, id: 'user124' },
            { name: 'user3', character: CharacterType.Character3, id: 'user125' },
        ];
        service.isLocked = true;
        service.gameId = 'testGameId';

        (socketServiceMock.socket.emit as jasmine.Spy).calls.reset();

        service.startGame();

        expect(snackBarMock.open).toHaveBeenCalledWith('En mode CTF, il faut un nombre paire de joueurs', 'OK', {
            duration: 5000,
            panelClass: 'snackbar',
        });
        expect(socketServiceMock.socket.emit).not.toHaveBeenCalled();
    });

    it('should emit StartGame when mode is CTF and users count is even', () => {
        service.mode = GameMode.CaptureTheFlag;
        service.users = [
            { name: 'user1', character: CharacterType.Character1, id: 'user123' },
            { name: 'user2', character: CharacterType.Character2, id: 'user124' },
            { name: 'user3', character: CharacterType.Character3, id: 'user125' },
            { name: 'user4', character: CharacterType.Character4, id: 'user126' },
        ];
        service.isLocked = true;
        service.gameId = 'testGameId';

        (socketServiceMock.socket.emit as jasmine.Spy).calls.reset();
        (snackBarMock.open as jasmine.Spy).calls.reset();

        service.startGame();

        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.StartGame, {
            gameId: 'testGameId',
        });
        expect(snackBarMock.open).not.toHaveBeenCalled();
    });

    it('should not check for even player count when mode is not CTF', () => {
        service.mode = GameMode.Classic;
        service.users = [
            { name: 'user1', character: CharacterType.Character1, id: 'user123' },
            { name: 'user2', character: CharacterType.Character2, id: 'user124' },
            { name: 'user3', character: CharacterType.Character3, id: 'user125' },
        ];
        service.isLocked = true;
        service.gameId = 'testGameId';

        (socketServiceMock.socket.emit as jasmine.Spy).calls.reset();

        service.startGame();

        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.StartGame, {
            gameId: 'testGameId',
        });
    });

    describe('addAi', () => {
        it('should emit AddAi event with gameId and type', () => {
            service.gameId = 'testGameId';
            const aiType = 'aggressive';

            service.addAi(aiType);

            expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.AddAi, {
                gameId: 'testGameId',
                type: aiType,
            });
        });

        it('should not emit AddAi event if gameId is empty', () => {
            service.gameId = '';
            const aiType = 'defensive';

            (socketServiceMock.socket.emit as jasmine.Spy).calls.reset();
            service.addAi(aiType);
            expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.AddAi, {
                gameId: '',
                type: aiType,
            });
        });
    });
});
