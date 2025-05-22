import { GameRoomService } from '@app/services/game-room/game-room.service';
import { MAX_ROOM_ID, MIN_ROOM_ID } from '@common/random-generator';
import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Creation de salle de jeu')
@Controller('game')
export class GameController {
    constructor(private readonly gameRoomService: GameRoomService) {}

    @ApiOkResponse({
        description: 'Create room',
        type: String,
    })
    @Get('/')
    async createRoom(): Promise<string> {
        try {
            let room: string;

            do {
                room = String(Math.floor(Math.random() * (MAX_ROOM_ID - MIN_ROOM_ID + 1)) + MIN_ROOM_ID);
            } while (!this.gameRoomService.addRoom(room));

            return room;
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOkResponse({
        description: 'Join a room',
        type: String,
    })
    @Post('/')
    async joinRoom(@Body('room') room: string): Promise<string> {
        try {
            if (!this.gameRoomService.checkRoomExists(room)) return 'Room does not exist';
            else if (this.gameRoomService.checkLock(room)) return 'Room is locked';
            else return 'Room exists';
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
