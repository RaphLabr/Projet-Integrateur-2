import { GameController } from '@app/controllers/game/game.controller';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

const mockGameRoomService = {
    addRoom: jest.fn(),
    checkRoomExists: jest.fn(),
    checkLock: jest.fn(),
};

describe('GameController', () => {
    let controller: GameController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GameController],
            providers: [
                {
                    provide: GameRoomService,
                    useValue: mockGameRoomService,
                },
            ],
        }).compile();

        controller = module.get<GameController>(GameController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createRoom', () => {
        it('should create a room and return the room ID', async () => {
            jest.spyOn(mockGameRoomService, 'addRoom').mockReturnValueOnce(true);

            const result = await controller.createRoom();
            expect(typeof result).toBe('string');
        });

        it('should throw an HttpException if an error occurs', async () => {
            jest.spyOn(mockGameRoomService, 'addRoom').mockImplementationOnce(() => {
                throw new Error('Internal Server Error');
            });

            await expect(controller.createRoom()).rejects.toThrow(HttpException);
        });
    });

    describe('joinRoom', () => {
        it('should return "Room does not exist" if the room does not exist', async () => {
            jest.spyOn(mockGameRoomService, 'checkRoomExists').mockReturnValueOnce(false);

            const result = await controller.joinRoom('1234');
            expect(result).toBe('Room does not exist');
        });

        it('should return "Room is locked" if the room is locked', async () => {
            jest.spyOn(mockGameRoomService, 'checkRoomExists').mockReturnValueOnce(true);
            jest.spyOn(mockGameRoomService, 'checkLock').mockReturnValueOnce(true);

            const result = await controller.joinRoom('1234');
            expect(result).toBe('Room is locked');
        });

        it('should return "Room exists" if the room exists and is not locked', async () => {
            jest.spyOn(mockGameRoomService, 'checkRoomExists').mockReturnValueOnce(true);
            jest.spyOn(mockGameRoomService, 'checkLock').mockReturnValueOnce(false);

            const result = await controller.joinRoom('1234');
            expect(result).toBe('Room exists');
        });

        it('should throw an HttpException if an error occurs', async () => {
            jest.spyOn(mockGameRoomService, 'checkRoomExists').mockImplementationOnce(() => {
                throw new Error('Internal Server Error');
            });

            await expect(controller.joinRoom('1234')).rejects.toThrow(HttpException);
        });
    });
});
