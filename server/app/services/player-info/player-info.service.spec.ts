import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { PlayerInfo } from '@common/player-info';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerInfoService } from './player-info.service';

describe('PlayerInfoService', () => {
    let service: PlayerInfoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PlayerInfoService],
        }).compile();

        service = module.get<PlayerInfoService>(PlayerInfoService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should allow a valid player', () => {
        const validPlayer: PlayerInfo = {
            userId: '123',
            admin: false,
            id: CharacterType.Character6,
            name: 'ValidName',
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
        };

        expect(service.isPlayerAllowed(validPlayer)).toBe(true);
    });

    it('should disallow a player with missing answers', () => {
        const missingPlayer: PlayerInfo = {
            userId: '123',
            admin: false,
            id: CharacterType.Character6,
            name: 'ValidName',
            bonus: '',
            dice: null,
        };

        expect(service.isPlayerAllowed(missingPlayer)).toBe(false);
    });

    it('should disallow a player with unaccepted bonus', () => {
        const invalidBonusPlayer: PlayerInfo = {
            userId: '123',
            admin: false,
            id: CharacterType.Character6,
            name: 'ValidName',
            bonus: 'allo',
            dice: DiceChoice.FourDefence,
        };

        expect(service.isPlayerAllowed(invalidBonusPlayer)).toBe(false);
    });

    it('should disallow a player with unaccepted dice', () => {
        const invalidDicePlayer: PlayerInfo = {
            userId: '123',
            admin: false,
            id: CharacterType.Character5,
            name: 'ValidName',
            bonus: 'vie',
            dice: 'invalid_dice_value' as unknown as DiceChoice,
        };

        expect(service.isPlayerAllowed(invalidDicePlayer)).toBe(false);
    });

    it('should disallow a player with a characterName containing only spaces', () => {
        const spaceNamePlayer: PlayerInfo = {
            userId: '123',
            admin: false,
            id: CharacterType.Character6,
            name: '    ',
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
        };

        expect(service.isPlayerAllowed(spaceNamePlayer)).toBe(false);
    });

    it('should disallow a player with invalid characters in characterName', () => {
        const invalidChar = '⠀';
        const invalidNamePlayer: PlayerInfo = {
            userId: '123',
            admin: false,
            id: CharacterType.Character6,
            name: `Valid${invalidChar}Name`,
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
        };

        expect(service.isPlayerAllowed(invalidNamePlayer)).toBe(false);
    });

    it('should note allow a player with a characterName length outside the range', () => {
        const outOfRangeNamePlayer: PlayerInfo = {
            userId: '123',
            admin: false,
            id: CharacterType.Character6,
            name: '123456789123456789123456753458384583458345834588',
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
        };

        expect(service.isPlayerAllowed(outOfRangeNamePlayer)).toBe(false);
    });
});
