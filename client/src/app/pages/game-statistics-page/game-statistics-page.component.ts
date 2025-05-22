import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatBoxComponent } from '@app/components/chat-box/chat-box.component';
import { StatType } from '@app/constants/stat-type';
import { GameStatisticsService } from '@app/services/game-statistics-page-service/game-statistics-page-service.service';
import { DeepReadonly } from '@app/types/deep-read-only';
import { GlobalStatistics } from '@common/global-statistics';
import { PlayerStatistics } from '@common/player-statistics';

@Component({
    selector: 'app-game-statistics-page',
    templateUrl: './game-statistics-page.component.html',
    imports: [FormsModule, ChatBoxComponent],
    styleUrls: ['../../global-css/global.scss', './game-statistics-page.component.scss'],
})
export class GameStatisticsPageComponent implements OnInit {
    selectedStat: StatType | undefined;
    statType = StatType;
    messageInput: string;
    constructor(
        public gameStatisticsService: GameStatisticsService,
        private _router: Router,
    ) {}

    get winner(): string {
        return this.gameStatisticsService.winnerName;
    }

    get globalStatistics(): GlobalStatistics {
        return this.gameStatisticsService.globalStatistics;
    }

    get playerStatistics(): PlayerStatistics[] {
        return this.gameStatisticsService.playerStatistics;
    }

    get messages(): DeepReadonly<string[]> {
        return this.gameStatisticsService.chatRoomService.messages;
    }

    get playerName(): string | null {
        return sessionStorage.getItem('clientPlayerName');
    }

    get gameId(): string {
        return this.gameStatisticsService.gameId;
    }

    ngOnInit(): void {
        this.gameStatisticsService.obtainGameId();
    }

    sendMessage(): void {
        this.gameStatisticsService.sendMessage(this.messageInput);
        this.messageInput = '';
    }

    quitPage(): void {
        this.gameStatisticsService.quitPage();
        this._router.navigate(['/home']);
    }

    filterColumn(): void {
        if (this.selectedStat) this.gameStatisticsService.filterByColumn(this.selectedStat);
    }
    sortPlayersByName(): void {
        this.gameStatisticsService.sortPlayersByName();
    }
}
