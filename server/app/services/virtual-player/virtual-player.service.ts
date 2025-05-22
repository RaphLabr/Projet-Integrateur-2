import { AiPlayer } from '@app/constants/ai-player';
import { AiType } from '@app/constants/ai-type';
import { DistanceInfo } from '@app/constants/distance-info';
import { MapInfo } from '@app/constants/map-info';
import { MovementToItems } from '@app/constants/movement-to-items';
import { ObjectInfo } from '@app/constants/object-info';
import { PlayerPathParams } from '@app/constants/player-path-params';
import { RouteInfo } from '@app/constants/route';
import { RandomTimeOptions } from '@app/constants/time-options';
import { GameReceiverGateway } from '@app/gateways/game-receiver/game-receiver.gateway';
import { AggressivePlayerService } from '@app/services/aggressive-player/aggressive-player.service';
import { CombatService } from '@app/services/combat/combat.service';
import { DefensivePlayerService } from '@app/services/defensive-player/defensive-player.service';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerMovementService } from '@app/services/virtual-player-movement/virtual-player-movement.service';
import { sleep } from '@app/utils/sleep/sleep';
import { CharacterType } from '@common/character-type';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { Player } from '@common/player';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { log } from 'console';

@Injectable()
export class VirtualPlayerService {
    private readonly _defensiveItems = [ItemType.Barrel, ItemType.Potion1];
    private readonly _aggressiveItems = [ItemType.Torch, ItemType.Potion2, ItemType.Sword, ItemType.Skull];

    // eslint-disable-next-line max-params
    constructor(
        @Inject(forwardRef(() => CombatService)) private readonly _combatService: CombatService,
        @Inject(forwardRef(() => GameService)) private readonly _gameService: GameService,
        @Inject(forwardRef(() => GameTimerService)) private readonly _timerService: GameTimerService,
        @Inject(forwardRef(() => GameReceiverGateway)) private readonly _gameReceiverGateway: GameReceiverGateway,
        private readonly _dijkstraService: DijkstraService,
        private readonly _aggressivePlayerService: AggressivePlayerService,
        private readonly _defensivePlayerService: DefensivePlayerService,
        private readonly _virtualPlayerMovementService: VirtualPlayerMovementService,
    ) {}

    async handleAiTurn(gameId: string, playerId: string, userId: string): Promise<void> {
        try {
            const game = this._gameService.getGame(gameId);
            if (!game) return;

            const player = game.players.find((playerTurn) => playerTurn.id === playerId);
            if (!player) return;
            const aiType = this.getAiTypeFromPlayer(userId);

            await this.executeAiMove({ gameId, game }, player, aiType);
        } catch (error) {
            log('Error in handleAiTurn');
        }
    }

    async randomTime(base: number, extra: number): Promise<number> {
        return Math.floor(Math.random() * base) + extra;
    }

    async handleCombat(player: Player, gameId: string): Promise<void> {
        const game = this._gameService.getGame(gameId);
        await sleep(await this.randomTime(RandomTimeOptions.MediumRandomTime, RandomTimeOptions.SmallRandomTime));
        if (!game.isInCombat || !game.isInRound) {
            return;
        }
        const aiType = await this.getAiTypeFromPlayer(player.userId);
        this._combatService.attackCycle(gameId, game);
        if (aiType === AiType.Defensive && (player.health !== player.maxHealth || player.evadeAttempts < 2)) {
            if (!game.playersInCombat) return;
            const enemy = game.playersInCombat.initiator.id === player.id ? game.playersInCombat.target : game.playersInCombat.initiator;
            this._combatService.evadeAttempt(gameId, player, enemy);
        }
    }

    async getClosestObjects(movementInfo: MovementToItems, players: Player[] = []): Promise<ObjectInfo[]> {
        return this.findClosestObjects(movementInfo, players);
    }

    async getRouteDoors(ai: AiPlayer, position: Coordinates, targetPosition: Coordinates): Promise<RouteInfo> {
        return this._virtualPlayerMovementService.moveThroughDoors(ai, position, targetPosition);
    }

    async checkMaxItem(gameId: string, ai: Player): Promise<void> {
        await sleep(await this.randomTime(RandomTimeOptions.MediumRandomTime, RandomTimeOptions.SmallRandomTime));

        if (ai.items.length <= 2) return;

        const itemPriorities = this.assignItemPriorities(ai);

        const itemToDrop = this.findItemToDrop(itemPriorities);

        await this.dropAiItem(gameId, ai, itemToDrop);
    }

    async initiateCombat(ai: AiPlayer, enemy: Player): Promise<void> {
        const combatPayload: CombatRequestPayload = {
            gameId: ai.gameInfo.gameId,
            initiatorId: ai.player.id,
            targetId: enemy.id,
            initiatorPosition: this._gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id),
            targetPosition: this._gameService.getPlayerPosition(ai.gameInfo.gameId, enemy.id),
        };

