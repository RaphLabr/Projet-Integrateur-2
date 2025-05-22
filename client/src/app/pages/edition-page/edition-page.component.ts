import { NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MapTile } from '@app/classes/map-tile';
import { GameMapComponent } from '@app/components/game-map/game-map.component';
import { INVALID_MAP_COORDINATES, ITEM_DESCRIPTIONS, TILE_DESCRIPTIONS_EDITION } from '@app/constants/map-edition-constants';
import { MOUSE_LEFT_CLICK, MOUSE_RIGHT_CLICK } from '@app/constants/mouse-button-constants';
import { SaveMessage } from '@app/interfaces/save-message';
import { GameMapEditionService } from '@app/services/game-map-edition-service/game-map-edition.service';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { DeepReadonly } from '@app/types/deep-read-only';
import { areCoordinatesEqual } from '@app/utils/coordinate-utils';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';

@Component({
    selector: 'app-edition-page',
    imports: [NgClass, GameMapComponent],
    templateUrl: './edition-page.component.html',
    styleUrls: ['../../global-css/global.scss', './edition-page.component.scss'],
    providers: [GameMapEditionService],
})
export class EditionPageComponent implements OnInit {
    mapDescription: string = '';
    mapTitle: string = '';
    mapId: string = '';
    mode: GameMode;
    selectedTileTool: MapTileType | null = null;
    mapSize: MapSize = MapSize.Small;
    draggedItem: ItemType = ItemType.NoItem;
    typeTools = TILE_DESCRIPTIONS_EDITION;
    allItems: ItemType[];

    readonly itemDescriptions: Map<ItemType, string> = ITEM_DESCRIPTIONS;
    private _isTileTypeChangeEnabled: boolean = true;
    private _isItemBeingDeleted: boolean = false;
    private _initialItemCoordinates: Coordinates = INVALID_MAP_COORDINATES;

    constructor(
        private _editionService: GameMapEditionService,
        private _route: ActivatedRoute,
        private _router: Router,
        private snackBarService: SnackBarService,
    ) {}

    get gameMap(): DeepReadonly<MapTile[][]> {
        return this._editionService.gameMap;
    }

    get numberOfItemsLeft(): number {
        return this._editionService.numberOfItemsLeft;
    }

    get numberOfStartPositionsLeft(): number {
        return this._editionService.numberOfStartPositionsLeft;
    }

    get cssHeightOfTool(): string {
        return this._editionService.mode === 'Classique' ? '8vh' : '7vh';
    }

    ngOnInit(): void {
        this._route.queryParams.subscribe((params) => {
            if (params.mapSize) {
                const capSize: string = params.mapSize.charAt(0).toUpperCase() + params.mapSize.slice(1);
                this.mapSize = MapSize[capSize as keyof typeof MapSize];
            }
            this.mapId = params.mapId;
            this.mode = params.mode;
        });

        this.allItems = Object.values(ItemType).filter((item) => {
            if (item === ItemType.NoItem) return false;
            if (this.mode === GameMode.Classic && item === ItemType.Flag) return false;
            return true;
        });

        this._editionService.mapId = this.mapId;
        this._editionService.mode = this.mode;
        this._editionService.getMap().subscribe((map) => {
            if (map) {
                this.mapSize = map.size;
                this._editionService.loadMap(map);
                this.mapTitle = map.name;
                this.mapDescription = map.description;
            } else {
                this._editionService.initializeNewMap(this.mapSize);
            }
            this.sessionStorageSave();
        });
    }

    updateTitle(event: Event): void {
        const input: HTMLInputElement = event.target as HTMLInputElement;
        this.mapTitle = input.value;
    }

    updateDescription(event: Event): void {
        const textarea: HTMLTextAreaElement = event.target as HTMLTextAreaElement;
        this.mapDescription = textarea.value;
    }

