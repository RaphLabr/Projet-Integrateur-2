import { MAX_NAME, MIN_NAME } from '@app/constants/character-constants';
import { DiceChoice } from '@common/dice-choice';
import { PlayerInfo } from '@common/player-info';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerInfoService {
    isPlayerAllowed(player: PlayerInfo): boolean {
        if (!this.hasNonEmptyAnswers(player)) {
            return false;
        } else if (!this.containsAcceptedAnswers(player)) {
            return false;
        } else if (this.containsInvalidChars(player.name)) {
            return false;
        } else if (this.notOnlySpaceInName(player.name)) {
            return false;
        }
        return true;
    }

    private hasNonEmptyAnswers(player: PlayerInfo): boolean {
        return Boolean(player.bonus && player.id && player.dice && player.name);
    }

    private notOnlySpaceInName(str: string): boolean {
        return str.trim().length === 0;
    }

    private containsAcceptedAnswers(player: PlayerInfo): boolean {
        if (!(player.bonus === 'vie' || player.bonus === 'rapidite')) {
            return false;
        }
        if (!(player.dice === DiceChoice.FourDefence || player.dice === DiceChoice.SixDefence)) {
            return false;
        }

        if (!(player.name.length >= MIN_NAME && player.name.length <= MAX_NAME)) {
            return false;
        }
        return true;
    }

    private containsInvalidChars(str: string): boolean {
        const invalidChars = '⠀';
        return invalidChars.split('').some((invalidChar) => str.includes(invalidChar));
    }
}