        if (this._gameService.getActivePlayerName(ai.gameInfo.gameId) === ai.player.name) {
            await sleep(await this.randomTime(RandomTimeOptions.MediumRandomTime, RandomTimeOptions.SmallRandomTime));
            await this._gameReceiverGateway.combatRequest(null, combatPayload);
        }
    }

    private assignItemPriorities(ai: Player): { [key: number]: number } {
        const itemPriorities: { [key: number]: number } = {};
        const aiType = this.getAiTypeFromPlayer(ai.userId);

        for (let i = 0; i < ai.items.length; i++) {
            const item = ai.items[i];
            itemPriorities[i] = this.getItemPriority(item, aiType);
        }

        return itemPriorities;
    }

    private getItemPriority(item: ItemType, aiType: AiType): number {
        if (item === ItemType.Flag) {
            return 0;
        }

        const preferredItems = aiType === AiType.Defensive ? this._defensiveItems : this._aggressiveItems;

        if (preferredItems.includes(item)) {
            return 1;
        }

        return 2;
    }

    private findItemToDrop(itemPriorities: { [key: number]: number }): number {
        let itemToDrop = 0;
        let lowestPriority = -1;

        for (const [index, priority] of Object.entries(itemPriorities)) {
            if (priority > lowestPriority) {
                lowestPriority = priority;
                itemToDrop = parseInt(index, 10);
            }
        }

        return itemToDrop;
    }

    private async dropAiItem(gameId: string, ai: Player, itemIndex: number): Promise<void> {
        const position = this._gameService.getPlayerPosition(gameId, ai.id);

        this._gameService.dropItem({
            gameId,
            itemIndex,
            itemPosition: position,
        });
    }

    private getAiTypeFromPlayer(userId: string): AiType {
        return userId.toLowerCase().includes('aggressive') ? AiType.Aggressive : AiType.Defensive;
    }

    private async executeAiMove(gameInfo: MapInfo, player: Player, aiType: AiType): Promise<void> {
        await sleep(await this.randomTime(RandomTimeOptions.LongRandomTime, RandomTimeOptions.MediumRandomTime));
        const enemies = this.filterEnemies(gameInfo, player);
        const { gameDefensiveItems, gameAggressiveItems } = this.getItemListsByGameMode(gameInfo.game.map.mode);
        const items = aiType === AiType.Aggressive ? gameAggressiveItems : gameDefensiveItems;

        const ai: AiPlayer = { gameInfo, player, enemies, items };

        if (gameInfo.game.map.mode === GameMode.CaptureTheFlag && player.items.includes(ItemType.Flag)) {
            ai.items = gameAggressiveItems;
            await this.handleFlagCarrier(ai);
            return;
        }

        if (aiType === AiType.Aggressive) {
            await this.executeAggressiveAiBehavior(ai);
        } else {
            await this.executeDefensiveAiBehavior(ai);
        }
        await this.endRound(gameInfo.gameId, player.name);
    }

    private filterEnemies(gameInfo: MapInfo, player: Player): Player[] {
        return gameInfo.game.players.filter((gamePlayer) => {
            if (gamePlayer.id === player.id) return false;

            if (gameInfo.game.map.mode === GameMode.CaptureTheFlag) {
                return gamePlayer.team !== player.team;
            }
            return true;
        });
    }

    private getItemListsByGameMode(gameMode: GameMode): { gameDefensiveItems: ItemType[]; gameAggressiveItems: ItemType[] } {
        let gameDefensiveItems = this._defensiveItems;
        let gameAggressiveItems = this._aggressiveItems;

        if (gameMode === GameMode.CaptureTheFlag) {
            gameDefensiveItems = [...this._defensiveItems, ItemType.Flag];
            gameAggressiveItems = [...this._aggressiveItems, ItemType.Flag];
        }

        return { gameDefensiveItems, gameAggressiveItems };
    }

    private async handleFlagCarrier(ai: AiPlayer): Promise<void> {
        const position = this._gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id);

        const route = await this._virtualPlayerMovementService.moveThroughDoors(ai, position, ai.player.startPosition);

        if (route) {
            await this._gameService.movePlayer(ai.gameInfo.gameId, route.path.reverse());
        }

        await this._virtualPlayerMovementService.forceMoveStart(ai);

        await this.endRound(ai.gameInfo.gameId, ai.player.name);
    }

    private async executeAggressiveAiBehavior(ai: AiPlayer): Promise<void> {
        await this._aggressivePlayerService.moveTowardEnemies(ai);
        if (
            !this._gameService.getGame(ai.gameInfo.gameId).isActionUsed &&
            this._gameService.getActivePlayerName(ai.gameInfo.gameId) === ai.player.name
        ) {
            await this.checkNearby(ai);
        }
        this.endRound(ai.gameInfo.gameId, ai.player.name);
    }

    private async executeDefensiveAiBehavior(ai: AiPlayer): Promise<void> {
        await this._defensivePlayerService.avoidEnemies(ai);
    }

    private async endRound(gameId: string, playerName: string): Promise<void> {
        await sleep(RandomTimeOptions.DefaultTime);
        while (!this._timerService.getTimerState(gameId)) {
            await sleep(RandomTimeOptions.DefaultTime);
        }
        await this._gameService.endRound(gameId, playerName);
    }

    private findClosestObjects(movementInfo: MovementToItems, players: Player[] = []): ObjectInfo[] {
        const objects: ObjectInfo[] = this.scanMapForObjects(movementInfo, players);
        return this.sortObjectsByDistance(objects);
    }

    private scanMapForObjects(movementInfo: MovementToItems, players: Player[]): ObjectInfo[] {
        const objects: ObjectInfo[] = [];

        for (let y = 0; y < movementInfo.map.size; y++) {
            for (let x = 0; x < movementInfo.map.size; x++) {
                if (x === movementInfo.playerPosition.x && y === movementInfo.playerPosition.y) {
                    continue;
                }

                const coordinates: Coordinates = { x, y };
                movementInfo.objects = objects;
                this.processTile(movementInfo, players, coordinates);
            }
        }

        return objects;
    }

    private processTile(movementInfo: MovementToItems, players: Player[], coordinates: Coordinates): void {
        const distanceInfo = this.checkItem(movementInfo, coordinates);
        if (distanceInfo) {
            movementInfo.objects.push(
                this.createItemObjectInfo(coordinates, distanceInfo, movementInfo.map.terrain[coordinates.y][coordinates.x].item),
            );
        }

        const distanceInfoPlayer = this.checkPlayer({
            playerPosition: movementInfo.playerPosition,
            map: movementInfo.map,
            players,
            movementLeft: movementInfo.movementLeft,
            coordinates,
        });

        if (distanceInfoPlayer) {
            movementInfo.objects.push(
                this.createPlayerObjectInfo(coordinates, distanceInfoPlayer, movementInfo.map.terrain[coordinates.y][coordinates.x].character),
            );
        }
    }

    private createItemObjectInfo(coordinates: Coordinates, distanceInfo: DistanceInfo, itemType: ItemType): ObjectInfo {
        return {
            coordinates,
            distance: distanceInfo.distance,
            reachable: distanceInfo.reachable,
            type: 'item',
            itemType,
        };
    }

    private createPlayerObjectInfo(coordinates: Coordinates, distanceInfo: DistanceInfo, playerId: string): ObjectInfo {
        return {
            coordinates,
            distance: distanceInfo.distance,
            reachable: distanceInfo.reachable,
            type: 'player',
            playerId,
        };
    }

    private sortObjectsByDistance(objects: ObjectInfo[]): ObjectInfo[] {
        return objects.sort((a, b) => a.distance - b.distance);
    }

    private checkItem(movementInfo: MovementToItems, coordinates: Coordinates): DistanceInfo {
        if (
            movementInfo.itemTypes.length > 0 &&
            movementInfo.map.terrain[coordinates.y][coordinates.x].item &&
            movementInfo.itemTypes.includes(movementInfo.map.terrain[coordinates.y][coordinates.x].item)
        ) {
            const completePath = this._dijkstraService.findCompletePath(movementInfo.map.terrain, movementInfo.playerPosition, coordinates, false);
            if (completePath !== null) {
                const distance = this._dijkstraService.calculateCost(completePath, movementInfo.map.terrain);
                const reachable = distance <= movementInfo.movementLeft;

                return { distance, reachable };
            }
        }
    }

    private checkPlayer(params: PlayerPathParams): DistanceInfo {
        const { playerPosition, map, players, movementLeft, coordinates } = params;
        if (players.length > 0 && map.terrain[coordinates.y][coordinates.x].character !== CharacterType.NoCharacter) {
            if (players.some((player) => player.id === map.terrain[coordinates.y][coordinates.x].character)) {
                const completePath = this._dijkstraService.findPathToCharacter(map.terrain, coordinates, playerPosition, false);
                if (completePath !== null) {
                    const distance = this._dijkstraService.calculateCost(completePath, map.terrain);
                    const reachable = distance <= movementLeft;

                    return { distance, reachable };
                }
            }
        }
    }

    private async checkNearby(ai: AiPlayer): Promise<boolean> {
        const playerPosition = this._gameService.getPlayerPosition(ai.gameInfo.gameId, ai.player.id);

        const adjacentEnemies = ai.enemies.filter((enemy) => {
            const enemyPosition = this._gameService.getPlayerPosition(ai.gameInfo.gameId, enemy.id);
            const distance = Math.abs(enemyPosition.x - playerPosition.x) + Math.abs(enemyPosition.y - playerPosition.y);
            return distance === 1;
        });

        if (adjacentEnemies.length > 0) {
            const targetEnemy = adjacentEnemies[0];

            await this.initiateCombat(ai, targetEnemy);
            return true;
        }

        return false;
    }
}
