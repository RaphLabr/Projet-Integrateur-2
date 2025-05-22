import { GameMap } from '@app/model/database/game-map';
import { MapService } from '@app/services/map/map.service';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

describe('MapService (with fake Model)', () => {
    const MAP_SIZE = 10;
    let service: MapService;
    let fakeSave: jest.Mock;
    let fakeUpdateOneExec: jest.Mock;
    let fakeFindOneExec: jest.Mock;

    const mockMapModel = {
        find: jest.fn(),
        findOne: jest.fn(),
        countDocuments: jest.fn(),
        insertMany: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
    };

    const fakeMapModelConstructor = jest.fn().mockImplementation((map) => {
        fakeSave = jest.fn();
        return { ...map, save: fakeSave };
    });

    const fakeFindOne = jest.fn().mockImplementation(() => {
        fakeFindOneExec = jest.fn().mockResolvedValue({ id: '1', size: 10 });
        return { exec: fakeFindOneExec };
    });

    const fakeUpdateOne = jest.fn().mockImplementation(() => {
        fakeUpdateOneExec = jest.fn().mockResolvedValue({ ok: 1 });
        return { exec: fakeUpdateOneExec };
    });

    const fakeMapModel = Object.assign(fakeMapModelConstructor, {
        updateOne: fakeUpdateOne,
        findOne: fakeFindOne,
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MapService,
                {
                    provide: getModelToken('GameMap'),
                    useValue: mockMapModel,
                },
                { provide: 'MapModelToken', useValue: fakeMapModel },
            ],
        })
            .overrideProvider(MapService)
            .useFactory({
                factory: (mapModel) => new MapService(mapModel),
                inject: ['MapModelToken'],
            })
            .compile();

        service = module.get<MapService>(MapService);
    });

    it('should create a new map and call save on the model instance', async () => {
        const map = { id: '1', terrain: [] };
        await service.createNewMap(map as GameMap);
        expect(fakeMapModelConstructor).toHaveBeenCalledWith(map);
        expect(fakeSave).toHaveBeenCalled();
    });

    it('should update the map using updateOne', async () => {
        const map = { id: '1', terrain: [] };
        await service.updateMap(map as GameMap);
        expect(fakeUpdateOne).toHaveBeenCalledWith({ id: map.id }, map);
        expect(fakeUpdateOneExec).toHaveBeenCalled();
    });

    describe('getMapSizeById', () => {
        it('should return the size of the map', async () => {
            const map = { id: '1', size: 10 } as Partial<GameMap>;
            mockMapModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(map) });

            const result = await service.getMapSizeById('1');
            expect(result).toEqual(MAP_SIZE);
        });

        it('should throw an error if the map is not found', async () => {
            fakeFindOneExec = jest.fn().mockResolvedValue(null);
            fakeFindOne.mockReturnValue({ exec: fakeFindOneExec });

            await expect(service.getMapSizeById('1')).rejects.toThrowError(new Error('Map with mapId 1 not found'));
        });
    });
});

describe('MapService', () => {
    let service: MapService;

    const mockMapModel = {
        find: jest.fn(),
        findOne: jest.fn(),
        countDocuments: jest.fn(),
        insertMany: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MapService,
                {
                    provide: getModelToken('GameMap'),
                    useValue: mockMapModel,
                },
            ],
        }).compile();

        service = module.get<MapService>(MapService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return all maps', async () => {
        const maps = [{ name: 'Map 1' }, { name: 'Map 2' }];
        mockMapModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(maps) });

        const result = await service.getAllMaps();
        expect(result).toEqual(maps);
    });

    it('should return a map using the ID', async () => {
        const map = { id: '1', name: 'Map 1' };
        mockMapModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(map) });

        const result = await service.getMapById('1');
        expect(result).toEqual(map);
    });

    it('should change map visibility using the ID', async () => {
        const map = { id: '1', name: 'Map 1', visibility: true };
        mockMapModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(map) });
        mockMapModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) });

        const result = await service.changeMapVisibilityById('1');
        expect(result).toEqual(1);
    });

    it('should delete a map using the ID', async () => {
        if ((await service.getMapById('1')) === undefined) {
            const map = { id: '1', name: 'Map 1' };
            mockMapModel.insertMany.mockReturnValue([map]);
        }
        mockMapModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) });

        const result = await service.deleteMapById('1');
        expect(result).toEqual(1);
    });

    it('should throw an error if the map does not exist (delete)', async () => {
        jest.clearAllMocks();
        mockMapModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

        await expect(service.changeMapVisibilityById('1')).rejects.toThrowError(new Error('Map with mapId 1 not found'));
    });

    it('should throw an error if the map does not exist (visibility)', async () => {
        jest.clearAllMocks();
        mockMapModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) });

        await expect(service.deleteMapById('1')).rejects.toThrowError(new Error('Map with mapId 1 not found'));
    });
});
