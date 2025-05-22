// Disabling lint to access private properties for testing purposes
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { GameEvents } from '@common/game-events';
import { GameMode } from '@common/game-mode';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreationCharacterService } from './creation-character.service';

describe('CreationCharacterService', () => {
    let service: CreationCharacterService;
    let httpClientMock: jasmine.SpyObj<HttpClient>;
    let routerMock: jasmine.SpyObj<Router>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let snackBarServiceMock: jasmine.SpyObj<SnackBarService>;

    const url = environment.serverUrl;

    beforeEach(() => {
        const httpSpy = jasmine.createSpyObj('HttpClient', ['post', 'get']);
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['connect', 'disconnect', 'on', 'isSocketAlive']);
        socketSpy.socket = jasmine.createSpyObj('Socket', ['emit']);
        const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        const snackBarRefMock = jasmine.createSpyObj('MatSnackBarRef', ['onAction', 'dismiss']);
        snackBarRefMock.onAction.and.returnValue(of(undefined));
        snackBarSpy.open.and.returnValue(snackBarRefMock);

        TestBed.configureTestingModule({
            providers: [
                CreationCharacterService,
                { provide: HttpClient, useValue: httpSpy },
                { provide: Router, useValue: routerSpy },
                { provide: SocketClientService, useValue: socketSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
            ],
        });

        service = TestBed.inject(CreationCharacterService);
        httpClientMock = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
        routerMock = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        socketServiceMock = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        snackBarServiceMock = TestBed.inject(SnackBarService) as jasmine.SpyObj<SnackBarService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('postPlayer should send POST request with correct data', () => {
        const mockData = {
            id: CharacterType.Character1,
            name: 'Test',
            bonus: 'bonus1',
            dice: DiceChoice.FourDefence,
        };
        httpClientMock.post.and.returnValue(of(true));

        service.postPlayer(CharacterType.Character1, 'Test', 'bonus1', DiceChoice.FourDefence).subscribe();

        expect(httpClientMock.post).toHaveBeenCalledWith(url + '/api/player', mockData);
    });

    it('mapAvailableChecker should navigate to waiting room if map is visible', () => {
        service.mapId = 'testMap';
        service.mode = GameMode.Classic;
        const mockResponse = JSON.stringify({ visibility: true });
        const mockGameId = 'game123';

        httpClientMock.get.and.returnValues(of(mockResponse), of(mockGameId));

        service.mapAvailableChecker();
        expect(httpClientMock.get.calls.count()).toBe(2);
        expect(httpClientMock.get.calls.argsFor(0)[0]).toBe(url + '/api/map/testMap');
        expect(httpClientMock.get.calls.argsFor(1)[0]).toBe(url + '/api/game');
        expect(routerMock.navigate).toHaveBeenCalledWith(['/creation/creation-waiting/game123'], {
            state: {
                playerInfo: undefined,
                map: 'testMap',
                joining: false,
                mode: GameMode.Classic,
            },
        });
    });

    it('mapAvailableChecker should alert and navigate if map not visible', () => {
        service.mapId = 'testMap';
        httpClientMock.get.and.returnValue(of(JSON.stringify({ visibility: false })));
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');

        service.mapAvailableChecker();

        expect(snackBarServiceMockSpy).toHaveBeenCalledWith('Carte non visible', true);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/creation']);
    });

    it('mapAvailableChecker should handle 404 error', () => {
        service.mapId = 'testMap';
        const error = { status: HttpStatusCode.NotFound };
        httpClientMock.get.and.returnValue(throwError(() => error));
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');

        service.mapAvailableChecker();

        expect(snackBarServiceMockSpy).toHaveBeenCalledWith('Carte non trouvée', true);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/creation']);
    });

    it('mapAvailableChecker should handle JSON parse error', () => {
        service.mapId = 'testMap';
        httpClientMock.get.and.returnValue(of('invalid'));
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');

        service.mapAvailableChecker();

        expect(snackBarServiceMockSpy).toHaveBeenCalledWith(jasmine.stringContaining('Erreur de traitement de reponse:'), true);
    });

    it('getGameId should fetch game ID', () => {
        const mockGameId = 'game123';
        httpClientMock.get.and.returnValue(of(mockGameId));

        service.getGameId().subscribe((gameId) => {
            expect(gameId).toBe(mockGameId);
        });

        expect(httpClientMock.get.calls.count()).toBe(1);
        expect(httpClientMock.get.calls.mostRecent().args[0]).toBe(url + '/api/game');
    });

    it('onSubmit should set playerInfo and call postPlayer', () => {
        spyOn(service, 'postPlayer').and.returnValue(of(true));
        spyOn(service, 'mapAvailableChecker');

        service.onSubmit(CharacterType.Character1, 'Test', 'bonus', DiceChoice.FourDefence);

        expect(service.playerInfo).toEqual({
            userId: '0',
            id: CharacterType.Character1,
            name: 'Test',
            bonus: 'bonus',
            dice: DiceChoice.FourDefence,
            admin: false,
        });
        expect(service.postPlayer).toHaveBeenCalledWith(CharacterType.Character1, 'Test', 'bonus', DiceChoice.FourDefence);
        expect(service.mapAvailableChecker).toHaveBeenCalled();
    });

    it('onSubmit should alert on invalid character', () => {
        spyOn(service, 'postPlayer').and.returnValue(of(false));
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');

        service.onSubmit(CharacterType.Character1, 'Test', 'bonus', DiceChoice.FourDefence);

        expect(snackBarServiceMockSpy).toHaveBeenCalledWith('Personnage non-valide', true);
    });

    it('onSubmit should alert on API error', () => {
        spyOn(service, 'postPlayer').and.returnValue(throwError(() => new Error('API Error')));
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');

        service.onSubmit(CharacterType.Character1, 'Test', 'bonus', DiceChoice.FourDefence);

        expect(snackBarServiceMockSpy).toHaveBeenCalledWith("Erreur de récupération des données de l'API", true);
    });

    it('should connect to the socket if it is not alive (connect)', () => {
        socketServiceMock.isSocketAlive.and.returnValue(false);
        spyOn(service, 'configureBaseSocketFeatures');

        service.gameId = 'testGameId';
        service.connect();

        expect(socketServiceMock.connect).toHaveBeenCalledWith('testGameId');
        expect(service.configureBaseSocketFeatures).toHaveBeenCalled();
    });

    it('should not connect to the socket if it is already alive (connect)', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        spyOn(service, 'configureBaseSocketFeatures');

        service.connect();

        expect(socketServiceMock.connect).not.toHaveBeenCalled();
        expect(service.configureBaseSocketFeatures).not.toHaveBeenCalled();
    });

    it('should emit CharacterSelect event when onCharacterSelect is called', () => {
        service.gameId = 'testGameId';
        service.previousSelected = CharacterType.Character1;
        service.joining = true;

        service.onCharacterSelect(CharacterType.Character2);

        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.CharacterSelect, {
            gameId: 'testGameId',
            characterId: CharacterType.Character2,
            previousSelected: CharacterType.Character1,
        });
        expect(service.previousSelected).toBe(CharacterType.Character2);
    });

    it('should not emit CharacterSelect event if not joining (onCharacterSelect)', () => {
        service.joining = false;

        service.onCharacterSelect(CharacterType.Character2);

        expect(socketServiceMock.socket.emit).not.toHaveBeenCalled();
    });

    it('should emit JoinCreatingRoom event when joinCreatingRoom is called', () => {
        service.gameId = 'testGameId';

        service.joinCreatingRoom();

        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.JoinCreatingRoom, { gameId: 'testGameId' });
    });

    it('should update available characters when GameEvents.CharacterSelect is received', () => {
        const selectedCharacters = [CharacterType.Character1, CharacterType.Character2];
        const expectedAvailableCharacters = service.characters.filter((character) => !selectedCharacters.includes(character));

        socketServiceMock.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === GameEvents.CharacterSelect) {
                setTimeout(() => callback(selectedCharacters), 0);
            }
        });

        let receivedCharacters: CharacterType[] | undefined;
        service.availableCharacters$.subscribe((availableCharacters) => {
            receivedCharacters = availableCharacters;
        });

        service.configureBaseSocketFeatures();

        expect(receivedCharacters).toEqual(service.characters);

        const characterSelectCallback = socketServiceMock.on.calls.allArgs().find((args) => args[0] === GameEvents.CharacterSelect)?.[1];

        if (characterSelectCallback) {
            characterSelectCallback(selectedCharacters);
            expect(receivedCharacters).toEqual(expectedAvailableCharacters);
        }
    });

    it('should navigate to waiting room when GameEvents.RoomLocked is received with locked=false', () => {
        service.gameId = 'testGameId';
        service.playerInfo = {
            userId: '1',
            id: CharacterType.Character1,
            name: 'Test',
            bonus: 'bonus',
            dice: DiceChoice.FourDefence,
            admin: false,
        };
        service.mapId = 'testMap';
        service.mode = GameMode.Classic;

        let roomLockedCallback: ((data: any) => void) | undefined;

        socketServiceMock.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === GameEvents.RoomLocked) {
                roomLockedCallback = callback;
            }
        });
        service.configureBaseSocketFeatures();

        expect(socketServiceMock.on).toHaveBeenCalledWith(GameEvents.RoomLocked, jasmine.any(Function));

        if (roomLockedCallback) {
            roomLockedCallback(false);

            expect(routerMock.navigate).toHaveBeenCalledWith(['/creation/creation-waiting/testGameId'], {
                state: {
                    playerInfo: service.playerInfo,
                    map: service.mapId,
                    joining: true,
                    mode: GameMode.Classic,
                },
            });
        } else {
            fail('Room locked callback was not set');
        }
    });

    it('should show notification when GameEvents.RoomLocked is received with locked=true', () => {
        let roomLockedCallback: ((data: any) => void) | undefined;

        socketServiceMock.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === GameEvents.RoomLocked) {
                roomLockedCallback = callback;
            }
        });

        service.configureBaseSocketFeatures();
        expect(socketServiceMock.on).toHaveBeenCalledWith(GameEvents.RoomLocked, jasmine.any(Function));
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');
        if (roomLockedCallback) {
            roomLockedCallback(true);

            expect(snackBarServiceMockSpy).toHaveBeenCalledWith('Salle verrouille', true);
            expect(routerMock.navigate).not.toHaveBeenCalled();
        } else {
            fail('Room locked callback was not set');
        }
    });

    it('should show notification, disconnect socket, and navigate to home when GameEvents.RoomDestroyed is received', () => {
        let roomDestroyedCallback: ((data: any) => void) | undefined;

        socketServiceMock.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === GameEvents.RoomDestroyed) {
                roomDestroyedCallback = callback;
            }
        });

        service.configureBaseSocketFeatures();

        expect(socketServiceMock.on).toHaveBeenCalledWith(GameEvents.RoomDestroyed, jasmine.any(Function));
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');

        if (roomDestroyedCallback) {
            roomDestroyedCallback(undefined);

            expect(snackBarServiceMockSpy).toHaveBeenCalledWith("La partie a été annulée par l'administrateur", true);
            expect(socketServiceMock.disconnect).toHaveBeenCalled();
            expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
        } else {
            fail('Room destroyed callback was not set');
        }
    });

    it('should emit RoomLocked event and return when joining is true', () => {
        service.joining = true;
        service.gameId = 'testGameId';

        service.mapAvailableChecker();

        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.RoomLocked, { gameId: 'testGameId' });
        expect(httpClientMock.get).not.toHaveBeenCalled();
        expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('mapAvailableChecker should handle non-404 errors', () => {
        service.mapId = 'testMap';
        const error = { status: HttpStatusCode.InternalServerError, message: 'Internal Server Error' };
        httpClientMock.get.and.returnValue(throwError(() => error));
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');

        service.mapAvailableChecker();

        expect(snackBarServiceMockSpy).toHaveBeenCalledWith(`Erreur de récupération de la carte:${error}`, true);
        expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should call disconnect on socket service when disconnect is called', () => {
        service.disconnect();

        expect(socketServiceMock.disconnect).toHaveBeenCalled();
    });
});
