// this is needed in order to access the private method showNotification
/* eslint-disable @typescript-eslint/no-explicit-any */
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MapTile } from '@app/classes/map-tile';
import { GameMapComponent } from '@app/components/game-map/game-map.component';
import { INVALID_MAP_COORDINATES } from '@app/constants/map-edition-constants';
import { SaveMessage } from '@app/interfaces/save-message';
import { MapModel } from '@app/models/map-model';
import { EditionPageComponent } from '@app/pages/edition-page/edition-page.component';
import { GameMapEditionService } from '@app/services/game-map-edition-service/game-map-edition.service';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { of, throwError } from 'rxjs';

describe('EditionPageComponent', () => {
    let component: EditionPageComponent;
    let fixture: ComponentFixture<EditionPageComponent>;
    let testTile: Element;
    let service: GameMapEditionService;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let route: ActivatedRoute;
    const testString = 'test';
    const leftMouseDown: MouseEvent = new MouseEvent('mousedown', { buttons: 1 });
    const rightMouseDown: MouseEvent = new MouseEvent('mousedown', { buttons: 2 });
    const testCoordinates: Coordinates = { x: 0, y: 0 };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditionPageComponent, NoopAnimationsModule],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: MatSnackBar, useValue: snackBarSpy }],
        }).compileComponents();
        fixture = TestBed.createComponent(EditionPageComponent);
        component = fixture.componentInstance;
        service = component['_editionService'];
        route = component['_route'];
        fixture.detectChanges();
        const mapComponent = fixture.debugElement.query(By.directive(GameMapComponent)).componentInstance;
        mapComponent.gameMap = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => new MapTile(MapTileType.Base, ItemType.NoItem)));
        mapComponent.size = MapSize.Small;
        fixture.detectChanges();
        testTile = fixture.nativeElement.querySelector('.tile-container');

        const snackBarRefSpy = jasmine.createSpyObj('MatSnackBarRef', ['onAction', 'dismiss']);
        snackBarRefSpy.onAction.and.returnValue(of());
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        snackBarSpy.open.and.returnValue(snackBarRefSpy);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Tile left mouse down', () => {
        it('should call onTileLeftMouseDown', () => {
            spyOn(component, 'onTileLeftMouseDown');
            testTile.dispatchEvent(leftMouseDown);
            expect(component.onTileLeftMouseDown).toHaveBeenCalled();
        });

        it('should call changeTileType of service if selectedTileTool is not null', () => {
            spyOn(service, 'getTileItem').and.returnValue(ItemType.NoItem);
            spyOn(service, 'changeTileType');
            component.selectedTileTool = MapTileType.Wall;
            component.onTileLeftMouseDown({ tileCoordinates: testCoordinates, mouseEvent: leftMouseDown });
            expect(component['_editionService'].changeTileType).toHaveBeenCalled();
        });

        it('should pause tile changes for 1 millisecond when a door is placed on a tile that has an item', fakeAsync(() => {
            spyOn(service, 'getTileItem').and.returnValue(ItemType.Barrel);
            spyOn(service, 'changeTileType');
            component.selectedTileTool = MapTileType.ClosedDoor;
            component.onTileLeftMouseDown({ tileCoordinates: testCoordinates, mouseEvent: leftMouseDown });
            expect(component['_isTileTypeChangeEnabled']).toBeFalse();
            tick(1);
            expect(component['_isTileTypeChangeEnabled']).toBeTrue();
        }));
    });

    it('should change selectedTileTool when a tile type tool is clicked', () => {
        component.selectedTileTool = MapTileType.Base;
        component.onTypeToolClick(MapTileType.Ice);
        expect(component.selectedTileTool).toBe(MapTileType.Ice);
    });

    it('should set selectedTileTool to null when the same tile type tool is clicked again', () => {
        component.selectedTileTool = MapTileType.Ice;
        component.onTypeToolClick(MapTileType.Ice);
        expect(component.selectedTileTool).toBeNull();
    });

    it('should call the corresponding method of the service with the same parameter on isItemPlaced call', () => {
        spyOn(service, 'isItemAllPlaced');
        component.isItemPlaced(ItemType.Barrel);
        expect(service.isItemAllPlaced).toHaveBeenCalledWith(ItemType.Barrel);
    });

    describe('onSave method', () => {
        it('should update the edition service with title and description', () => {
            component.mapTitle = 'Test Map Title';
            component.mapDescription = 'Test Map Description';
            spyOn(service, 'saveMap').and.returnValue(of({}));

            component.onSave();

            expect(service.title).toBe('Test Map Title');
            expect(service.description).toBe('Test Map Description');
        });

        it('should show notification when saveMap returns an error message', () => {
            const errorMessage = 'Invalid map configuration';
            const mockErrorResponse: SaveMessage = { error: errorMessage };
            spyOn(service, 'saveMap').and.returnValue(of(mockErrorResponse));

            const snackBarService = TestBed.inject(SnackBarService);
            const showNotificationSpy = spyOn<any>(snackBarService, 'showNotification');

            component.onSave();

            expect(service.saveMap).toHaveBeenCalled();
            expect(showNotificationSpy).toHaveBeenCalledWith(errorMessage, false);
        });

        it('should show notification when saveMap throws an error', () => {
            const errorObj = { message: 'Network error' };
            spyOn(service, 'saveMap').and.returnValue(throwError(() => errorObj));
            const snackBarService = TestBed.inject(SnackBarService);
            const showNotificationSpy = spyOn<any>(snackBarService, 'showNotification');

            component.onSave();

            expect(showNotificationSpy).toHaveBeenCalledWith('Sauveguarde échouée: Network error', false);
        });
    });

    it('gameMap getter should return correct value from service', () => {
        const testMap: MapTile[][] = [[new MapTile(MapTileType.Ice, ItemType.Skull)]];
        component['_editionService']['_gameMap'] = testMap;
        expect(component.gameMap).toBe(testMap);
    });

    it('numberOfRandomItemsLeft getter should return correct value from service', () => {
        const testValue = 5;
        component['_editionService']['_numberOfItemsLeft'] = testValue;
        expect(component.numberOfItemsLeft).toBe(testValue);
    });

    it('numberOfStartPositionsLeft getter should return correct value from service', () => {
        const testValue = 5;
        component['_editionService']['_numberOfStartPositionsLeft'] = testValue;
        expect(component.numberOfStartPositionsLeft).toBe(testValue);
    });

    it('ngOnInit should set parameters of component and service properly when no map is passed', () => {
        const testSize = 'small';
        const testId = 'a5';
        const testMode = 'CTF';
        route.queryParams = of({
            mapSize: testSize,
            mapId: testId,
            mode: testMode,
        });
        spyOn(component, 'sessionStorageSave');
        spyOn(service, 'initializeNewMap');
        spyOn(service, 'getMap').and.returnValue(of(null));
        component.ngOnInit();
        expect(service.initializeNewMap).toHaveBeenCalledWith(MapSize.Small);
        expect(component.mapId).toBe(testId);
        expect(component.mode).toBe(testMode);
        expect(component.mapSize).toBe(MapSize.Small);
        expect(service.mode).toBe(testMode);
        expect(service.mapId).toBe(testId);
        expect(component.sessionStorageSave).toHaveBeenCalled();
    });

    it('ngOnInit should initialize map properly when editionService has a map', () => {
        const testMapModel: MapModel = {
            size: MapSize.Small,
            name: testString,
            description: testString,
            id: '',
            mode: GameMode.Classic,
            visibility: false,
            lastModified: '',
            creator: '',
            terrain: [],
        };

        spyOn(service, 'getMap').and.returnValue(of(testMapModel));
        spyOn(service, 'loadMap');
        component.ngOnInit();
        expect(service.loadMap).toHaveBeenCalled();
        expect(component.mapSize).toBe(MapSize.Small);
        expect(component.mapTitle).toBe(testString);
        expect(component.mapDescription).toBe(testString);
    });

    it('updateTitle should update the title', () => {
        const testInput = document.createElement('input');
        testInput.value = testString;
        const testEvent = new Event('input');
        Object.defineProperty(testEvent, 'target', { value: testInput });
        component.updateTitle(testEvent);
        expect(component.mapTitle).toBe(testString);
    });

    it('updateDescription should update the description', () => {
        const testTextArea = document.createElement('textarea');
        testTextArea.value = testString;
        const testEvent = new Event('input');
        Object.defineProperty(testEvent, 'target', { value: testTextArea });
        component.updateDescription(testEvent);
        expect(component.mapDescription).toBe(testString);
    });

    it('should reinitialize the map and update title and description from session storage', () => {
        spyOn(service, 'placeItem');
        spyOn(service, 'removeItem');

        const coordinates: Coordinates = { x: 1, y: 1 };
        component['_initialItemCoordinates'] = coordinates;
        component.draggedItem = ItemType.Potion1;

        component.onTileDrop({ x: 2, y: 2 });
        expect(service.placeItem).toHaveBeenCalled();
    });

    it('should reset initialItemCoordinates on onItemDragFromMapEnd', () => {
        component['_initialItemCoordinates'] = { x: 1, y: 1 };
        component.onItemDragFromMapEnd();
        expect(component['_initialItemCoordinates']).toEqual(INVALID_MAP_COORDINATES);
    });

    it('should set draggedItem and initialItemCoordinates on onItemDragFromMapStart', () => {
        const event = { item: ItemType.Random, tileCoordinates: { x: 1, y: 1 } };
        component.onItemDragFromMapStart(event);
        expect(component.draggedItem).toBe(ItemType.Random);
        expect(component['_initialItemCoordinates']).toEqual({ x: 1, y: 1 });
    });

    it('should place item and reset selectedTileTool on onTileDrop', () => {
        const coordinates: Coordinates = { x: 1, y: 1 };
        component.draggedItem = ItemType.Random;
        component['_initialItemCoordinates'] = { x: 0, y: 0 };
        spyOn(component, 'onItemDragFromMapEnd');
        spyOn(service, 'placeItem');
        component.onTileDrop(coordinates);
        expect(service.placeItem).toHaveBeenCalledWith({ x: 0, y: 0 }, coordinates, ItemType.Random);
        expect(component.selectedTileTool).toBeNull();
    });

    it('should reset initialItemCoordinates on onItemDragFromMapEnd', () => {
        component['_initialItemCoordinates'] = { x: 1, y: 1 };
        component.onItemDragFromMapEnd();
        expect(component['_initialItemCoordinates']).toEqual(INVALID_MAP_COORDINATES);
    });

    it('should remove item if draggedItem matches on onItemToolDrop', () => {
        const mockMouseEvent = new MouseEvent('click');
        component.draggedItem = ItemType.Potion1;
        component['_initialItemCoordinates'] = { x: 1, y: 1 };

        spyOn(service, 'removeItem');
        component.onItemToolDrop(mockMouseEvent, ItemType.Potion1);

        expect(service.removeItem).toHaveBeenCalledWith({ x: 1, y: 1 });
    });

    it('onTileEnter should call onTileLeftMouseDown when leftMouseButton is down', () => {
        const testEvent = { tileCoordinates: testCoordinates, mouseEvent: leftMouseDown };
        spyOn(component, 'onTileLeftMouseDown');
        component.onTileEnter(testEvent);
        expect(component.onTileLeftMouseDown).toHaveBeenCalledWith(testEvent);
    });

    it('onTileEnter should call changeTileType and update isItemBeingDeleted and initialItemCoordinates', () => {
        const testEvent = { tileCoordinates: testCoordinates, mouseEvent: rightMouseDown };
        spyOn(service, 'changeTileType');
        component['_isItemBeingDeleted'] = true;
        component.onTileEnter(testEvent);
        expect(service.changeTileType).toHaveBeenCalled();
        expect(component['_isItemBeingDeleted']).toBeFalse();
        expect(component['_initialItemCoordinates']).toBe(INVALID_MAP_COORDINATES);
    });

    it('onTileRightMouseDown should call changeTileType if theres no item on the tile', () => {
        spyOn(service, 'changeTileType');
        spyOn(service, 'getTileItem').and.returnValue(ItemType.NoItem);
        component.onTileRightMouseDown(testCoordinates);
        expect(service.changeTileType).toHaveBeenCalledWith(testCoordinates, MapTileType.Base);
    });

    it('onTileRightMouseDown should update the component state properly if theres an item on the tile', () => {
        spyOn(service, 'getTileItem').and.returnValue(ItemType.Barrel);
        component.onTileRightMouseDown(testCoordinates);
        expect(component['_isItemBeingDeleted']).toBe(true);
        expect(component['_initialItemCoordinates']).toBe(testCoordinates);
    });

    it('onTileRightMouseUp should call removeItem from service and update component if initial coordinates and clicked coordinates are equal', () => {
        spyOn(service, 'removeItem');
        component['_initialItemCoordinates'] = testCoordinates;
        component['_isItemBeingDeleted'] = true;
        component.onTileRightMouseUp(testCoordinates);
        expect(service.removeItem).toHaveBeenCalledWith(testCoordinates);
        expect(component['_isItemBeingDeleted']).toBeFalse();
        expect(component['_initialItemCoordinates']).toBe(INVALID_MAP_COORDINATES);
    });

    it('should reinitialize the map and update title and description from session storage', () => {
        const mockTitle = 'Test Title';
        const mockDescription = 'Test Description';
        spyOn(service, 'reInitializeMap');
        spyOn(sessionStorage, 'getItem').and.callFake((key: string) => {
            if (key === 'title') {
                return mockTitle;
            } else if (key === 'description') {
                return mockDescription;
            }
            return null;
        });

        component.onReinitializeClick();

        expect(component.mapTitle).toBe(mockTitle);
        expect(component.mapDescription).toBe(mockDescription);
        expect(service.reInitializeMap).toHaveBeenCalled();
    });
});
