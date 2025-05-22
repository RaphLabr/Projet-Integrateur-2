import { MapTile } from '@app/constants/map-tile';
import { MapGeneratorService } from '@app/services/draw-map/draw-map.service';
import { CharacterType } from '@common/character-type';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { Test, TestingModule } from '@nestjs/testing';
import { loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('canvas', () => ({
    createCanvas: jest.fn(() => ({
        getContext: jest.fn(() => ({ drawImage: jest.fn() })),
        toBuffer: jest.fn(() => Buffer.from('mocked-buffer')),
        createJPEGStream: jest.fn(() => ({ pipe: jest.fn() })),
    })),
    loadImage: jest.fn(async () => Promise.resolve({})),
}));

(fs.createWriteStream as jest.Mock).mockImplementation(() => {
    return {
        on: (event: string, callback: () => void) => {
            if (event === 'finish') {
                callback();
            }
            return { on: jest.fn() };
        },
        pipe: jest.fn(),
    };
});

describe('MapGeneratorService', () => {
    let service: MapGeneratorService;
    const terrain: MapTile[][] = [
        [
            { type: MapTileType.Base, item: ItemType.Barrel, character: CharacterType.NoCharacter },
            { type: MapTileType.Water, item: ItemType.Skull, character: CharacterType.NoCharacter },
        ],
    ];
    const sampleId = '1';
    const generatedBuffer = Buffer.from('generated image');

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MapGeneratorService],
        }).compile();

        jest.clearAllMocks();

        service = module.get<MapGeneratorService>(MapGeneratorService);

        Object.defineProperty(service, '_assetsPath', { value: '/mocked/assets/path' });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('updateMap', () => {
        it('should delete the existing file before generating the new image', async () => {
            const filename = `${sampleId}.jpeg`;
            const existingFilePath = path.join(service['_assetsPath'], 'generated-maps', filename);

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            const spyUnlink = jest.spyOn(fs, 'unlinkSync').mockImplementation();

            const spyGetImageMap = jest.spyOn(service, 'getImageMap').mockResolvedValue(generatedBuffer);

            await service.updateMap(terrain, sampleId);
            expect(fs.existsSync).toHaveBeenCalledWith(existingFilePath);
            expect(spyUnlink).toHaveBeenCalledWith(existingFilePath);
            expect(spyGetImageMap).toHaveBeenCalledWith(terrain, sampleId);
        });

        it('should call getImageMap even when file does not exist', async () => {
            const filename = `${sampleId}.jpeg`;
            const existingFilePath = path.join(service['_assetsPath'], 'generated-maps', filename);

            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const spyUnlink = jest.spyOn(fs, 'unlinkSync').mockImplementation();

            const spyGetImageMap = jest.spyOn(service, 'getImageMap').mockResolvedValue(generatedBuffer);

            await service.updateMap(terrain, sampleId);
            expect(fs.existsSync).toHaveBeenCalledWith(existingFilePath);
            expect(spyUnlink).not.toHaveBeenCalled();
            expect(spyGetImageMap).toHaveBeenCalledWith(terrain, sampleId);
        });
    });

    describe('getImageMap', () => {
        it('should read and return the buffer if the file exists', async () => {
            const filename = `${sampleId}.jpeg`;
            const outputPath = path.join(service['_assetsPath'], 'generated-maps', filename);

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(generatedBuffer);

            const spyGenerate = jest.spyOn(service, 'generateMapImage');

            const result = await service.getImageMap(terrain, sampleId);
            expect(fs.existsSync).toHaveBeenCalledWith(outputPath);
            expect(fs.readFileSync).toHaveBeenCalledWith(outputPath);
            expect(result).toEqual(generatedBuffer);
            expect(spyGenerate).not.toHaveBeenCalled();
        });

        it('should generate and return a new image if the file does not exist', async () => {
            const filename = `${sampleId}.jpeg`;
            const outputPath = path.join(service['_assetsPath'], 'generated-maps', filename);

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const spyGenerate = jest.spyOn(service, 'generateMapImage').mockResolvedValue(generatedBuffer);

            const result = await service.getImageMap(terrain, sampleId);
            expect(fs.existsSync).toHaveBeenCalledWith(outputPath);
            expect(spyGenerate).toHaveBeenCalledWith(terrain, sampleId);
            expect(result).toEqual(generatedBuffer);
        });
    });

    it('should generate a map image', async () => {
        const buffer = await service.generateMapImage(terrain, '1');
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.toString()).toBe('mocked-buffer');
    });

    it('should handle image loading errors', async () => {
        jest.spyOn(console, 'error').mockImplementation((message) => {
            throw new Error(message);
        });
        (loadImage as jest.Mock).mockRejectedValue(new Error('Image load error'));

        await expect(service.generateMapImage(terrain, '2')).rejects.toThrow('Image load error');
    });
});
