// Disabling lint to use any to handle the case where service is null
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { DoorUpdateRequestPayload } from '@common/door-update-request-payload';
import { GameEvents } from '@common/game-events';
import { MovementDataToServer } from '@common/movement-data-server';
import { QuitDataToServer } from '@common/quit-data-server';
import { TeleportData } from '@common/teleport-data';
import { Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { SocketClientService } from './socket-client.service';

describe('SocketClientService', () => {
    let service: SocketClientService;
    let mockSocket: jasmine.SpyObj<Socket>;
    let mockIoFunction: jasmine.Spy;

    beforeEach(() => {
        mockSocket = jasmine.createSpyObj('Socket', ['connected', 'disconnect', 'on', 'emit']);
        mockIoFunction = jasmine.createSpy('io').and.returnValue(mockSocket);

        TestBed.configureTestingModule({
            providers: [SocketClientService, { provide: 'SOCKET_IO', useValue: mockIoFunction }],
        });
        service = TestBed.inject(SocketClientService);
        (service as any).ioFunction = mockIoFunction;
        (service as any).socket = mockSocket;
    });

    afterEach(() => {
        sessionStorage.removeItem('roomToken');
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return true if socket is alive', () => {
        mockSocket.connected = true;
        (service as any).socket = mockSocket;
        expect(service.isSocketAlive()).toBeTrue();
    });

    it('should return false if socket is not alive', () => {
        (service as any).socket = null;
        expect(service.isSocketAlive()).toBeFalse();
    });

    it('should disconnect the socket', () => {
        (service as any).socket = mockSocket;
        service.disconnect();
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should throw an error if socket is not initialized when calling on', () => {
        (service as any).socket = null;
        const action = jasmine.createSpy('action');
        expect(() => service.on('event', action)).toThrowError('Socket is not initialized. Call connect() first.');
    });

    it('should register an event listener if socket is initialized', () => {
        (service as any).socket = mockSocket;
        const event = 'mockEvent';
        const action = jasmine.createSpy('action');

        service.on(event, action);

        expect(mockSocket.on).toHaveBeenCalledWith(event, action);
    });

    it('should initialize the socket connection with the correct parameters', () => {
        const gameId = 'testGameId';
        const token = 'testToken';
        sessionStorage.setItem('roomToken', token);

        service.connect(gameId);

        expect(mockIoFunction).toHaveBeenCalledWith(`${environment.serverUrl}/game`, {
            transports: ['websocket'],
            upgrade: false,
            auth: { token, gameId },
        });
    });

    describe('emit functions', () => {
        it('should emit movement event with correct data', () => {
            const movementData: MovementDataToServer = {
                gameId: 'testGame',
                path: [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
            };

            service.emitMovement(movementData);

            expect(mockSocket.emit).toHaveBeenCalledWith(GameEvents.MovePlayer, movementData);
        });

        it('should emit toggle debug event with correct game ID', () => {
            const gameId = 'testGame';

            service.emitToggleDebug(gameId);

            expect(mockSocket.emit).toHaveBeenCalledWith(GameEvents.ToggleDebug, gameId);
        });

        it('should emit player teleport event with correct data', () => {
            const teleportData: TeleportData = {
                gameId: 'testGame',
                from: { x: 0, y: 0 },
                to: { x: 1, y: 1 },
            };

            service.emitPlayerTeleport(teleportData);

            expect(mockSocket.emit).toHaveBeenCalledWith(GameEvents.TeleportPlayer, teleportData);
        });

        it('should emit player quit event with correct data', () => {
            const quitData: QuitDataToServer = {
                gameId: 'testGame',
                playerName: 'testPlayer',
                playerPosition: { x: 1, y: 1 },
            };

            service.emitPlayerQuit(quitData);

            expect(mockSocket.emit).toHaveBeenCalledWith(GameEvents.PlayerQuit, quitData);
        });

        it('should emit door update event with correct data', () => {
            const doorUpdateData: DoorUpdateRequestPayload = {
                gameId: 'testGame',
                playerPosition: { x: 0, y: 0 },
                doorPosition: { x: 1, y: 1 },
            };

            service.emitDoorUpdate(doorUpdateData);

            expect(mockSocket.emit).toHaveBeenCalledWith(GameEvents.UpdateDoor, doorUpdateData);
        });
    });

    describe('item drop', () => {
        it('should emit item drop event with correct data', () => {
            const itemDropData = {
                gameId: 'testGame',
                itemIndex: 2,
                itemPosition: { x: 3, y: 4 },
            };

            service.emitItemDrop(itemDropData);

            expect(mockSocket.emit).toHaveBeenCalledWith(GameEvents.ItemDrop, itemDropData);
        });
    });
});
