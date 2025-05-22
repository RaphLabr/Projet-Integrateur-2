import { PlayerInfoService } from '@app/services/player-info/player-info.service';
import { PlayerInfo } from '@common/player-info';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Player creation')
@Controller('player')
export class PlayerInfoController {
    constructor(private readonly _playerInfoService: PlayerInfoService) {}

    @Post('/')
    verifyPlayer(@Body() playerInfo: PlayerInfo): boolean {
        return this._playerInfoService.isPlayerAllowed(playerInfo);
    }
}
