import { AiPlayer } from '@app/constants/ai-player';
import { ObjectInfo } from '@app/constants/object-info';
import { RouteInfo } from '@app/constants/route';
import { DefensivePlayerService } from '@app/services/defensive-player/defensive-player.service';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { Inject, Injectable, forwardRef } from '@nestjs/common';

@Injectable()
export class AggressivePlayerService {
    constructor(
        @Inject(forwardRef(() => GameService)) protected readonly gameService: GameService,
        @Inject(forwardRef(() => DijkstraService)) protected readonly dijkstraService: DijkstraService,
        @Inject(forwardRef(() => VirtualPlayerService)) protected readonly virtualPlayerService: VirtualPlayerService,
        private readonly _defensivePlayerService: DefensivePlayerService,
    ) {}

    async moveTowardEnemies(ai: AiPlayer): Promise<void> {
        const position = this.gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id);
        const { coordsObjects, coordsEnemies } = await this.findNearbyObjects(ai, position);

        if (ai.gameInfo.game.map.mode === GameMode.CaptureTheFlag) {
            if (!(await this.handleCtfMode(ai, coordsObjects, coordsEnemies))) {
                return;
            }
        }
        if (coordsEnemies.length === 0) {
            return;
        }

        if (this.shouldPrioritizeItems(ai, position, coordsObjects, coordsEnemies)) {
            await this._defensivePlayerService.avoidEnemies(ai);
            return;
        }

        await this.moveAndInitiateCombat(ai, position, coordsEnemies);
    }

    async ctfBehavior(ai: AiPlayer, coordsObjects: ObjectInfo[], coordsEnemies: ObjectInfo[]): Promise<boolean | null> {
        const flagObject = coordsObjects.find((objectQuery) => objectQuery.itemType === ItemType.Flag);
        if (!flagObject) {
            const enemyWithFlag = ai.enemies.find((enemySearch) => enemySearch.items.some((item) => item === ItemType.Flag));
            if (!enemyWithFlag) {
                const teamHasFlag =
                    ai.player.team &&
                    this.gameService
                        .getGame(ai.gameInfo.gameId)
                        .players.filter((friendFind) => friendFind.team === ai.player.team)
                        .some((friendFind) => friendFind.items.includes(ItemType.Flag));

                if (teamHasFlag) {
                    return false;
                }
            }
            coordsEnemies[0] = {
                playerId: enemyWithFlag.id,
                type: 'player',
                coordinates: this.gameService.getPlayerPosition(ai.gameInfo.gameId, enemyWithFlag.id),
                distance: 0,
                reachable: true,
            };
            return true;
        }
        return false;
    }

    private async findNearbyObjects(
        ai: AiPlayer,
        position: Coordinates,
    ): Promise<{
        coordsObjects: ObjectInfo[];
        coordsEnemies: ObjectInfo[];
    }> {
        const coordsObjects = await this.virtualPlayerService.getClosestObjects(
            { playerPosition: position, map: ai.gameInfo.game.map, itemTypes: ai.items, movementLeft: ai.player.speed },
            ai.enemies,
        );
        const coordsEnemies = coordsObjects.filter((objectQuery) => objectQuery.type === 'player');
        return { coordsObjects, coordsEnemies };
    }

    private async handleCtfMode(ai: AiPlayer, coordsObjects: ObjectInfo[], coordsEnemies: ObjectInfo[]): Promise<boolean> {
        if (!(await this.ctfBehavior(ai, coordsObjects, coordsEnemies))) {
            await this._defensivePlayerService.avoidEnemies(ai);
            return false;
        }
        return true;
    }

    private shouldPrioritizeItems(ai: AiPlayer, position: Coordinates, coordsObjects: ObjectInfo[], coordsEnemies: ObjectInfo[]): boolean {
        if (coordsEnemies.length === 0) return false;

        const enemy = ai.enemies.find((enemyFind) => enemyFind.id === coordsEnemies[0].playerId);
        const enemyPosition = this.gameService.getPlayerPosition(ai.gameInfo.gameId, enemy.id);
        const distanceEnemy = this.dijkstraService.findPathToCharacter(ai.gameInfo.game.map.terrain, position, enemyPosition, false);

        return (
            ai.gameInfo.game.map.mode === GameMode.Classic &&
            this.dijkstraService.calculateCost(distanceEnemy, ai.gameInfo.game.map.terrain) > 2 * ai.player.speed &&
            coordsObjects[0].type === 'item'
        );
    }

    private async moveAndInitiateCombat(ai: AiPlayer, position: Coordinates, coordsEnemies: ObjectInfo[]): Promise<void> {
        const enemy = ai.enemies.find((enemyFind) => enemyFind.id === coordsEnemies[0].playerId);
        const enemyPosition = this.gameService.getPlayerPosition(ai.gameInfo.gameId, enemy.id);

        const route: RouteInfo = await this.virtualPlayerService.getRouteDoors(ai, position, enemyPosition);
        if (!route) {
            return;
        }

        route.path.pop();
        await this.gameService.movePlayer(ai.gameInfo.gameId, route.path.reverse());
        await this.virtualPlayerService.initiateCombat(ai, enemy);
    }
}
