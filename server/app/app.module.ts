import { GameController } from '@app/controllers/game/game.controller';
import { MapController } from '@app/controllers/map/map-controller';
import { PlayerInfoController } from '@app/controllers/player-info/player-info.controller';
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameReceiverGateway } from '@app/gateways/game-receiver/game-receiver.gateway';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { GameMap, mapSchema } from '@app/model/database/game-map';
import { AggressivePlayerService } from '@app/services/aggressive-player/aggressive-player.service';
import { ChatRoomService } from '@app/services/chat-room/chat-room.service';
import { CombatMessagesService } from '@app/services/combat-messages/combat-messages.service';
import { CombatService } from '@app/services/combat/combat.service';
import { DefensivePlayerService } from '@app/services/defensive-player/defensive-player.service';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { MapGeneratorService } from '@app/services/draw-map/draw-map.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { GameService } from '@app/services/game/game.service';
import { MapValidationService } from '@app/services/map-validation/map-validation.service';
import { MapService } from '@app/services/map/map.service';
import { PlayerInfoService } from '@app/services/player-info/player-info.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GameObjectGeneratorService } from './services/game-object-generator/game-object-generator.service';
import { VirtualPlayerMovementService } from './services/virtual-player-movement/virtual-player-movement.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                uri: config.get<string>('MONGODB_URI'),
            }),
        }),
        MongooseModule.forFeature([{ name: GameMap.name, schema: mapSchema }]),
    ],
    controllers: [MapController, PlayerInfoController, GameController],
    providers: [
        Logger,
        MapService,
        MapGeneratorService,
        MapValidationService,
        PlayerInfoService,
        GameRoomGateway,
        GameRoomService,
        GameService,
        GameTimerService,
        GameEmitterGateway,
        GameReceiverGateway,
        GameMapService,
        CombatService,
        ChatRoomService,
        VirtualPlayerService,
        GameStatisticsService,
        DijkstraService,
        AggressivePlayerService,
        DefensivePlayerService,
        GameObjectGeneratorService,
        CombatMessagesService,
        VirtualPlayerMovementService,
    ],
})
export class AppModule {}
