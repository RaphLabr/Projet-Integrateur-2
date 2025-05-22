import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute, Router } from '@angular/router';
import { MapTile } from '@app/classes/map-tile';
import { ChatBoxComponent } from '@app/components/chat-box/chat-box.component';
import { GameMapComponent } from '@app/components/game-map/game-map.component';
import { INVALID_MAP_COORDINATES } from '@app/constants/map-edition-constants';
import { GameDisplayData } from '@app/interfaces/game-display-data';
import { GameState } from '@app/interfaces/game-state';
import { GamePageService } from '@app/services/game-page-service/game-page.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { DeepReadonly } from '@app/types/deep-read-only';
import { subscribeToMessagesForScroll as generateScrollSubscription, scrollToBottom } from '@app/utils/scroll-utils';
import { CharacterType } from '@common/character-type';
import { ChatMessage } from '@common/chat-message';
import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Teams } from '@common/teams';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-page',
    imports: [GameMapComponent, FormsModule, MatButtonToggleModule, MatCheckboxModule, ChatBoxComponent, ChatBoxComponent],
    templateUrl: './game-page.component.html',
    styleUrls: ['../../global-css/global.scss', './game-page.component.scss'],
})
export class GamePageComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('LogBox') private _logBox: ElementRef;
    @ViewChild('FilteredLogBox') private _filteredLogBox: ElementRef;
    @ViewChild('CombatMessages') private _combatMessageBox: ElementRef;
    messageInput: string;
    isChatToggled: boolean = true;
    isFilterChecked: boolean = false;
    private _combatMessageSubscription: Subscription;
    private _logSubscription: Subscription;
    private _filteredLogSubscription: Subscription;

    constructor(
        private _router: Router,
        private _route: ActivatedRoute,
        public pageService: GamePageService,
        private _socketService: SocketClientService,
    ) {}

    get gameDisplay(): DeepReadonly<GameDisplayData> {
        return this.pageService.gameDisplay;
    }

    get gameState(): DeepReadonly<GameState> {
        return this.pageService.gameState;
    }

    get messages() {
        return this.pageService.chatRoomService.messages;
    }

    get mapSize(): MapSize {
        return this.pageService.mapSize;
    }

    get map(): DeepReadonly<MapTile[][]> {
        return this.pageService.map;
    }

    get gameModeString(): string {
        return this.gameState.isInDebugMode ? 'débogage' : 'normal';
    }

    get movementLeft(): number {
        return this.pageService.movementLeft;
    }

    get clientPlayer(): DeepReadonly<Player> {
        return this.pageService.clientPlayer;
    }

    get stringMapSize(): string {
        switch (this.mapSize) {
            case MapSize.Small:
                return 'petit';
            case MapSize.Medium:
                return 'moyenne';
            default:
                return 'large';
        }
    }

    get isActionUsed(): boolean {
        return this.pageService.isActionUsed;
    }

    get combatMessages(): ChatMessage[] {
        return this.pageService.combatMessages;
    }

    get logs(): string[] {
        return this.pageService.logs;
    }

    get filteredlogs(): string[] {
        const filteredLogs = this.logs.filter((log) => log.includes(this.clientPlayer.name));
        return filteredLogs;
    }

    get showTileContext(): boolean {
        return this.pageService.showTileContext;
    }

    get currentTileType(): MapTileType {
        return this.pageService.currentTile.type;
    }

    get tileHasItem(): boolean {
        return this.pageService.currentTile.item !== ItemType.NoItem;
    }

    get itemDescription(): string | undefined {
        return this.pageService.itemDescription;
    }

    get tileHasCharacter(): boolean {
        return this.pageService.currentTile.character !== CharacterType.NoCharacter;
    }

    get contextPlayerName(): string | undefined {
        return this.pageService.contextPlayerName;
    }

    get contextPlayerId(): CharacterType {
        return this.pageService.currentTile.character;
    }

    get gameId(): string {
        return this.pageService.gameId;
    }

    get isClientTurnToAttack(): boolean {
        return this.pageService.isClientTurnToAttack;
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(): void {
        this.onQuitGameClick();
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        const active = document.activeElement;
        const isTyping = active?.classList.contains('chat-input');
        if (event.key === 'd' && !isTyping) {
            this._socketService.emitToggleDebug(this.pageService.gameId);
        }
    }

    sendMessage(): void {
        this.pageService.sendMessage(this.messageInput);
        this.messageInput = '';
    }

    ngOnInit(): void {
        const gameId: string | null = this._route.snapshot.paramMap.get('id');
        const gameDataJSON: string | null = this.pageService.loadGameDataJSON();
        if (!gameId || !gameDataJSON) {
            this._router.navigate(['/home']);
            return;
        }
        this.pageService.initializePage(gameId, gameDataJSON);
        this.pageService.gameEnded = false;
    }

    ngAfterViewInit(): void {
        this._filteredLogSubscription = generateScrollSubscription(this.pageService.logs$, this._filteredLogBox);
        this._logSubscription = generateScrollSubscription(this.pageService.logs$, this._logBox);
        this._combatMessageSubscription = generateScrollSubscription(this.pageService.combatMessages$, this._combatMessageBox);
    }

    ngOnDestroy(): void {
        this._combatMessageSubscription.unsubscribe();
        this._filteredLogSubscription.unsubscribe();
        this._logSubscription.unsubscribe();
        this.pageService.quitGame();
    }

    onActionButtonClick() {
        this.pageService.toggleClientInAction();
    }

    onEndRoundClick() {
        this.pageService.onEndRoundClick();
    }

    getTeamColor(team: Teams): string {
        return this.pageService.getTeamColor(team);
    }

    onQuitGameClick(): void {
        this.pageService.onQuitGameClick();
        this._router.navigate(['']);
    }

    onTileRightMouseDown(tileCoordinates: Coordinates): void {
        this.pageService.onTileRightClick(tileCoordinates);
    }

    onTileLeftMouseDown(event: { tileCoordinates: Coordinates; mouseEvent: MouseEvent }): void {
        this.pageService.onTileClick(event.tileCoordinates);
    }

    onTileHover(event: { tileCoordinates: Coordinates; mouseEvent: MouseEvent }): void {
        this.pageService.onTileHover(event.tileCoordinates);
    }

    onTileLeave(): void {
        this.pageService.onTileLeave();
    }

    onMapLeave(): void {
        this.pageService.hoveredTileCoordinates = INVALID_MAP_COORDINATES;
    }

    combatAttack(): void {
        this.pageService.combatAttack();
    }

    combatEvade(): void {
        this.pageService.combatEvade();
    }

    dropItem(itemIndex: number): void {
        this.pageService.dropItem(itemIndex);
    }

    closeTileInfo(): void {
        this.pageService.closeTileInfo();
    }

    getTileDescription(): string | undefined {
        return this.pageService.getTileDescription();
    }

    scrollLogsOrChat() {
        if (!this.isChatToggled) {
            this.scrollLogs();
        }
    }

    scrollLogs() {
        if (this.isFilterChecked) {
            scrollToBottom(this._filteredLogBox);
        } else {
            scrollToBottom(this._logBox);
        }
    }
}
