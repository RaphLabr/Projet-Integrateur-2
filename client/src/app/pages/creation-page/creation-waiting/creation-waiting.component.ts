import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ActivatedRoute } from '@angular/router';
import { ChatBoxComponent } from '@app/components/chat-box/chat-box.component';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { CreationWaitingService } from '@app/services/creation-waiting-service/creation-waiting.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { GameMode } from '@common/game-mode';

@Component({
    selector: 'app-creation-waiting',
    templateUrl: './creation-waiting.component.html',
    imports: [MatSlideToggleModule, MatButtonModule, MatIconModule, FormsModule, ChatBoxComponent, CommonModule],
    styleUrls: ['../../../global-css/global.scss', './creation-waiting.component.scss'],
})
export class CreationWaitingComponent implements OnInit, OnDestroy {
    botChoiceVisibility = true;
    typeInput: string = 'defensive';
    toggleState: false;
    messageInput: string;
    constructor(
        public socketService: SocketClientService,
        private _route: ActivatedRoute,
        private _creationWaitingService: CreationWaitingService,
        private _chatRoomService: ChatRoomService,
    ) {}

    get socketId() {
        return this._creationWaitingService.socketId;
    }

    get gameId() {
        return this._creationWaitingService.gameId;
    }

    get users() {
        return this._creationWaitingService.users;
    }

    get admin() {
        return this._creationWaitingService.isAdmin;
    }

    get isLocked() {
        return this._creationWaitingService.isLocked;
    }

    get playerName() {
        return this._creationWaitingService.clientPlayer.name;
    }

    get isGameFull() {
        return this._creationWaitingService.isGameFull;
    }

    set isLocked(lockValue: boolean) {
        this._creationWaitingService.isLocked = lockValue;
    }

    onKickUser(userId: string) {
        this._creationWaitingService.onKickUser(userId);
    }

    onTogglePublic(): void {
        this._creationWaitingService.onTogglePublic();
    }

    disconnect(): void {
        this._creationWaitingService.disconnect();
    }

    toggleBotChoice(): void {
        this.botChoiceVisibility = !this.botChoiceVisibility;
    }

    addAi(): void {
        this.toggleBotChoice();
        this.typeInput = this.toggleState ? 'defensive' : 'aggressive';
        this._creationWaitingService.addAi(this.typeInput);
    }

    startGame(): void {
        this._creationWaitingService.startGame();
    }

    async ngOnInit(): Promise<void> {
        this._creationWaitingService.isAdmin = false;
        this._creationWaitingService.isLocked = false;
        this._route.paramMap.subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this._creationWaitingService.gameId = id;
            }
        });

        if (history.state && history.state.playerInfo) {
            this._creationWaitingService.clientPlayer = history.state.playerInfo;
            this._creationWaitingService.mapId = history.state.map;
            this._creationWaitingService.joining = history.state.joining;
            this._creationWaitingService.mode = history.state.mode as GameMode;
            this._creationWaitingService.users.push({
                name: this._creationWaitingService.clientPlayer.name,
                character: this._creationWaitingService.clientPlayer.id,
                id: this._creationWaitingService.clientPlayer.userId,
            });
        }
        if (!this._creationWaitingService.joining)
            this._creationWaitingService.getSize().subscribe((size) => {
                this._creationWaitingService.mapSize = size;
            });

        history.replaceState({}, '');
        this._creationWaitingService.connect();
        this._chatRoomService.initialize(this.gameId);
    }

    ngOnDestroy(): void {
        this._creationWaitingService.isAdmin = false;
        this.disconnect();
    }
}
