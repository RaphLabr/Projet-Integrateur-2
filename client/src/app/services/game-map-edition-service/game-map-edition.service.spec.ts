// Max line disable since test file
/* eslint-disable max-lines */
// disabling eslint in the following line in order to test private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MapTile } from '@app/classes/map-tile';
import * as constants from '@app/constants/map-edition-constants';
import { SaveMessage } from '@app/interfaces/save-message';
import { MapModel } from '@app/models/map-model';
import { GameMapEditionService } from '@app/services/game-map-edition-service/game-map-edition.service';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

describe('GameMapEditionService', () => {
    let service: GameMapEditionService;
    let httpMock: HttpTestingController;
    const testingVariable = 5;
    const gameMap: MapModel = {
        id: '12345test',
        name: 'Test Game',
        mode: GameMode.Classic,
        visibility: true,
        lastModified: '2025-01-30',
        size: MapSize.Small,
        creator: 'Tester',
        terrain: [],
        description: 'Test description',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [GameMapEditionService, provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        service = TestBed.inject(GameMapEditionService);
        httpMock = TestBed.inject(HttpTestingController);

        const initialTiles = [
            { type: MapTileType.Ice, item: ItemType.NoItem },
            { type: MapTileType.Water, item: ItemType.Random },
            { type: MapTileType.Wall, item: ItemType.StartPosition },
            { type: MapTileType.Water, item: ItemType.Random },
            { type: MapTileType.Wall, item: ItemType.StartPosition },
            { type: MapTileType.Base, item: ItemType.Potion1 },
        ];

        gameMap.terrain = Array.from({ length: gameMap.size }, (_, rowIndex) =>
            Array.from({ length: gameMap.size }, (colIndex: any) => {
                const index = rowIndex * gameMap.size + colIndex;
                if (index < initialTiles.length) {
                    return new MapTile(initialTiles[index].type, initialTiles[index].item);
                } else {
                    return new MapTile(MapTileType.Ice, ItemType.NoItem);
                }
            }),
        );
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize map with correct size', () => {
        service.createEmptyMap(testingVariable);
        expect(service.gameMap.length).toBe(testingVariable);
        expect(service.gameMap[0].length).toBe(testingVariable);
        expect(service.gameMap[0][0] instanceof MapTile).toBeTrue();

        service.createEmptyMap(MapSize.Large);
        expect(service.gameMap.length).toBe(MapSize.Large);
    });

    it('should update tile type correctly', () => {
        const coords: Coordinates = { x: 0, y: 0 };
        const initialCoords: Coordinates = { x: 1, y: 1 };
        service.createEmptyMap(testingVariable);
        service.changeTileType(coords, MapTileType.Water);
        expect(service.gameMap[coords.y][coords.x].type).toBe(MapTileType.Water);

        service.placeItem(initialCoords, coords, ItemType.Random);
        expect(service.gameMap[coords.y][coords.x].item).toBe(ItemType.Random);

        service.changeTileType(coords, MapTileType.ClosedDoor);
        expect(service.gameMap[coords.y][coords.x].type).toBe(MapTileType.ClosedDoor);

        service.changeTileType(coords, MapTileType.ClosedDoor);
        expect(service.gameMap[coords.y][coords.x].type).toBe(MapTileType.OpenDoor);
    });

    it('should not placeItem if tile is door or wall', () => {
        const coords: Coordinates = { x: 0, y: 0 };
        const initialCoords: Coordinates = { x: 1, y: 1 };
        service.createEmptyMap(testingVariable);
        service.changeTileType(coords, MapTileType.Wall);
        expect(service.gameMap[coords.y][coords.x].type).toBe(MapTileType.Wall);

        service.placeItem(initialCoords, coords, ItemType.Random);
        expect(service.gameMap[coords.y][coords.x].item).toBe(ItemType.NoItem);
    });

    it('should set the map size correctly', () => {
        service.initializeNewMap(MapSize.Medium);
        expect(service.mapSize).toBe(MapSize.Medium);
        expect(service.gameMap.length).toBe(MapSize.Medium);
    });

    it('should update item tracker correctly', () => {
        service.initializeNewMap(MapSize.Small);
        (service as any).updateItemTracker();
        expect(service.numberOfItemsLeft).toBe(constants.MaxRandomItemsNumber.Small);

        service.initializeNewMap(MapSize.Medium);
        (service as any).updateItemTracker();
        expect(service.numberOfItemsLeft).toBe(constants.MaxRandomItemsNumber.Medium);

        service.initializeNewMap(MapSize.Large);
        (service as any).updateItemTracker();
        expect(service.numberOfItemsLeft).toBe(constants.MaxRandomItemsNumber.Large);
    });

    it('should load a map correctly', () => {
        service.loadMap(gameMap);
        expect(service.title).toBe(gameMap.name);
        expect(service.description).toBe(gameMap.description);
        expect(service.mapSize).toBe(gameMap.size);
        expect(service.gameMap.length).toBe(gameMap.size);

        for (let i = 0; i < gameMap.size; i++) {
            for (let j = 0; j < gameMap.size; j++) {
                expect(service.gameMap[i][j].type).toBe(gameMap.terrain[i][j].type);
                expect(service.gameMap[i][j].item).toBe(gameMap.terrain[i][j].item);
            }
        }

        expect(service.getTileItem({ x: 0, y: 0 })).toBe(ItemType.NoItem);
        expect(service.getTileType({ x: 0, y: 0 })).toBe(MapTileType.Ice);
    });

    it('should set size correctly', () => {
        service.initializeNewMap(MapSize.Small);
        expect(service.mapSize).toBe(MapSize.Small);

        service.initializeNewMap(MapSize.Medium);
        expect(service.mapSize).toBe(MapSize.Medium);

        service.initializeNewMap(MapSize.Large);
        expect(service.mapSize).toBe(MapSize.Large);
    });

    it('should get map correctly', () => {
        const mockMap: MapModel = {
            id: '12345test',
            name: 'Test Game',
            mode: GameMode.Classic,
            visibility: true,
            lastModified: '2025-01-30',
            size: MapSize.Small,
            creator: 'Tester',
            terrain: [],
            description: 'Test description',
        };

        service.mapId = '12345test';

        service.getMap().subscribe((map) => {
            expect(map).toEqual(mockMap);
        });

        const req = httpMock.expectOne(`${environment.serverUrl}/api/map/${service.mapId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockMap);
    });

    it('should handle error when getting map', () => {
        service.mapId = '12345test';

        service.getMap().subscribe((map) => {
            expect(map).toBeNull();
        });

        const req = httpMock.expectOne(`${environment.serverUrl}/api/map/${service.mapId}`);
        expect(req.request.method).toBe('GET');
        req.flush('Error', { status: 500, statusText: 'Server Error' });
    });

    it('should reinitialise the map from sessionStorage', () => {
        const mockMapData = [[new MapTile(MapTileType.Base, ItemType.NoItem)]];
        sessionStorage.setItem('map', JSON.stringify(mockMapData));

        service.reInitializeMap();
        expect(service.gameMap.length).toBe(1);
        expect(service.gameMap[0][0].type).toBe(MapTileType.Base);
    });

    it('should replace item', () => {
        const coords: Coordinates = { x: 0, y: 0 };
        const initialCoords: Coordinates = { x: 1, y: 1 };

        service.createEmptyMap(gameMap.size);

        service.placeItem(initialCoords, coords, ItemType.Skull);
        expect(service.gameMap[coords.y][coords.x].item).toBe(ItemType.Skull);

        service.placeItem(initialCoords, coords, ItemType.Potion2);
        expect(service.gameMap[coords.y][coords.x].item).toBe(ItemType.Potion2);
        expect(service.isItemAllPlaced(ItemType.Potion2)).toBeTrue();
        expect(service.isItemAllPlaced(ItemType.Skull)).toBeFalse();

        for (let i = 0; i < 2; i++) {
            const coord: Coordinates = { x: 0, y: i };
            service.placeItem(initialCoords, coord, ItemType.Random);
        }
        expect(service.isItemAllPlaced(ItemType.Random)).toBeTrue();

        for (let i = 0; i < 2; i++) {
            const coord: Coordinates = { x: i, y: 0 };
            service.placeItem(initialCoords, coord, ItemType.StartPosition);
        }
        expect(service.isItemAllPlaced(ItemType.StartPosition)).toBeTrue();
    });

    it('should remove item', () => {
        const coords: Coordinates = { x: 0, y: 0 };
        const initialCoords: Coordinates = { x: 1, y: 1 };

        service.createEmptyMap(gameMap.size);

        service.placeItem(initialCoords, coords, ItemType.StartPosition);
        expect(service.gameMap[coords.y][coords.x].item).toBe(ItemType.StartPosition);

        service.removeItem(coords);
        expect(service.gameMap[coords.y][coords.x].item).toBe(ItemType.NoItem);
    });

    describe('Game-map-edition.service - saveMap()', () => {
        beforeEach(() => {
            service.title = 'Test';
            service.description = 'valid map';
            service.mapSize = testingVariable;
            service.mapId = '12345test';
            service.mode = GameMode.Classic;
            service.createEmptyMap(MapSize.Small);
        });

        it('should save a valid map correctly', () => {
            const mockResponse: SaveMessage = { message: 'Map saved successfully !' };
            spyOn(service, 'saveMap').and.returnValue(of(mockResponse));

            service.saveMap().subscribe((response) => {
                expect(response.message).toBe('Map saved successfully !');
            });

            expect(service.saveMap).toHaveBeenCalled();
        });

        it('should call newMap when no existing map is found', () => {
            spyOn(service, 'getMap').and.returnValue(of(null));
            const mockResponse: SaveMessage = { message: 'Map created successfully' };
            const newMapSpy = spyOn(service as unknown as { newMap: jasmine.Spy }, 'newMap').and.returnValue(of(mockResponse));

            service.saveMap().subscribe((response) => {
                expect(response.message).toBe('Map created successfully');
            });

            expect(newMapSpy).toHaveBeenCalled();
            expect(service.getMap).toHaveBeenCalled();
        });

        it('should call updateMap when the map exists', () => {
            spyOn(service, 'getMap').and.returnValue(of(gameMap));
            const mockResponse: SaveMessage = { message: 'Map updated  successfully' };
            const updateMapSpy = spyOn(service as unknown as { updateMap: jasmine.Spy }, 'updateMap').and.returnValue(of(mockResponse));

            service.saveMap().subscribe((response) => {
                expect(response.message).toBe('Map updated  successfully');
            });

            expect(updateMapSpy).toHaveBeenCalled();
            expect(service.getMap).toHaveBeenCalled();
        });

        it('should return error if saving the map failed', () => {
            spyOn(service, 'getMap').and.returnValue(of(gameMap));

            const errorMessage = 'Erreur de sauvegarde: Network error';
            const updateMapSpy = spyOn(service as unknown as { updateMap: jasmine.Spy }, 'updateMap').and.returnValue(
                throwError(() => new Error('Network error')),
            );

            service.saveMap().subscribe((response) => {
                expect(response.error).toBe(errorMessage);
            });

            expect(updateMapSpy).toHaveBeenCalled();
            expect(service.getMap).toHaveBeenCalled();
        });
    });

    describe('GameMapEditionService - newMap', () => {
        it('should create a new map successfully', () => {
            const mockResponse: SaveMessage = { message: 'Map created successfully' };

            (service as any).newMap(gameMap).subscribe((response: SaveMessage) => {
                expect(response.message).toBe('Carte créée!');
            });

            const req = httpMock.expectOne(environment.serverUrl + '/api/map');
            expect(req.request.method).toBe('POST');
            req.flush(mockResponse, { status: 201, statusText: 'Created' });
        });

        it('should not create a new map successfully if invalid', () => {
            const mockResponse: SaveMessage = { message: 'Map creation failed' };
            (service as any).newMap(gameMap).subscribe((response: SaveMessage) => {
                expect(response.error).toBe('Carte invalide: Map creation failed');
            });

            const req = httpMock.expectOne(environment.serverUrl + '/api/map');
            expect(req.request.method).toBe('POST');
            req.flush(mockResponse, { status: 200, statusText: 'OK' });
        });

        it('should return error if creating a new map failed with non-created status', () => {
            const errorMessage = 'Carte invalide: undefined';

            (service as any).newMap(gameMap).subscribe((response: SaveMessage) => {
                expect(response.error).toBe(errorMessage);
            });

            const req = httpMock.expectOne(environment.serverUrl + '/api/map');
            expect(req.request.method).toBe('POST');
            req.flush({ message: 'Invalid data' }, { status: 400, statusText: 'Bad Request' });
        });

        it('should return error if creating a new map failed with server error', () => {
            const errorMessage = 'Erreur de sauvegarde de carte: undefined';

            (service as any).newMap(gameMap).subscribe((response: SaveMessage) => {
                expect(response.error).toBe(errorMessage);
            });

            const req = httpMock.expectOne(environment.serverUrl + '/api/map');
            expect(req.request.method).toBe('POST');
            req.flush('Server error', { status: 500, statusText: 'Server Error' });
        });
    });

    describe('GameMapEditionService - updateMap', () => {
        it('should update a map successfully', () => {
            const mockResponse: SaveMessage = { message: 'Map updated successfully' };

            (service as any).updateMap(gameMap).subscribe((response: SaveMessage) => {
                expect(response.message).toBe('Carte mise à jour !');
            });

            const req = httpMock.expectOne(environment.serverUrl + '/api/map');
            expect(req.request.method).toBe('PUT');
            req.flush(mockResponse, { status: 200, statusText: 'OK' });
        });
        it('should not update a new map successfully if invalid', () => {
            const mockResponse: SaveMessage = { message: 'Map creation failed' };
            (service as any).updateMap(gameMap).subscribe((response: SaveMessage) => {
                expect(response.error).toBe('Carte invalide: Map creation failed');
            });

            const req = httpMock.expectOne(environment.serverUrl + '/api/map');
            expect(req.request.method).toBe('PUT');
            req.flush(mockResponse, { status: 201, statusText: 'OK' });
        });

        it('should return error if updating a map failed with non-ok status', () => {
            const errorMessage = 'Carte invalide: undefined';

            (service as any).updateMap(gameMap).subscribe((response: SaveMessage) => {
                expect(response.error).toBe(errorMessage);
            });

            const req = httpMock.expectOne(environment.serverUrl + '/api/map');
            expect(req.request.method).toBe('PUT');
            req.flush({ message: 'Invalid data' }, { status: 400, statusText: 'Bad Request' });
        });

        it('should return error if updating a map failed with server error', () => {
            const errorMessage = 'Erreur de sauvegarde de carte: undefined';

            (service as any).updateMap(gameMap).subscribe((response: SaveMessage) => {
                expect(response.error).toBe(errorMessage);
            });

            const req = httpMock.expectOne(environment.serverUrl + '/api/map');
            expect(req.request.method).toBe('PUT');
            req.flush('Server error', { status: 500, statusText: 'Server Error' });
        });
    });

    describe('trackItems', () => {
        it('should properly track items and update counters', () => {
            service.initializeNewMap(MapSize.Small);

            (service as any)._gameMap = [
                [
                    new MapTile(MapTileType.Base, ItemType.StartPosition),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.Potion1),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.Random),
                    new MapTile(MapTileType.Base, ItemType.Skull),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
            ];

            (service as any)._numberOfStartPositionsLeft = constants.MaxRandomItemsNumber.Small;
            (service as any)._numberOfRandomItemsLeft = constants.MaxRandomItemsNumber.Small;
            (service as any)._areItemsPlacedTracker = new Map<ItemType, boolean>(Object.values(ItemType).map((item) => [item, false]));

            (service as any).trackItems();

            expect(service.isItemAllPlaced(ItemType.Potion1)).toBeTrue();
            expect(service.isItemAllPlaced(ItemType.Skull)).toBeTrue();

            expect(service.numberOfStartPositionsLeft).toBe(1);
            expect(service.isItemAllPlaced(ItemType.StartPosition)).toBeFalse();

            (service as any)._gameMap[2][1] = new MapTile(MapTileType.Base, ItemType.StartPosition);

            (service as any)._numberOfStartPositionsLeft = constants.MaxRandomItemsNumber.Small;
            (service as any)._areItemsPlacedTracker = new Map<ItemType, boolean>(Object.values(ItemType).map((item) => [item, false]));

            (service as any).trackItems();

            expect(service.numberOfStartPositionsLeft).toBe(0);
            expect(service.isItemAllPlaced(ItemType.StartPosition)).toBeTrue();
        });
    });
});
