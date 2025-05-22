import { ClosestFreeTileAlgorithm } from '@app/classes/closest-free-tile-algorithm/closest-free-tile-algorithm';
import { AiPlayer } from '@app/constants/ai-player';
import { MapTile } from '@app/constants/map-tile';
import { ObjectInfo } from '@app/constants/object-info';
import { RandomTimeOptions } from '@app/constants/time-options';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerMovementService } from '@app/services/virtual-player-movement/virtual-player-movement.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { Inject, Injectable, forwardRef } from '@nestjs/common';

@Injectable()
export class DefensivePlayerService {
    constructor(
        @Inject(forwardRef(() => GameService)) protected readonly gameService: GameService,
        @Inject(forwardRef(() => DijkstraService)) protected readonly dijkstraService: DijkstraService,
        @Inject(forwardRef(() => VirtualPlayerService)) protected readonly virtualPlayerService: VirtualPlayerService,
        @Inject(forwardRef(() => VirtualPlayerMovementService)) protected readonly virtualPlayerMovementService: VirtualPlayerMovementService,
    ) {}

    async avoidEnemies(ai: AiPlayer): Promise<void> {
        const position = this.gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id);
        const { coordsObjects, coordsEnemies, coordsItems } = await this.findNearbyObjects(ai, position);

        if (ai.gameInfo.game.map.mode === GameMode.CaptureTheFlag) {
            const handled = await this.handleCtfMode(ai, coordsObjects, coordsItems);
            if (handled) return;
        }

        if (coordsItems.length === 0) {
            await this.moveToSafestTile(ai, position, coordsEnemies);
            return;
        }

        await this.moveToDestination(ai, position, coordsItems[0].coordinates);
    }

    private async findNearbyObjects(
        ai: AiPlayer,
        position: Coordinates,
    ): Promise<{
        coordsObjects: ObjectInfo[];
        coordsEnemies: ObjectInfo[];
        coordsItems: ObjectInfo[];
    }> {
        const coordsObjects = await this.virtualPlayerService.getClosestObjects(
            { playerPosition: position, map: ai.gameInfo.game.map, itemTypes: ai.items, movementLeft: ai.player.speed },
            ai.enemies,
        );
        const coordsEnemies = coordsObjects.filter((objectQuery) => objectQuery.type === 'player');
        const coordsItems = coordsObjects.filter((objectQuery) => objectQuery.type === 'item');

        return { coordsObjects, coordsEnemies, coordsItems };
    }

    private async handleCtfMode(ai: AiPlayer, coordsObjects: ObjectInfo[], coordsItems: ObjectInfo[]): Promise<boolean> {
        const position = this.gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id);
        const flagObject = coordsObjects.find((objectQuery) => objectQuery.itemType === ItemType.Flag);

        if (flagObject) {
            coordsItems[0] = flagObject;
            return false;
        }

        const enemyWithFlag = ai.enemies.find((enemySearch) => enemySearch.items.some((item) => item === ItemType.Flag));

        if (enemyWithFlag) {
            if (this.areCoordinatesEqual(position, enemyWithFlag.startPosition)) {
                return true;
            }

            if (ClosestFreeTileAlgorithm.isPositionOccupied(enemyWithFlag.startPosition, ai.gameInfo.game.map.terrain, true)) {
                const playerOccupying = ai.gameInfo.game.players.find(
                    (playerOcc) =>
                        playerOcc.id === ai.gameInfo.game.map.terrain[enemyWithFlag.startPosition.y][enemyWithFlag.startPosition.x].character,
                );
                await this.virtualPlayerMovementService.moveTowardPlayer(ai, playerOccupying);
            } else {
                await this.moveToDestination(ai, position, enemyWithFlag.startPosition);
            }
            return true;
        }

        return false;
    }

    private async moveToSafestTile(ai: AiPlayer, position: Coordinates, coordsEnemies: ObjectInfo[]): Promise<void> {
        const reachableTiles = this.dijkstraService.findShortestPaths(ai.gameInfo.game.map.terrain, ai.player.speed, position);

        const originalCharacter = ai.gameInfo.game.map.terrain[position.y][position.x].character;
        ai.gameInfo.game.map.terrain[position.y][position.x].character = CharacterType.NoCharacter;

        let safestTile: Coordinates | null = null;
        let highestSafetyScore = -Infinity;

        for (const node of reachableTiles.values()) {
            if (this.areCoordinatesEqual(node.coordinates, position)) {
                continue;
            }

            const safetyScore = this.calculateSafetyScore(ai.gameInfo.game.map.terrain, node.coordinates, coordsEnemies);

            if (safetyScore > highestSafetyScore) {
                highestSafetyScore = safetyScore;
                safestTile = node.coordinates;
            }
        }

        ai.gameInfo.game.map.terrain[position.y][position.x].character = originalCharacter;

        if (safestTile) {
            await this.moveToDestination(ai, position, safestTile);
        }
    }

    private calculateSafetyScore(terrain: MapTile[][], tileCoords: Coordinates, enemies: ObjectInfo[]): number {
        let safetyScore = 0;

        for (const enemy of enemies) {
            const pathToEnemy = this.dijkstraService.findPathToCharacter(terrain, enemy.coordinates, tileCoords, true);

            if (pathToEnemy) {
                const distanceToEnemy = pathToEnemy.path.length;
                safetyScore += distanceToEnemy;
            } else {
                safetyScore += RandomTimeOptions.DefaultTime;
            }
        }

        return safetyScore;
    }

    private async moveToDestination(ai: AiPlayer, position: Coordinates, destination: Coordinates): Promise<void> {
        const route = await this.virtualPlayerService.getRouteDoors(ai, position, destination);
        if (route) {
            await this.gameService.movePlayer(ai.gameInfo.gameId, route.path.reverse());
        }
    }

    private areCoordinatesEqual(a: Coordinates, b: Coordinates): boolean {
        return a.x === b.x && a.y === b.y;
    }
}