    onSave(): void {
        this._editionService.title = this.mapTitle;
        this._editionService.description = this.mapDescription;
        this._editionService.saveMap().subscribe(
            (response: SaveMessage) => {
                if (response.error) {
                    this.snackBarService.showNotification(response.error, false);
                } else if (response.message) {
                    this.snackBarService.showNotification(response.message, true);
                    const delay = 500;
                    setTimeout(() => {
                        this._router.navigate(['/admin']).then(() => location.reload());
                    }, delay);
                }
            },
            (error) => {
                this.snackBarService.showNotification('Sauveguarde échouée: ' + error.message, false);
            },
        );
    }

    isItemPlaced(item: ItemType): boolean | undefined {
        return this._editionService.isItemAllPlaced(item);
    }

    onTypeToolClick(clickedToolType: MapTileType): void {
        this.selectedTileTool = this.selectedTileTool === clickedToolType ? null : clickedToolType;
    }

    onTileLeftMouseDown(event: { tileCoordinates: Coordinates; mouseEvent: MouseEvent }): void {
        if (this.selectedTileTool && this._isTileTypeChangeEnabled) {
            event.mouseEvent.preventDefault();
            if (this.selectedTileTool === MapTileType.ClosedDoor && this._editionService.getTileItem(event.tileCoordinates) !== ItemType.NoItem) {
                this._isTileTypeChangeEnabled = false;
                setTimeout(() => {
                    this._isTileTypeChangeEnabled = true;
                }, 1);
            }
            this._editionService.changeTileType(event.tileCoordinates, this.selectedTileTool);
        }
    }

    onTileEnter(event: { tileCoordinates: Coordinates; mouseEvent: MouseEvent }): void {
        if (event.mouseEvent.buttons === MOUSE_LEFT_CLICK) {
            this.onTileLeftMouseDown(event);
        } else if (event.mouseEvent.buttons === MOUSE_RIGHT_CLICK) {
            if (this._isItemBeingDeleted) {
                this._isItemBeingDeleted = false;
                this._initialItemCoordinates = INVALID_MAP_COORDINATES;
            }
            this._editionService.changeTileType(event.tileCoordinates, MapTileType.Base);
        }
    }

    onTileRightMouseDown(coordinates: Coordinates): void {
        if (this._editionService.getTileItem(coordinates) === ItemType.NoItem) {
            this._editionService.changeTileType(coordinates, MapTileType.Base);
        } else {
            this._isItemBeingDeleted = true;
            this._initialItemCoordinates = coordinates;
        }
    }

    onTileRightMouseUp(coordinates: Coordinates): void {
        if (areCoordinatesEqual(coordinates, this._initialItemCoordinates) && this._isItemBeingDeleted) {
            this._editionService.removeItem(coordinates);
            this._isItemBeingDeleted = false;
            this._initialItemCoordinates = INVALID_MAP_COORDINATES;
        }
    }

    onTileDrop(coordinates: Coordinates): void {
        this._editionService.placeItem(this._initialItemCoordinates, coordinates, this.draggedItem);
        if (!areCoordinatesEqual(this._initialItemCoordinates, INVALID_MAP_COORDINATES)) {
            this.onItemDragFromMapEnd();
        }
        this.selectedTileTool = null;
    }

    onItemToolDrop(mouseEvent: MouseEvent, item: ItemType): void {
        mouseEvent.preventDefault();
        if (this.draggedItem === item) {
            this._editionService.removeItem(this._initialItemCoordinates);
        }
    }

    onItemDragFromMapStart(event: { item: ItemType; tileCoordinates: Coordinates }): void {
        this.draggedItem = event.item;
        this._initialItemCoordinates = event.tileCoordinates;
    }

    onItemDragFromMapEnd(): void {
        this._initialItemCoordinates = INVALID_MAP_COORDINATES;
    }

    sessionStorageSave(): void {
        sessionStorage.setItem('map', JSON.stringify(this._editionService.gameMap));
        sessionStorage.setItem('title', this.mapTitle);
        sessionStorage.setItem('description', this.mapDescription);
    }

    onReinitializeClick(): void {
        const title: string | null = sessionStorage.getItem('title');
        const description: string | null = sessionStorage.getItem('description');

        if (title) {
            this.mapTitle = title;
        }
        if (description) {
            this.mapDescription = description;
        }

        this._editionService.reInitializeMap();
    }
}
