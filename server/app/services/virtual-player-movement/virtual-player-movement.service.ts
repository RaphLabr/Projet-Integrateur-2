import { AiPlayer } from '@app/constants/ai-player';
import { RouteInfo } from '@app/constants/route';
import { RandomTimeOptions } from '@app/constants/time-options';
import { GameReceiverGateway } from '@app/gateways/game-receiver/game-receiver.gateway';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { sleep } from '@app/utils/sleep/sleep';
import { Coordinates } from '@common/coordinates';
import { DoorUpdateRequestPayload } from '@common/door-update-request-payload';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { log } from 'console';

@Injectable()
export class VirtualPlayerMovementService {
    constructor(
        @Inject(forwardRef(() => GameService)) private readonly _gameService: GameService,
        @Inject(forwardRef(() => GameMapService)) private readonly _gameMapService: GameMapService,
        @Inject(forwardRef(() => GameReceiverGateway)) private readonly _gameReceiverGateway: GameReceiverGateway,
        @Inject(forwardRef(() => VirtualPlayerService)) protected readonly virtualPlayerService: VirtualPlayerService,
        private readonly _dijkstraService: DijkstraService,
    ) {}

    async moveThroughDoors(ai: AiPlayer, position: Coordinates, targetPosition: Coordinates): Promise<RouteInfo> {
        try {
            const route = this.findInitialPath(ai, position, targetPosition);
            if (!route) return null;

            position = await this.moveWithinSpeedLimit(ai, position, route);

            if (route.doors.length > 0) {
                position = await this.handleDoorInPath(ai, position, route.doors[0]);
            }

            return this._dijkstraService.findPathToCharacter(ai.gameInfo.game.map.terrain, position, targetPosition, false);
        } catch (error) {
            log('Error moving through doors:', error);
            return null;
        }
    }

    async forceMoveStart(ai: AiPlayer): Promise<boolean> {
        const specificTile = ai.player.startPosition;
        const enemyOnTile = ai.enemies.find((enemy) => {
            const enemyPosition = this._gameService.getPlayerPosition(ai.gameInfo.gameId, enemy.id);
            return enemyPosition.x === specificTile.x && enemyPosition.y === specificTile.y;
        });

        if (enemyOnTile) {
            await this.moveTowardPlayer(ai, enemyOnTile);

            await this.virtualPlayerService.initiateCombat(ai, enemyOnTile);
            return true;
        }
        return false;
    }

    async moveTowardPlayer(ai: AiPlayer, playerOnTile: Player): Promise<void> {
        const otherPlayerPosition = this._gameService.getPlayerPosition(ai.gameInfo.gameId, playerOnTile.id);
        const playerPosition = this._gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id);
        const pathToPlayer = this._dijkstraService.findPathToCharacter(ai.gameInfo.game.map.terrain, playerPosition, otherPlayerPosition, false).path;

        pathToPlayer.pop();
        const targetCoordinate = pathToPlayer.pop();

        if (targetCoordinate) {
            const route: RouteInfo = await this.moveThroughDoors(ai, playerPosition, targetCoordinate);

            if (route) {
                await this._gameService.movePlayer(ai.gameInfo.gameId, route.path.reverse());
            }
        }
    }

    private findInitialPath(ai: AiPlayer, position: Coordinates, targetPosition: Coordinates): RouteInfo {
        return this._dijkstraService.findPathToCharacter(ai.gameInfo.game.map.terrain, position, targetPosition, false);
    }

    private async moveWithinSpeedLimit(ai: AiPlayer, position: Coordinates, route: RouteInfo): Promise<Coordinates> {
        let movementLeft = ai.player.speed;
        const pathToMove: Coordinates[] = [];

        for (const step of route.path) {
            const tile = ai.gameInfo.game.map.terrain[step.y][step.x];
            const cost = this.calculateMovementCost(tile.type);

            if (movementLeft - cost >= 0) {
                pathToMove.push(step);
                movementLeft -= cost;
            } else {
                break;
            }
        }

        if (pathToMove.length > 0) {
            await this._gameService.movePlayer(ai.gameInfo.gameId, pathToMove.reverse());
            return pathToMove[pathToMove.length - 1];
        }
        return position;
    }

    private calculateMovementCost(tileType: MapTileType): number {
        return tileType === MapTileType.Ice ? 0 : tileType === MapTileType.Water ? 2 : 1;
    }

    private async handleDoorInPath(ai: AiPlayer, position: Coordinates, door: Coordinates): Promise<Coordinates> {
        const doorPath = this._dijkstraService.findPathToCharacter(ai.gameInfo.game.map.terrain, position, door, false);
        const doorPos = doorPath.path.pop();

        if (doorPath.path.length > 0) {
            await this._gameService.movePlayer(ai.gameInfo.gameId, doorPath.path.reverse());
        }
        await this.doorUpdate(ai.gameInfo.gameId, door, this._gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id));

        if (doorPos) {
            await this._gameService.movePlayer(ai.gameInfo.gameId, [doorPos, this._gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id)]);
        }
        return this._gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id);
    }

    private async doorUpdate(gameId: string, door: Coordinates, position: Coordinates): Promise<void> {
        const game = this._gameService.getGame(gameId);
        const result = await this._gameMapService.isDoorUpdateAllowed({ gameId, playerPosition: position, doorPosition: door }, game);
        if (!result) return;
        await sleep(await this.virtualPlayerService.randomTime(RandomTimeOptions.LongRandomTime, RandomTimeOptions.MediumRandomTime));
        const doorUpdateData: DoorUpdateRequestPayload = {
            gameId,
            playerPosition: position,
            doorPosition: door,
        };
        this._gameReceiverGateway.updateDoor(null, doorUpdateData);
        await sleep(RandomTimeOptions.DefaultTime);
    }
}
