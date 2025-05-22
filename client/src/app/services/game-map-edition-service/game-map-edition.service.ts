import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MapTile } from '@app/classes/map-tile';
import * as constants from '@app/constants/map-edition-constants';
import { INVALID_MAP_COORDINATES } from '@app/constants/map-edition-constants';
import { SaveMessage } from '@app/interfaces/save-message';
import { MapModel } from '@app/models/map-model';
import { areCoordinatesEqual } from '@app/utils/coordinate-utils';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GameMapEditionService {
    mapSize: number;
    title: string;
    mapId: string;
    description: string;
    mode: GameMode;

    private _numberOfItemsLeft: number;
    private _numberOfStartPositionsLeft: number;
    private _gameMap: MapTile[][] = [];
    private _disabledItems: Set<ItemType> = new Set<ItemType>();
    private _itemsNotPlaced: Set<ItemType> = new Set<ItemType>();
    private readonly _normalItems: Set<ItemType> = new Set<ItemType>(
        Object.values(ItemType).filter((item) => item !== ItemType.NoItem && item !== ItemType.Flag && item !== ItemType.StartPosition),
    );

    constructor(private _http: HttpClient) {}

    get gameMap(): readonly MapTile[][] {
        return Object.freeze(this._gameMap);
    }

    get numberOfItemsLeft(): number {
        return this._numberOfItemsLeft;
    }

    get numberOfStartPositionsLeft(): number {
        return this._numberOfStartPositionsLeft;
    }

    createEmptyMap(size: number): void {
        this._gameMap = Array.from({ length: size }, () => Array.from({ length: size }, () => new MapTile()));
        switch (size) {
            case MapSize.Small:
                this._numberOfItemsLeft = constants.MaxRandomItemsNumber.Small;
                this._numberOfStartPositionsLeft = constants.MaxRandomItemsNumber.Small;
                break;
            case MapSize.Medium:
                this._numberOfItemsLeft = constants.MaxRandomItemsNumber.Medium;
                this._numberOfStartPositionsLeft = constants.MaxRandomItemsNumber.Medium;
                break;
            case MapSize.Large:
                this._numberOfItemsLeft = constants.MaxRandomItemsNumber.Large;
                this._numberOfStartPositionsLeft = constants.MaxRandomItemsNumber.Large;
                break;
        }
    }

    generateGameMap(): MapModel {
        const gameMap: MapModel = {
            id: this.mapId,
            name: this.title,
            mode: this.mode,
            visibility: false,
            lastModified: new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }),
            size: this.mapSize,
            creator: 'admin',
            terrain: this._gameMap,
            description: this.description,
        };

        return gameMap;
    }

    saveMap(): Observable<SaveMessage> {
        const gameMap = this.generateGameMap();

        return this.getMap().pipe(
            switchMap((existingGameMap) => {
                if (existingGameMap) {
                    return this.updateMap(gameMap);
                } else {
                    return this.newMap(gameMap);
                }
            }),
            catchError((err) => {
                return of({ error: 'Erreur de sauvegarde: ' + err.message });
            }),
        );
    }

    getTileItem(coordinates: Coordinates): ItemType {
        return this._gameMap[coordinates.y][coordinates.x].item;
    }

    getTileType(coordinates: Coordinates): MapTileType {
        return this._gameMap[coordinates.y][coordinates.x].type;
    }

    getTileReference(coordinates: Coordinates): MapTile {
        return this.gameMap[coordinates.y][coordinates.x];
    }

    isItemAllPlaced(item: ItemType): boolean | undefined {
        return this._disabledItems.has(item);
    }

    initializeNewMap(size: MapSize): void {
        switch (size) {
            case MapSize.Medium:
                this.mapSize = MapSize.Medium;
                this.createEmptyMap(MapSize.Medium);
                break;
            case MapSize.Large:
                this.mapSize = MapSize.Large;
                this.createEmptyMap(MapSize.Large);
                break;
            default:
                this.mapSize = MapSize.Small;
                this.createEmptyMap(MapSize.Small);
        }
    }

    getMap(): Observable<MapModel | null> {
        return this._http.get<MapModel>(`${environment.serverUrl}/api/map/${this.mapId}`).pipe(
            map((res) => res),
            catchError(() => {
                return of(null);
            }),
        );
    }

    loadMap(gameMap: MapModel): void {
        this.title = gameMap.name;
        this.description = gameMap.description;
        this.mapSize = gameMap.size;

        this.createEmptyMap(this.mapSize);

        for (let y = 0; y < this.mapSize; y++) {
            for (let x = 0; x < this.mapSize; x++) {
                const tile = gameMap.terrain[y][x];
                this.gameMap[y][x] = new MapTile(tile.type, tile.item);
            }
        }

        this.updateItemTracker();
    }

    reInitializeMap(): void {
        const mapData = sessionStorage.getItem('map');

        if (mapData) {
            const parsedMapData = JSON.parse(mapData);
            this._gameMap = parsedMapData.map((row: MapTile[]) => row.map((tile: MapTile) => new MapTile(tile.type, tile.item)));
            this.updateItemTracker();
        }
    }

    changeTileType(coordinates: Coordinates, newType: MapTileType): void {
        const tileReference: MapTile = this.getTileReference(coordinates);
        if (tileReference.isDoor() && newType === MapTileType.ClosedDoor) {
            tileReference.toggleDoor();
        } else {
            tileReference.type = newType;
            if (tileReference.isDoor() || newType === MapTileType.Wall) {
                this.removeItem(coordinates);
            }
        }
    }

    placeItem(initialItemCoordinates: Coordinates, coordinates: Coordinates, newItem: ItemType): void {
        const currentTile: MapTile = this.getTileReference(coordinates);
        if (currentTile.isDoor() || currentTile.type === MapTileType.Wall) return;
        if (!areCoordinatesEqual(initialItemCoordinates, INVALID_MAP_COORDINATES)) {
            this.removeItem(initialItemCoordinates);
        }
        this.removeItem(coordinates);
        this.updateDisabledItems(newItem);
        currentTile.item = newItem;
    }

    removeItem(coordinates: Coordinates): void {
        const currentTile: MapTile = this.getTileReference(coordinates);
        const removedItem: ItemType = currentTile.item;
        if (removedItem === ItemType.NoItem) {
            return;
        }
        this._disabledItems.delete(removedItem);
        if (removedItem === ItemType.StartPosition) {
            this._numberOfStartPositionsLeft++;
        } else if (removedItem !== ItemType.Flag) {
            if (this._numberOfItemsLeft === 0) {
                this.showItemsNotPlaced();
            }
            this._numberOfItemsLeft++;
        }
        currentTile.item = ItemType.NoItem;
    }

    private hideNormalItems() {
        this._itemsNotPlaced.clear();
        for (const item of this._normalItems) {
            if (!this._disabledItems.has(item)) {
                this._itemsNotPlaced.add(item);
                this._disabledItems.add(item);
            }
        }
    }

    private showItemsNotPlaced() {
        for (const item of this._itemsNotPlaced) {
            this._disabledItems.delete(item);
        }
    }

    private newMap(gameMap: MapModel): Observable<SaveMessage> {
        return this._http.post<SaveMessage>(environment.serverUrl + '/api/map', gameMap, { observe: 'response' }).pipe(
            map((response) => {
                return response.status === HttpStatusCode.Created
                    ? { message: 'Carte créée!' }
                    : { error: 'Carte invalide: ' + response.body?.message };
            }),
            catchError((err) => {
                return err.status === HttpStatusCode.BadRequest
                    ? of({ error: 'Carte invalide: ' + err.error?.messages })
                    : of({ error: 'Erreur de sauvegarde de carte: ' + err.messages });
            }),
        );
    }

    private updateMap(gameMap: MapModel): Observable<SaveMessage> {
        return this._http.put<SaveMessage>(environment.serverUrl + '/api/map', gameMap, { observe: 'response' }).pipe(
            map((response) => {
                return response.status === HttpStatusCode.Ok
                    ? { message: 'Carte mise à jour !' }
                    : { error: 'Carte invalide: ' + response.body?.message };
            }),
            catchError((err) => {
                return err.status === HttpStatusCode.BadRequest
                    ? of({ error: 'Carte invalide: ' + err.error?.messages })
                    : of({ error: 'Erreur de sauvegarde de carte: ' + err.messages });
            }),
        );
    }

    private updateItemTracker(): void {
        this._disabledItems = new Set<ItemType>();
        switch (this.mapSize) {
            case MapSize.Small:
                this._numberOfItemsLeft = constants.MaxRandomItemsNumber.Small;
                this._numberOfStartPositionsLeft = constants.MaxRandomItemsNumber.Small;
                break;
            case MapSize.Medium:
                this._numberOfItemsLeft = constants.MaxRandomItemsNumber.Medium;
                this._numberOfStartPositionsLeft = constants.MaxRandomItemsNumber.Medium;
                break;
            case MapSize.Large:
                this._numberOfItemsLeft = constants.MaxRandomItemsNumber.Large;
                this._numberOfStartPositionsLeft = constants.MaxRandomItemsNumber.Large;
                break;
        }

        this.trackItems();
    }

    private updateDisabledItems(placedItem: ItemType) {
        if (placedItem === ItemType.StartPosition) {
            if (--this._numberOfStartPositionsLeft === 0) {
                this._disabledItems.add(placedItem);
            }
        } else if (placedItem !== ItemType.NoItem) {
            if (placedItem !== ItemType.Random) {
                this._disabledItems.add(placedItem);
            }
            if (placedItem !== ItemType.Flag && --this._numberOfItemsLeft <= 0) {
                this.hideNormalItems();
            }
        }
    }

    private trackItems(): void {
        for (const row of this._gameMap) {
            for (const tile of row) {
                this.updateDisabledItems(tile.item);
            }
        }
    }
}
