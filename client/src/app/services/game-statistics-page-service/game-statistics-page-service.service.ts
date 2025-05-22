import { Injectable } from '@angular/core';
import { StatType } from '@app/constants/stat-type';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { GameEvents } from '@common/game-events';
import { GameStatistics } from '@common/game-statistics';
import { GlobalStatistics } from '@common/global-statistics';
import { Player } from '@common/player';
import { PlayerStatistics } from '@common/player-statistics';

@Injectable({
    providedIn: 'root',
})
export class GameStatisticsService {
    clientPlayer: Player;
    globalStatistics: GlobalStatistics;
    sortDescending: boolean = false;
    winnerName: string;
    playerStatistics: PlayerStatistics[] = [];
    private _gameId: string;

    constructor(
        private _socketService: SocketClientService,
        public chatRoomService: ChatRoomService,
    ) {}

    get gameId(): string {
        return this._gameId;
    }

    sortPlayersByName() {
        if (this.sortDescending) {
            this.playerStatistics.sort((a, b) => {
                const nameA = a.name.toUpperCase();
                const nameB = b.name.toUpperCase();
                return nameA.localeCompare(nameB);
            });
        } else {
            this.playerStatistics.sort((a, b) => {
                const nameA = a.name.toUpperCase();
                const nameB = b.name.toUpperCase();
                return nameB.localeCompare(nameA);
            });
        }
        this.sortDescending = !this.sortDescending;
    }

    filterByColumn(type: StatType): void {
        if (this.sortDescending) this.playerStatistics.sort((a, b) => (b[type] as number) - (a[type] as number));
        else this.playerStatistics.sort((a, b) => (a[type] as number) - (b[type] as number));

        this.sortDescending = !this.sortDescending;
    }

    configureSocketFeatures(): void {
        this._socketService.socket.on(GameEvents.GameOver, (gameStatistics: GameStatistics) => {
            this.updateStatistics(gameStatistics);
        });
    }

    obtainGameId(): void {
        this._gameId = sessionStorage.getItem('gameId') || '';
        sessionStorage.removeItem('gameId');
    }

    updateStatistics(gameStatistics: GameStatistics): void {
        this.globalStatistics = gameStatistics.globalStatistics;

        const map = new Map<string, PlayerStatistics>(Object.entries(gameStatistics.playerStatistics));

        this.playerStatistics = Array.from(map.values());

        this.winnerName = gameStatistics.winner;
    }

    quitPage(): void {
        this._socketService.socket.disconnect();
    }

    sendMessage(message: string): void {
        this.chatRoomService.sendMessage(message, this._gameId);
    }
}
