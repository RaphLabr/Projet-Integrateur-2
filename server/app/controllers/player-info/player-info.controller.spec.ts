import { PlayerInfoController } from '@app/controllers/player-info/player-info.controller';
import { PlayerInfoService } from '@app/services/player-info/player-info.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { PlayerInfo } from '@common/player-info';
import { Test, TestingModule } from '@nestjs/testing';

const mockPlayerInfoService = {
    isPlayerAllowed: jest.fn(),
};

describe(' PlayerInfoController', () => {
    let controller: PlayerInfoController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PlayerInfoController],
            providers: [{ provide: PlayerInfoService, useValue: mockPlayerInfoService }],
        }).compile();

        controller = module.get<PlayerInfoController>(PlayerInfoController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should create a player', () => {
        const playerInfo: PlayerInfo = {
            userId: '',
            admin: false,
            id: CharacterType.Character1,
            name: 'John',
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
        };

        const expectedResult = {
            characterId: expect.any(Number),
            ...playerInfo,
        };

        mockPlayerInfoService.isPlayerAllowed.mockReturnValue(expectedResult);

        const result = controller.verifyPlayer(playerInfo);
        expect(mockPlayerInfoService.isPlayerAllowed).toHaveBeenCalledWith(playerInfo);
        expect(result).toEqual(expectedResult);
    });
});
