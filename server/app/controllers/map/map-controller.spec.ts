import { MapController } from '@app/controllers/map/map-controller';
import { GameMap } from '@app/model/database/game-map';
import { MapGeneratorService } from '@app/services/draw-map/draw-map.service';
import { MapValidationService } from '@app/services/map-validation/map-validation.service';
import { MapService } from '@app/services/map/map.service';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';

jest.mock('fs');

const mockMapService = {
    getAllMaps: jest.fn(),
    getMapById: jest.fn(),
    getMapSizeById: jest.fn(),
    changeMapVisibilityById: jest.fn(),
    deleteMapById: jest.fn(),
    createNewMap: jest.fn(),
    updateMap: jest.fn(),
};

const mockMapGeneratorService = {
    generateMapImage: jest.fn(),
    updateMap: jest.fn(),
    getImageMap: jest.fn(),
};

const mockMapValidationService = {
    generateInvalidMapMessages: jest.fn(),
};

describe('MapController', () => {
    let controller: MapController;
    let mockResponse: Partial<Response>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MapController],

            providers: [
                {
                    provide: MapService,
                    useValue: mockMapService,
                },
                {
                    provide: MapGeneratorService,
                    useValue: mockMapGeneratorService,
                },
                {
                    provide: MapValidationService,
                    useValue: mockMapValidationService,
                },
            ],
        }).compile();

        controller = module.get<MapController>(MapController);
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
            setHeader: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('POST (saveMap)', () => {
        it('should save a new map when allowed', async () => {
            const mockMap = { id: '1', terrain: [] } as GameMap;

            mockMapValidationService.generateInvalidMapMessages.mockResolvedValue([]);
            mockMapService.createNewMap.mockResolvedValue(undefined);
            mockMapGeneratorService.updateMap.mockResolvedValue(undefined);
            await controller.saveMap(mockMap, mockResponse as Response);

            expect(mockMapValidationService.generateInvalidMapMessages).toHaveBeenCalledWith(mockMap);
            expect(mockMapService.createNewMap).toHaveBeenCalledWith(mockMap);
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
            expect(mockResponse.json).toHaveBeenCalledWith({ messages: 'Carte enregistrée' });
            expect(mockMapGeneratorService.updateMap).toHaveBeenCalledWith(mockMap.terrain, mockMap.id);
        });

        it('should return BAD_REQUEST if map is not allowed', async () => {
            const mockMap = { id: '1', terrain: [] } as GameMap;
            const errorMessages = ['Not allowed'];
            mockMapValidationService.generateInvalidMapMessages.mockResolvedValue(errorMessages);

            await controller.saveMap(mockMap, mockResponse as Response);

            expect(mockMapService.createNewMap).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith({ messages: errorMessages });
        });

        it('should return INTERNAL_SERVER_ERROR if an error occurs', async () => {
            const mockMap = { id: '1', terrain: [] } as GameMap;
            mockMapValidationService.generateInvalidMapMessages.mockResolvedValue([]);
            mockMapService.createNewMap.mockRejectedValue(new Error('Error saving map'));

            await controller.saveMap(mockMap, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith({ messages: 'Error saving map' });
        });
    });

    describe('GET /:id/size (getMapSize)', () => {
        it('should return the size of the map', async () => {
            const mockMapSize = { size: 10 };
            mockMapService.getMapSizeById.mockResolvedValue(mockMapSize);

            await controller.getMapSize(mockResponse as Response, '1');

            expect(mockMapService.getMapSizeById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockResponse.json).toHaveBeenCalledWith(mockMapSize);
        });

        it('should return 404 if the map is not found', async () => {
            mockMapService.getMapSizeById.mockRejectedValue(new Error('Map not found'));

            await controller.getMapSize(mockResponse as Response, '1');

            expect(mockMapService.getMapSizeById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.send).toHaveBeenCalledWith('Map not found');
        });

        it('should return 500 if there is an internal server error', async () => {
            mockMapService.getMapSizeById.mockRejectedValue(new Error('Internal server error'));

            await controller.getMapSize(mockResponse as Response, '1');

            expect(mockMapService.getMapSizeById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.send).toHaveBeenCalledWith('Internal server error');
        });
    });

    describe('PUT / (updateMap)', () => {
        it('should update the map when allowed', async () => {
            const mockMap = { id: '1', terrain: [] } as GameMap;
            mockMapValidationService.generateInvalidMapMessages.mockResolvedValue([]);
            mockMapService.updateMap.mockResolvedValue(undefined);
            mockMapGeneratorService.updateMap.mockResolvedValue(undefined);

            await controller.updateMap(mockMap, mockResponse as Response);

            expect(mockMapValidationService.generateInvalidMapMessages).toHaveBeenCalledWith(mockMap);
            expect(mockMapService.updateMap).toHaveBeenCalledWith(mockMap);
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockResponse.json).toHaveBeenCalledWith({ messages: 'Carte modifiée' });
            expect(mockMapGeneratorService.updateMap).toHaveBeenCalledWith(mockMap.terrain, mockMap.id);
        });

        it('should return BAD_REQUEST if map update is not allowed', async () => {
            const mockMap = { id: '1', terrain: [] } as GameMap;
            const errorMessages = ['Update not allowed'];
            mockMapValidationService.generateInvalidMapMessages.mockResolvedValue(errorMessages);

            await controller.updateMap(mockMap, mockResponse as Response);

            expect(mockMapService.updateMap).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith({ messages: errorMessages });
        });

        it('should return INTERNAL_SERVER_ERROR if an error occurs during update', async () => {
            const mockMap = { id: '1', terrain: [] } as GameMap;
            mockMapValidationService.generateInvalidMapMessages.mockResolvedValue([]);
            mockMapService.updateMap.mockRejectedValue(new Error('Error updating map'));

            await controller.updateMap(mockMap, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith({ messages: 'Error updating map' });
        });
    });

    describe('GET /maps', () => {
        it('should return all maps', async () => {
            const mockMaps = [{ id: '1' }, { id: '2' }];
            mockMapService.getAllMaps.mockResolvedValue(mockMaps);

            await controller.allMaps(mockResponse as Response);

            expect(mockMapService.getAllMaps).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockResponse.json).toHaveBeenCalledWith(mockMaps);
        });

        it('should return 404 if no maps are found', async () => {
            mockMapService.getAllMaps.mockRejectedValue(new Error('No maps found'));

            await controller.allMaps(mockResponse as Response);

            expect(mockMapService.getAllMaps).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.send).toHaveBeenCalledWith('No maps found');
        });
    });

    describe('GET /maps/:id', () => {
        it('should return a map by id', async () => {
            const mockMap = { id: '1' };
            mockMapService.getMapById.mockResolvedValue(mockMap);

            await controller.getMapById(mockResponse as Response, '1');

            expect(mockMapService.getMapById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockResponse.json).toHaveBeenCalledWith(mockMap);
        });

        it('should return 404 if no map is found', async () => {
            mockMapService.getMapById.mockResolvedValue(null);

            await controller.getMapById(mockResponse as Response, '1');

            await expect(mockMapService.getMapById(mockResponse as Response, '1'));

            expect(mockMapService.getMapById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.send).toHaveBeenCalledWith('Carte non trouvée');
        });

        it('should return 500 if theres an error with database', async () => {
            mockMapService.getMapById.mockRejectedValue(new Error('Error with database'));

            await controller.getMapById(mockResponse as Response, '1');

            await expect(mockMapService.getMapById(mockResponse as Response, '1')).rejects.toThrowError('Error with database');

            expect(mockMapService.getMapById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockResponse.send).toHaveBeenCalledWith('Error with database');
        });
    });

    describe('GET /maps/:id/image', () => {
        it('should return an image of the map if the map is found', async () => {
            const mockMap = { id: '1', terrain: [] };
            const mockImage = Buffer.from('mock image content');

            mockMapService.getMapById.mockResolvedValue(mockMap);
            mockMapGeneratorService.getImageMap.mockResolvedValue(mockImage);

            await controller.getMapImage(mockResponse as Response, '1');

            expect(mockMapService.getMapById).toHaveBeenCalledWith('1');
            expect(mockMapGeneratorService.getImageMap).toHaveBeenCalledWith(mockMap.terrain, '1');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockResponse.send).toHaveBeenCalledWith(mockImage);
        });

        it('should return 404 if no map is found', async () => {
            mockMapService.getMapById.mockResolvedValue(null);

            await controller.getMapImage(mockResponse as Response, '1');

            expect(mockMapService.getMapById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.send).toHaveBeenCalledWith('Carte non trouvée dans la base de données');
        });
    });

    describe('PATCH /maps/:id', () => {
        it('should change map visibility and return OK', async () => {
            mockMapService.changeMapVisibilityById.mockResolvedValue({ id: 1, visibility: true });

            await controller.changeMapVisibilityById(mockResponse as Response, '1');

            expect(mockMapService.changeMapVisibilityById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('should return 404 if changeMapVisibilityById returns a falsy value', async () => {
            mockMapService.changeMapVisibilityById.mockResolvedValue(null);

            await controller.changeMapVisibilityById(mockResponse as Response, '1');

            expect(mockMapService.changeMapVisibilityById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);

            expect(mockResponse.send).toHaveBeenCalledWith('null');
        });

        it('should return 404 if changeMapVisibilityById throws an error', async () => {
            mockMapService.changeMapVisibilityById.mockRejectedValue(new Error('Database error'));

            await controller.changeMapVisibilityById(mockResponse as Response, '1');

            expect(mockMapService.changeMapVisibilityById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.send).toHaveBeenCalledWith('Database error');
        });
    });

    describe('DELETE /maps/:id', () => {
        it('should delete a map and return OK', async () => {
            mockMapService.deleteMapById.mockResolvedValue({ id: '1' });

            await controller.deleteMapById(mockResponse as Response, '1');

            expect(mockMapService.deleteMapById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('should return 404 if deleteMapById returns a falsy value', async () => {
            mockMapService.deleteMapById.mockResolvedValue(null);

            await controller.deleteMapById(mockResponse as Response, '1');

            expect(mockMapService.deleteMapById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.send).toHaveBeenCalledWith('Carte non trouvée');
        });

        it('should return 404 if deleteMapById throws an error', async () => {
            mockMapService.deleteMapById.mockRejectedValue(new Error('Database error'));

            await controller.deleteMapById(mockResponse as Response, '1');

            expect(mockMapService.deleteMapById).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.send).toHaveBeenCalledWith('Database error');
        });
    });
});
